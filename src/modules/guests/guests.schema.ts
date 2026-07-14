// zod schemas for the guests surface. Query input arrives as strings (URL);
// bodies as JSON. Failures surface as ValidationError (400).

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import {
  PRIVACY_MODES,
  VIP_LEVELS,
  type GuestListQuery,
  type GuestUpdate,
  type MessageCursor,
  type MessageListQuery,
  type PreferenceInput,
  type PrivacyMode,
  type VipLevel,
} from './guests.types.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const pageField = z.coerce.number().int().min(1).catch(1).default(1);
const pageSizeField = z.coerce
  .number()
  .int()
  .min(1)
  .catch(DEFAULT_PAGE_SIZE)
  .transform((v) => Math.min(v, MAX_PAGE_SIZE))
  .default(DEFAULT_PAGE_SIZE);

export const ListGuestsQuerySchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  page: pageField,
  pageSize: pageSizeField,
});

export const GuestIdParamSchema = z.object({
  id: z.string().uuid('guest id must be a valid uuid'),
});

// PATCH — mutable profile fields only. `.strict()` rejects wa_phone / unknown keys.
export const UpdateGuestSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().max(255).nullable().optional(),
    privacy_mode: z.enum(PRIVACY_MODES as [PrivacyMode, ...PrivacyMode[]]).optional(),
    is_vip: z.boolean().optional(),
    vip_level: z
      .enum(VIP_LEVELS as [VipLevel, ...VipLevel[]])
      .nullable()
      .optional(),
  })
  .strict();

// POST /guests — name + wa_phone required; optional email.
export const CreateGuestBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    wa_phone: z
      .string()
      .trim()
      .regex(/^\+62\d{8,12}$/, 'wa_phone must start with +62 and be 10-15 digits'),
    email: z.string().trim().email().max(255).nullable().optional(),
  })
  .strict();

export type CreateGuestBody = z.infer<typeof CreateGuestBodySchema>;

export function parseCreateGuestBody(raw: unknown): CreateGuestBody {
  const result = CreateGuestBodySchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

export const PreferenceBodySchema = z
  .object({
    preference_type: z.string().trim().min(1).max(40),
    preference_value: z.string().trim().min(1),
  })
  .strict();

function toValidationError(error: z.ZodError): ValidationError {
  const first = error.issues[0];
  const field = first?.path.join('.') ?? undefined;
  return new ValidationError(first?.message ?? 'Invalid input', {
    field,
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

export function parseGuestListQuery(rawQuery: unknown): GuestListQuery {
  const result = ListGuestsQuerySchema.safeParse(rawQuery ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  const q = result.data;
  return {
    ...(q.q !== undefined ? { q: q.q } : {}),
    page: q.page,
    pageSize: q.pageSize,
  };
}

export function parseGuestId(rawParams: unknown): string {
  const result = GuestIdParamSchema.safeParse(rawParams);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data.id;
}

export function parseGuestUpdate(rawBody: unknown): GuestUpdate {
  const result = UpdateGuestSchema.safeParse(rawBody ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  const b = result.data;
  return {
    ...(b.name !== undefined ? { name: b.name } : {}),
    ...(b.email !== undefined ? { email: b.email } : {}),
    ...(b.privacy_mode !== undefined ? { privacyMode: b.privacy_mode } : {}),
    ...(b.is_vip !== undefined ? { isVip: b.is_vip } : {}),
    ...(b.vip_level !== undefined ? { vipLevel: b.vip_level } : {}),
  };
}

export function parsePreferenceInput(rawBody: unknown): PreferenceInput {
  const result = PreferenceBodySchema.safeParse(rawBody);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return {
    preferenceType: result.data.preference_type,
    preferenceValue: result.data.preference_value,
  };
}

// --- Guest messages history (cursor pagination) ---

const limitField = z.coerce
  .number()
  .int()
  .min(1)
  .catch(DEFAULT_LIMIT)
  .transform((v) => Math.min(v, MAX_LIMIT))
  .default(DEFAULT_LIMIT);

export const MessagesQuerySchema = z.object({
  limit: limitField,
  cursor: z.string().min(1).optional(),
});

const MessageCursorSchema = z.object({
  sentAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

export function encodeMessageCursor(cursor: MessageCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeMessageCursor(raw: string): MessageCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new ValidationError('Invalid cursor', { field: 'cursor' });
  }
  const result = MessageCursorSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError('Invalid cursor', { field: 'cursor' });
  }
  return result.data;
}

export function parseMessagesQuery(rawQuery: unknown): MessageListQuery {
  const result = MessagesQuerySchema.safeParse(rawQuery ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return {
    limit: result.data.limit,
    ...(result.data.cursor !== undefined
      ? { cursor: decodeMessageCursor(result.data.cursor) }
      : {}),
  };
}
