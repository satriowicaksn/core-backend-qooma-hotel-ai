import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import {
  REVIEW_OUTCOMES,
  type ManualSkipReason,
  type OtpMetricsQuery,
  type ReviewBody,
  type ReviewOutcome,
  type ReviewQueueQuery,
} from './otp.types.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toValidationError(error: z.ZodError): ValidationError {
  const first = error.issues[0];
  const field = first?.path.join('.') ?? undefined;
  return new ValidationError(first?.message ?? 'Invalid input', {
    field,
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

// --- shared params ---

const TicketIdParamSchema = z.object({
  id: z.string().uuid('ticket id must be a valid uuid'),
});

export function parseTicketIdParam(rawParams: unknown): string {
  const result = TicketIdParamSchema.safeParse(rawParams);
  if (!result.success) throw toValidationError(result.error);
  return result.data.id;
}

// --- review PATCH ---

const ReviewBodySchema = z
  .object({
    outcome: z.enum(REVIEW_OUTCOMES as [ReviewOutcome, ...ReviewOutcome[]]),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()
  .refine((v) => v.outcome !== 'other' || v.note !== undefined, {
    message: "note is required when outcome is 'other'",
    path: ['note'],
  });

export function parseReviewBody(rawBody: unknown): ReviewBody {
  const result = ReviewBodySchema.safeParse(rawBody);
  if (!result.success) throw toValidationError(result.error);
  return { outcome: result.data.outcome, note: result.data.note ?? null };
}

// --- review queue query (same base64url keyset cursor codec as tickets) ---

const CursorPayloadSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

export function encodeReviewCursor(cursor: { createdAt: string; id: string }): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeReviewCursor(raw: string): { createdAt: string; id: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new ValidationError('Invalid cursor', { field: 'cursor' });
  }
  const result = CursorPayloadSchema.safeParse(parsed);
  if (!result.success) throw new ValidationError('Invalid cursor', { field: 'cursor' });
  return result.data;
}

const ReviewQueueQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .catch(DEFAULT_LIMIT)
    .transform((v) => Math.min(v, MAX_LIMIT))
    .default(DEFAULT_LIMIT),
  cursor: z.string().min(1).optional(),
});

export function parseReviewQueueQuery(rawQuery: unknown): ReviewQueueQuery {
  const result = ReviewQueueQuerySchema.safeParse(rawQuery ?? {});
  if (!result.success) throw toValidationError(result.error);
  return {
    limit: result.data.limit,
    ...(result.data.cursor !== undefined ? { cursor: decodeReviewCursor(result.data.cursor) } : {}),
  };
}

// --- settings ---

const OtpSettingsBodySchema = z
  .object({
    otp_enabled: z.boolean(),
    otp_grace_minutes: z.number().int().min(1).max(60),
    otp_complaint_window: z.number().int().min(30).max(1440),
  })
  .strict();

export type OtpSettingsBody = z.infer<typeof OtpSettingsBodySchema>;

export function parseOtpSettingsBody(rawBody: unknown): OtpSettingsBody {
  const result = OtpSettingsBodySchema.safeParse(rawBody);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

// --- metrics query (?month=YYYY-MM&department_id=) ---

const MetricsQuerySchema = z
  .object({
    month: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM')
      .optional(),
    department_id: z.string().uuid().optional(),
  })
  .strict();

export function parseMetricsQuery(rawQuery: unknown, now: Date = new Date()): OtpMetricsQuery {
  const result = MetricsQuerySchema.safeParse(rawQuery ?? {});
  if (!result.success) throw toValidationError(result.error);
  const period =
    result.data.month ??
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  return {
    period,
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)),
    ...(result.data.department_id !== undefined ? { departmentId: result.data.department_id } : {}),
  };
}

// --- internal RPC bodies ---

const telegramMessageId = z
  .union([z.number().int().positive(), z.string().regex(/^\d+$/, 'must be a numeric id')])
  .transform((v) => BigInt(v));

const ResolveTelegramBodySchema = z
  .object({
    hotel_id: z.string().uuid(),
    telegram_message_id: telegramMessageId,
  })
  .strict();

export function parseResolveTelegramBody(rawBody: unknown): {
  hotelId: string;
  telegramMessageId: bigint;
} {
  const result = ResolveTelegramBodySchema.safeParse(rawBody);
  if (!result.success) throw toValidationError(result.error);
  return {
    hotelId: result.data.hotel_id,
    telegramMessageId: result.data.telegram_message_id,
  };
}

const TelegramMessageBodySchema = z.object({ telegram_message_id: telegramMessageId }).strict();

export function parseTelegramMessageBody(rawBody: unknown): { telegramMessageId: bigint } {
  const result = TelegramMessageBodySchema.safeParse(rawBody);
  if (!result.success) throw toValidationError(result.error);
  return { telegramMessageId: result.data.telegram_message_id };
}

const MarkDeliveredBodySchema = z
  .object({ actor_telegram_id: z.string().trim().min(1).max(64).optional() })
  .strict();

export function parseMarkDeliveredBody(rawBody: unknown): { actorTelegramId: string | null } {
  const result = MarkDeliveredBodySchema.safeParse(rawBody ?? {});
  if (!result.success) throw toValidationError(result.error);
  return { actorTelegramId: result.data.actor_telegram_id ?? null };
}

const VerifyBodySchema = z
  .object({
    code: z.string().regex(/^\d{2}$/, 'code must be exactly 2 digits'),
    actor_telegram_id: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export function parseVerifyBody(rawBody: unknown): {
  code: string;
  actorTelegramId: string | null;
} {
  const result = VerifyBodySchema.safeParse(rawBody);
  if (!result.success) throw toValidationError(result.error);
  return { code: result.data.code, actorTelegramId: result.data.actor_telegram_id ?? null };
}

const SkipBodySchema = z
  .object({
    reason: z.enum(['guest_declined', 'other']),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

export function parseSkipBody(rawBody: unknown): { reason: ManualSkipReason; note: string | null } {
  const result = SkipBodySchema.safeParse(rawBody);
  if (!result.success) throw toValidationError(result.error);
  return { reason: result.data.reason, note: result.data.note ?? null };
}
