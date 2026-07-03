// zod schemas — validate at the route boundary.
// Q-T26-#5: partial-update contract (is_enabled + config both optional,
// .refine(non-empty)). Q-T26-#6: ?force=true parsed but slice-1 no-op
// (super_admin gate at route; JSDoc reserves for slice-2).

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import { KNOWN_FLAGS_SET } from './feature-flags.constants.js';

const configField = z.record(z.string(), z.unknown());

export const UpdateFlagBodySchema = z
  .object({
    is_enabled: z.boolean().optional(),
    config: configField.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'update body must include at least one field',
  });

// Flag path param — validates against KNOWN_FLAGS_SET. Slice-2 extends the
// set once PO publishes the 19-name list (Q-T26-#7 escalation).
export const FlagParamSchema = z.object({
  flag: z.string().refine((v) => KNOWN_FLAGS_SET.has(v), {
    message: 'unknown feature flag',
  }),
});

const boolFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

export const PatchQuerySchema = z
  .object({
    force: boolFlag.optional(),
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

export type UpdateFlagBody = z.infer<typeof UpdateFlagBodySchema>;
export type PatchQuery = z.infer<typeof PatchQuerySchema>;

export function parseUpdateFlagBody(raw: unknown): UpdateFlagBody {
  const result = UpdateFlagBodySchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

export function parseFlagParam(raw: unknown): string {
  const result = FlagParamSchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data.flag;
}

export function parsePatchQuery(raw: unknown): PatchQuery {
  const result = PatchQuerySchema.safeParse(raw ?? {});
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}
