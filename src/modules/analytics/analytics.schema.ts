// zod schemas — validate at the route boundary. Common query params
// `?from` / `?to` / `?period` per spec §1.4.

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import type { PeriodBucket, RangeQuery } from './analytics.types.js';

const DEFAULT_WINDOW_DAYS = 30;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
  .transform((v) => new Date(`${v}T00:00:00.000Z`))
  .refine((d) => !Number.isNaN(d.getTime()), { message: 'invalid date' });

const periodEnum = z.enum(['day', 'week', 'month', 'custom']);

export const RangeQuerySchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    period: periodEnum.optional(),
  })
  .strict()
  .refine((v) => v.period !== 'custom' || (v.from !== undefined && v.to !== undefined), {
    message: "period='custom' requires both from and to",
  })
  .refine((v) => v.from === undefined || v.to === undefined || v.from <= v.to, {
    message: 'from must be <= to',
  });

function toValidationError(error: z.ZodError): ValidationError {
  const first = error.issues[0];
  const field = first?.path.join('.') ?? undefined;
  return new ValidationError(first?.message ?? 'Invalid input', {
    field,
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

// Q-T30-#4 defaults: from=30d-ago, to=today, period=day.
export function parseRangeQuery(raw: unknown): RangeQuery {
  const result = RangeQuerySchema.safeParse(raw ?? {});
  if (!result.success) throw toValidationError(result.error);
  const q = result.data;
  const to = q.to ?? startOfDayUTC(new Date());
  const from = q.from ?? new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const period: PeriodBucket = q.period ?? 'day';
  return { from, to, period };
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
