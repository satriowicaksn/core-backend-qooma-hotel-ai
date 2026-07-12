// zod schemas — validate at the route boundary.
// Q-T24-#3: tags bounded per-element + max array length (Q-C-03 pattern).
// Q-T24-#4: category permissive VARCHAR(80) nullable.

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import type { KnowledgeListFilters } from './knowledge.types.js';

// FE (settings.content.api.ts) is the canonical contract and sends
// { category, question, answer, keywords }. We accept the FE field names at the
// boundary; the service maps question→title, answer→content, keywords→tags onto
// the DB columns.
const questionField = z.string().min(1).max(255);
const answerField = z.string().min(1).max(10000);
const categoryField = z.string().min(1).max(80).nullable();
const keywordsField = z.array(z.string().min(1).max(40)).max(20);

export const CreateEntryBodySchema = z
  .object({
    question: questionField,
    answer: answerField,
    category: categoryField.optional(),
    keywords: keywordsField.optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export const UpdateEntryBodySchema = z
  .object({
    question: questionField.optional(),
    answer: answerField.optional(),
    category: categoryField.optional(),
    keywords: keywordsField.optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'update body must include at least one field',
  });

// CSV import row. FE column order (settings.content.api.ts import): question,
// answer, category, keywords. `keywords` is a comma-separated cell → split +
// trim + drop empties; bounded like keywordsField above.
export const ImportRowSchema = z.object({
  question: questionField,
  answer: answerField,
  category: z
    .string()
    .trim()
    .max(80)
    .transform((v) => (v.length > 0 ? v : null)),
  keywords: z
    .string()
    .transform((v) =>
      v
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0),
    )
    .pipe(keywordsField),
});

export const IMPORT_COLUMNS = ['question', 'answer', 'category', 'keywords'] as const;

export type ImportRow = z.infer<typeof ImportRowSchema>;

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
