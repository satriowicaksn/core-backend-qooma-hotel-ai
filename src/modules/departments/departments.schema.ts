// zod schemas — validate at the route boundary. Snake_case wire in, camelCase
// domain out. Per PM C ACK: Q-C-01 permissive operating_hours; Q-C-03 permissive
// skip_to_l3_categories with bounds.

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import type { DepartmentListFilters } from './departments.types.js';

// Spec §2.1: code CHECK '^[A-Z]{2,8}$' — mirror at API boundary for 400 not 500.
const codeField = z.string().regex(/^[A-Z]{2,8}$/, 'code must be 2–8 uppercase letters');

// Spec §2.1: name VARCHAR(80).
const nameField = z.string().min(1).max(80);

// Q-C-01: permissive — parses `{}` and forwards any JSON forward-compat.
const OperatingHoursSchema = z.object({}).catchall(z.unknown());

// Q-C-03: permissive string[] with bounds; spec §1.5 is illustrative, not exhaustive.
const skipToL3CategoriesField = z.array(z.string().min(1).max(32)).max(20);

// Escalation chain — l1_sla_minutes required (spec §1.5:194, default 5);
// l2/l3 user_id UUID format only (cross-DB per Opsi C, no existence check).
const EscalationChainSchema = z
  .object({
    l1_sla_minutes: z.number().int().positive(),
    l2_user_id: z.string().uuid().optional(),
    l2_sla_minutes: z.number().int().positive().optional(),
    l3_user_id: z.string().uuid().optional(),
    skip_to_l3_categories: skipToL3CategoriesField.optional(),
  })
  .strict();

const telegramField = z.string().min(1).max(64).nullable();

export const CreateDepartmentBodySchema = z
  .object({
    name: nameField,
    code: codeField,
    operating_hours: OperatingHoursSchema.optional(),
    escalation_chain: EscalationChainSchema.optional(),
    telegram_chat_id: telegramField.optional(),
    supervisor_telegram_id: telegramField.optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export const UpdateDepartmentBodySchema = z
  .object({
    name: nameField.optional(),
    code: codeField.optional(),
    operating_hours: OperatingHoursSchema.optional(),
    escalation_chain: EscalationChainSchema.optional(),
    telegram_chat_id: telegramField.optional(),
    supervisor_telegram_id: telegramField.optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'update body must include at least one field',
  });

export const DepartmentIdParamSchema = z.object({
  id: z.string().uuid('department id must be a valid uuid'),
});

const boolFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

export const ListDepartmentsQuerySchema = z
  .object({
    is_active: boolFlag.optional(),
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

export type CreateDepartmentBody = z.infer<typeof CreateDepartmentBodySchema>;
export type UpdateDepartmentBody = z.infer<typeof UpdateDepartmentBodySchema>;

export function parseCreateDepartmentBody(raw: unknown): CreateDepartmentBody {
  const result = CreateDepartmentBodySchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}

export function parseUpdateDepartmentBody(raw: unknown): UpdateDepartmentBody {
  const result = UpdateDepartmentBodySchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}

export function parseDepartmentId(raw: unknown): string {
  const result = DepartmentIdParamSchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data.id;
}

export function parseListDepartmentsQuery(raw: unknown): DepartmentListFilters {
  const result = ListDepartmentsQuerySchema.safeParse(raw ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  const q = result.data;
  return { ...(q.is_active !== undefined ? { isActive: q.is_active } : {}) };
}
