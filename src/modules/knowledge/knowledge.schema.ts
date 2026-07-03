// zod schemas — validate at the route boundary.
// Q-T24-#3: tags bounded per-element + max array length (Q-C-03 pattern).
// Q-T24-#4: category permissive VARCHAR(80) nullable.

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import type { KnowledgeListFilters } from './knowledge.types.js';

const titleField = z.string().min(1).max(255);
const contentField = z.string().min(1).max(10000);
const categoryField = z.string().min(1).max(80).nullable();
const tagsField = z.array(z.string().min(1).max(40)).max(20);

export const CreateEntryBodySchema = z
  .object({
    title: titleField,
    content: contentField,
    category: categoryField.optional(),
    tags: tagsField.optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export const UpdateEntryBodySchema = z
  .object({
    title: titleField.optional(),
    content: contentField.optional(),
    category: categoryField.optional(),
    tags: tagsField.optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'update body must include at least one field',
  });

export const EntryIdParamSchema = z.object({
  id: z.string().uuid('knowledge entry id must be a valid uuid'),
});

const boolFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

export const ListEntriesQuerySchema = z
  .object({
    is_active: boolFlag.optional(),
    category: z.string().min(1).max(80).optional(),
    tag: z.string().min(1).max(40).optional(),
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

export type CreateEntryBody = z.infer<typeof CreateEntryBodySchema>;
export type UpdateEntryBody = z.infer<typeof UpdateEntryBodySchema>;

export function parseCreateEntryBody(raw: unknown): CreateEntryBody {
  const result = CreateEntryBodySchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

export function parseUpdateEntryBody(raw: unknown): UpdateEntryBody {
  const result = UpdateEntryBodySchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

export function parseEntryId(raw: unknown): string {
  const result = EntryIdParamSchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data.id;
}

export function parseListEntriesQuery(raw: unknown): KnowledgeListFilters {
  const result = ListEntriesQuerySchema.safeParse(raw ?? {});
  if (!result.success) throw toValidationError(result.error);
  const q = result.data;
  return {
    ...(q.is_active !== undefined ? { isActive: q.is_active } : {}),
    ...(q.category !== undefined ? { category: q.category } : {}),
    ...(q.tag !== undefined ? { tag: q.tag } : {}),
  };
}
