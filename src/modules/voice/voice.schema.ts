// zod schemas — validate at the route boundary.
// Q-T29-#2 permissive `pbx_type` (spec §2.12 open-set). Partial-update
// contract respected — all fields optional; `.refine(non-empty)` rejects
// wholly-empty body.
//
// FE VoiceSettings (frontend src/types/api.ts) is FLAT: it carries the SIP
// detail fields at the top level. The Prisma VoiceConfig model only persists
// { pbxType, config (JSON), isActive }, so the flat SIP fields land inside
// `config`. The schema accepts BOTH the FE-flat fields and a raw `config`
// escape hatch; the service folds the flat fields into `config` for storage.

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

const pbxTypeField = z.string().min(1).max(40).nullable();

const configField = z.record(z.string(), z.unknown());

const sipCodecField = z.enum(['g711a', 'g711u', 'opus']);

export const UpsertVoiceBodySchema = z
  .object({
    pbx_type: pbxTypeField.optional(),
    pbx_host: z.string().max(255).optional(),
    sip_username: z.string().max(255).optional(),
    sip_password: z.string().max(255).optional(),
    sip_port: z.number().int().min(0).max(65535).optional(),
    sip_codec: sipCodecField.optional(),
    did_number: z.string().max(64).optional(),
    config: configField.optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'upsert body must include at least one field',
  });

export const VoiceTestBodySchema = z
  .object({
    pbx_host: z.string().max(255),
    sip_username: z.string().max(255),
    sip_password: z.string().max(255),
    sip_port: z.number().int().min(0).max(65535),
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

export type UpsertVoiceBody = z.infer<typeof UpsertVoiceBodySchema>;
export type VoiceTestBody = z.infer<typeof VoiceTestBodySchema>;

export function parseUpsertVoiceBody(raw: unknown): UpsertVoiceBody {
  const result = UpsertVoiceBodySchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}

export function parseVoiceTestBody(raw: unknown): VoiceTestBody {
  const result = VoiceTestBodySchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}
