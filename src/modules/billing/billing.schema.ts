// zod schemas — validate at the route boundary.
// Q-T27-#2: upgrade target_tier enum enforces no 'lite' downgrade in MVP.

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

export const UpgradePackageBodySchema = z
  .object({
    target_tier: z.enum(['professional', 'luxury', 'enterprise']),
  })
  .strict();

export const InvoiceIdParamSchema = z.object({
  id: z.string().uuid('invoice id must be a valid uuid'),
});

function toValidationError(error: z.ZodError): ValidationError {
  const first = error.issues[0];
  const field = first?.path.join('.') ?? undefined;
  return new ValidationError(first?.message ?? 'Invalid input', {
    field,
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

export type UpgradePackageBody = z.infer<typeof UpgradePackageBodySchema>;

export function parseUpgradePackageBody(raw: unknown): UpgradePackageBody {
  const result = UpgradePackageBodySchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}

export function parseInvoiceId(raw: unknown): string {
  const result = InvoiceIdParamSchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data.id;
}
