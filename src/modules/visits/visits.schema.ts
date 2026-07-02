import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import {
  VISIT_STATUSES,
  type VerifyManualInput,
  type VisitListQuery,
  type VisitStatus,
} from './visits.types.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MIN = 1;

const statusValues = new Set<string>(VISIT_STATUSES);

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

const csvStatus = z
  .string()
  .transform(parseCsv)
  .refine((arr) => arr.length > 0 && arr.every((v) => statusValues.has(v)), {
    message: `status must be a comma-separated list of: ${VISIT_STATUSES.join(', ')}`,
  })
  .transform((arr) => arr as VisitStatus[]);

const pageField = z.coerce.number().int().min(MIN).catch(1).default(1);

const pageSizeField = z.coerce
  .number()
  .int()
  .min(MIN)
  .catch(DEFAULT_PAGE_SIZE)
  .transform((v) => Math.min(v, MAX_PAGE_SIZE))
  .default(DEFAULT_PAGE_SIZE);

export const ListVisitsQuerySchema = z.object({
  status: csvStatus.optional(),
  page: pageField,
  pageSize: pageSizeField,
});

export const VisitIdParamSchema = z.object({
  id: z.string().uuid('visit id must be a valid uuid'),
});

const MIN_NIGHTS = 1;
const MAX_NIGHTS = 7;

// Dual-mode verify-manual body. reject = { action: 'reject' }; approve = the
// { guest_name, room_number, nights } trio. Discriminated on `action` so a
// malformed approve body reports the missing field, not a vague union error.
const RejectSchema = z.object({ action: z.literal('reject') });
const ApproveSchema = z.object({
  guest_name: z.string().trim().min(1).max(120),
  room_number: z.string().trim().min(1).max(16),
  nights: z.number().int().min(MIN_NIGHTS).max(MAX_NIGHTS),
});

function toValidationError(error: z.ZodError): ValidationError {
  const first = error.issues[0];
  const field = first?.path.join('.') ?? undefined;
  return new ValidationError(first?.message ?? 'Invalid query parameters', {
    field,
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

export function parseListQuery(rawQuery: unknown): VisitListQuery {
  const result = ListVisitsQuerySchema.safeParse(rawQuery ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  const q = result.data;
  const filters: VisitListQuery['filters'] = {
    ...(q.status !== undefined ? { status: q.status } : {}),
  };
  return { filters, page: q.page, pageSize: q.pageSize };
}

export function parseVisitId(rawParams: unknown): string {
  const result = VisitIdParamSchema.safeParse(rawParams);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data.id;
}

function isRejectBody(body: unknown): boolean {
  return typeof body === 'object' && body !== null && 'action' in body;
}

export function parseVerifyManual(rawBody: unknown): VerifyManualInput {
  if (isRejectBody(rawBody)) {
    const result = RejectSchema.safeParse(rawBody);
    if (!result.success) {
      throw toValidationError(result.error);
    }
    return { mode: 'reject' };
  }
  const result = ApproveSchema.safeParse(rawBody ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return {
    mode: 'approve',
    guestName: result.data.guest_name,
    roomNumber: result.data.room_number,
    nights: result.data.nights,
  };
}
