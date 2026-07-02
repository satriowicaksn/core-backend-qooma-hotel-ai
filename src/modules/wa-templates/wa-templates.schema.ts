// zod schemas — validate at the route boundary. Snake_case wire in, camelCase
// domain out. Per PM C ACK: variables bounded string[] (tightening #1),
// language bounded string (tightening #2).

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import type { WaTemplateListFilters, WaTemplateStatus } from './wa-templates.types.js';

// Migration `wa_templates.name VARCHAR(80)` + spec §2.8:606 permissive
// (Q-T25-#2 lean confirmed — hotel-specific extensions allowed alongside the
// 8 ADD-08.2 canonical names).
const nameField = z.string().min(1).max(80);

// Migration `wa_templates.body TEXT NOT NULL`.
const bodyField = z.string().min(1);

// Tightening #1: variables is a bounded array of variable name strings, not
// arbitrary JSON. Spec §2.8:606 + §1.9:284 both confirm "array of variable
// names".
const variablesField = z.array(z.string().min(1).max(64)).max(50);

// Tightening #2: `language` VARCHAR(8) DEFAULT 'id'. Accept 2-8 char code
// (covers ISO 639-1/639-2 + Meta's `id_ID` style locales).
const languageField = z.string().min(2).max(8);

const statusField = z.enum(['pending', 'approved', 'rejected', 'archived']);

export const CreateWaTemplateBodySchema = z
  .object({
    name: nameField,
    body: bodyField,
    variables: variablesField.optional(),
    language: languageField.optional(),
  })
  .strict();

export const UpdateWaTemplateBodySchema = z
  .object({
    name: nameField.optional(),
    body: bodyField.optional(),
    variables: variablesField.optional(),
    language: languageField.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'update body must include at least one field',
  });

export const WaTemplateIdParamSchema = z.object({
  id: z.string().uuid('wa-template id must be a valid uuid'),
});

export const ListWaTemplatesQuerySchema = z
  .object({
    status: statusField.optional(),
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

export type CreateWaTemplateBody = z.infer<typeof CreateWaTemplateBodySchema>;
export type UpdateWaTemplateBody = z.infer<typeof UpdateWaTemplateBodySchema>;

export function parseCreateWaTemplateBody(raw: unknown): CreateWaTemplateBody {
  const result = CreateWaTemplateBodySchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}

export function parseUpdateWaTemplateBody(raw: unknown): UpdateWaTemplateBody {
  const result = UpdateWaTemplateBodySchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}

export function parseWaTemplateId(raw: unknown): string {
  const result = WaTemplateIdParamSchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data.id;
}

export function parseListWaTemplatesQuery(raw: unknown): WaTemplateListFilters {
  const result = ListWaTemplatesQuerySchema.safeParse(raw ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  const q = result.data;
  return { ...(q.status !== undefined ? { status: q.status as WaTemplateStatus } : {}) };
}
