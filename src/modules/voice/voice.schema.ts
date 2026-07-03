// zod schemas — validate at the route boundary.
// Q-T29-#2 permissive `pbx_type` (spec §2.12 open-set). Partial-update
// contract respected — all fields optional; `.refine(non-empty)` rejects
// wholly-empty body.

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

const pbxTypeField = z.string().min(1).max(40).nullable();

const configField = z.record(z.string(), z.unknown());

export const UpsertVoiceBodySchema = z
  .object({
    pbx_type: pbxTypeField.optional(),
    config: configField.optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'upsert body must include at least one field',
  });

function toValidationError(error: z.ZodError): ValidationError {
  const first = error.issues[0];
  const field = first?.path.join('.') ?? undefined;
  return new ValidationError(first?.message ?? 'Invalid input', {
    field,
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

export type UpsertVoiceBody = z.infer<typeof UpsertVoiceBodySchema>;

export function parseUpsertVoiceBody(raw: unknown): UpsertVoiceBody {
  const result = UpsertVoiceBodySchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}
