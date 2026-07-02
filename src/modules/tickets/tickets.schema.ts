import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import {
  COMPLAINT_TYPES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type ComplaintType,
  type DepartmentUpdate,
  type StatusUpdate,
  type TicketCursor,
  type TicketListQuery,
  type TicketPriority,
  type TicketStatus,
} from './tickets.types.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

const statusValues = new Set<string>(TICKET_STATUSES);
const priorityValues = new Set<string>(TICKET_PRIORITIES);
const complaintValues = new Set<string>(COMPLAINT_TYPES);

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
    message: `status must be a comma-separated list of: ${TICKET_STATUSES.join(', ')}`,
  })
  .transform((arr) => arr as TicketStatus[]);

const csvComplaint = z
  .string()
  .transform(parseCsv)
  .refine((arr) => arr.length > 0 && arr.every((v) => complaintValues.has(v)), {
    message: `complaint_type must be a comma-separated list of: ${COMPLAINT_TYPES.join(', ')}`,
  })
  .transform((arr) => arr as ComplaintType[]);

const boolFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

const isoDate = z
  .string()
  .datetime({ offset: true })
  .transform((v) => new Date(v));

const limitField = z.coerce
  .number()
  .int()
  .min(MIN_LIMIT)
  .catch(DEFAULT_LIMIT)
  .transform((v) => Math.min(v, MAX_LIMIT))
  .default(DEFAULT_LIMIT);

export const ListTicketsQuerySchema = z.object({
  status: csvStatus.optional(),
  department_id: z.string().uuid().optional(),
  priority: z
    .string()
    .refine((v) => priorityValues.has(v), {
      message: `priority must be one of: ${TICKET_PRIORITIES.join(', ')}`,
    })
    .transform((v) => v as TicketPriority)
    .optional(),
  complaint_type: csvComplaint.optional(),
  date_from: isoDate.optional(),
  date_to: isoDate.optional(),
  q: z.string().trim().min(1).max(200).optional(),
  is_high_alert: boolFlag.optional(),
  is_overdue: boolFlag.optional(),
  guest_id: z.string().uuid().optional(),
  limit: limitField,
  cursor: z.string().min(1).optional(),
});

export const OverdueQuerySchema = z.object({
  limit: limitField,
});

export const TicketIdParamSchema = z.object({
  id: z.string().uuid('ticket id must be a valid uuid'),
});

const CursorPayloadSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

export function encodeCursor(cursor: TicketCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): TicketCursor {
  let parsed: unknown;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    parsed = JSON.parse(json);
  } catch {
    throw new ValidationError('Invalid cursor', { field: 'cursor' });
  }
  const result = CursorPayloadSchema.safeParse(parsed);
  if (!result.success) {
    throw new ValidationError('Invalid cursor', { field: 'cursor' });
  }
  return result.data;
}

function toValidationError(error: z.ZodError): ValidationError {
  const first = error.issues[0];
  const field = first?.path.join('.') ?? undefined;
  return new ValidationError(first?.message ?? 'Invalid query parameters', {
    field,
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

export function parseListQuery(rawQuery: unknown): TicketListQuery {
  const result = ListTicketsQuerySchema.safeParse(rawQuery ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  const q = result.data;
  const filters: TicketListQuery['filters'] = {
    ...(q.status !== undefined ? { status: q.status } : {}),
    ...(q.department_id !== undefined ? { departmentId: q.department_id } : {}),
    ...(q.priority !== undefined ? { priority: q.priority } : {}),
    ...(q.complaint_type !== undefined ? { complaintType: q.complaint_type } : {}),
    ...(q.date_from !== undefined ? { dateFrom: q.date_from } : {}),
    ...(q.date_to !== undefined ? { dateTo: q.date_to } : {}),
    ...(q.q !== undefined ? { q: q.q } : {}),
    ...(q.is_high_alert !== undefined ? { isHighAlert: q.is_high_alert } : {}),
    ...(q.is_overdue !== undefined ? { isOverdue: q.is_overdue } : {}),
    ...(q.guest_id !== undefined ? { guestId: q.guest_id } : {}),
  };
  return {
    filters,
    limit: q.limit,
    ...(q.cursor !== undefined ? { cursor: decodeCursor(q.cursor) } : {}),
  };
}

export function parseTicketId(rawParams: unknown): string {
  const result = TicketIdParamSchema.safeParse(rawParams);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data.id;
}

export function parseOverdueQuery(rawQuery: unknown): { limit: number } {
  const result = OverdueQuerySchema.safeParse(rawQuery ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return { limit: result.data.limit };
}

// --- T12 mutation bodies (.strict() → unknown keys rejected) ---

export const StatusUpdateSchema = z
  .object({
    status: z.enum(TICKET_STATUSES as [TicketStatus, ...TicketStatus[]]),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

export const DepartmentUpdateSchema = z
  .object({
    department_id: z.string().uuid('department_id must be a valid uuid'),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .strict();

export function parseStatusUpdate(rawBody: unknown): StatusUpdate {
  const result = StatusUpdateSchema.safeParse(rawBody);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return { status: result.data.status, note: result.data.note ?? null };
}

export function parseDepartmentUpdate(rawBody: unknown): DepartmentUpdate {
  const result = DepartmentUpdateSchema.safeParse(rawBody);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return { departmentId: result.data.department_id, note: result.data.note ?? null };
}
