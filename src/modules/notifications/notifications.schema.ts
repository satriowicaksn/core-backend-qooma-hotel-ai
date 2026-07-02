// zod schemas + module-local cursor codec (T-CLEAN-02 consolidates later).

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import type { NotificationCursor, NotificationListQuery } from './notifications.types.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const limitField = z.coerce
  .number()
  .int()
  .min(1)
  .catch(DEFAULT_LIMIT)
  .transform((v) => Math.min(v, MAX_LIMIT))
  .default(DEFAULT_LIMIT);

const boolFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

export const ListNotificationsQuerySchema = z.object({
  is_read: boolFlag.optional(),
  limit: limitField,
  cursor: z.string().min(1).optional(),
});

export const NotificationIdParamSchema = z.object({
  id: z.string().uuid('notification id must be a valid uuid'),
});

const CursorSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

export function encodeCursor(cursor: NotificationCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): NotificationCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new ValidationError('Invalid cursor', { field: 'cursor' });
  }
  const result = CursorSchema.safeParse(parsed);
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

export function parseNotificationsQuery(rawQuery: unknown): NotificationListQuery {
  const result = ListNotificationsQuerySchema.safeParse(rawQuery ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  const q = result.data;
  return {
    filters: { ...(q.is_read !== undefined ? { isRead: q.is_read } : {}) },
    limit: q.limit,
    ...(q.cursor !== undefined ? { cursor: decodeCursor(q.cursor) } : {}),
  };
}

export function parseNotificationId(rawParams: unknown): string {
  const result = NotificationIdParamSchema.safeParse(rawParams);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data.id;
}
