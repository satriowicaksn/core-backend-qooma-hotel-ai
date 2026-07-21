// zod schemas — validate at the route boundary.
// ADD-25: a top-up buys a prepaid outbound-message package (S/M/L),
// tier-independent — buying it does NOT change the subscription tier.

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

// ADD-25 prepaid top-up package sizes (messages credited to the balance).
export const TOPUP_MESSAGES = { S: 3000, M: 7000, L: 14000 } as const;

export const OutboundTopupBodySchema = z
  .object({
    package: z.enum(['S', 'M', 'L']),
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

export type OutboundTopupBody = z.infer<typeof OutboundTopupBodySchema>;

export function parseOutboundTopupBody(raw: unknown): OutboundTopupBody {
  const result = OutboundTopupBodySchema.safeParse(raw);
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
