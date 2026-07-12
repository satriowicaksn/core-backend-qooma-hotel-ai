// zod schemas — validate at the route boundary.
// Q-T22-#4 available_window: both-or-neither + from < to; no wrap-around.
// Q-T22-#5 image_url: pre-signed URL string permissive.
// PM ACK tightening #1: price_idr max = 9999999999.99 (DECIMAL(12,2)).

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import type { MenuListFilters } from './menu.types.js';

// Spec §2.6 field constraints.
const categoryNameField = z.string().min(1).max(80);
const itemNameField = z.string().min(1).max(120);
const descriptionField = z.string().nullable();
const priceIdrField = z.number().nonnegative().max(9999999999.99); // DECIMAL(12,2)
const prepMinutesField = z.number().int().nonnegative().nullable();
const imageUrlField = z.string().url().max(500).nullable();
const sortOrderField = z.number().int().nonnegative();
const hhmmField = z.string().regex(/^\d{2}:\d{2}$/, 'must be HH:mm 24-hour');

// Q-T22-#4: parse HH:mm to minutes-since-midnight for comparison + storage.
export function parseHHmmToMinutes(v: string): number {
  const [hStr, mStr] = v.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  return h * 60 + m;
}

// Category schemas.
export const CreateCategoryBodySchema = z
  .object({
    name: categoryNameField,
    sort_order: sortOrderField.optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

export const UpdateCategoryBodySchema = z
  .object({
    name: categoryNameField.optional(),
    sort_order: sortOrderField.optional(),
    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'update body must include at least one field',
  });

// Item schemas. available_window_from/to cross-field refined at the object
// level after fields defined.
const itemBaseShape = {
  category_id: z.string().uuid(),
  name: itemNameField,
  description: descriptionField.optional(),
  price_idr: priceIdrField,
  image_url: imageUrlField.optional(),
  prep_minutes: prepMinutesField.optional(),
  is_available: z.boolean().optional(),
  available_window_from: hhmmField.nullable().optional(),
  available_window_to: hhmmField.nullable().optional(),
};

function refineAvailableWindow<T extends z.ZodType>(schema: T): T {
  return schema
    .refine(
      (v: unknown) => {
        const obj = v as Record<string, unknown>;
        const from = obj.available_window_from;
        const to = obj.available_window_to;
        return (from === undefined) === (to === undefined);
      },
      { message: 'available_window_from and available_window_to must be provided together' },
    )
    .refine(
      (v: unknown) => {
        const obj = v as Record<string, unknown>;
        const from = obj.available_window_from;
        const to = obj.available_window_to;
        if (typeof from !== 'string' || typeof to !== 'string') return true;
        return parseHHmmToMinutes(from) < parseHHmmToMinutes(to);
      },
      { message: 'available_window_from must be strictly less than available_window_to' },
    ) as unknown as T;
}

export const CreateItemBodySchema = refineAvailableWindow(z.object(itemBaseShape).strict());

export const UpdateItemBodySchema = refineAvailableWindow(
  z
    .object({
      category_id: z.string().uuid().optional(),
      name: itemNameField.optional(),
      description: descriptionField.optional(),
      price_idr: priceIdrField.optional(),
      image_url: imageUrlField.optional(),
      prep_minutes: prepMinutesField.optional(),
      is_available: z.boolean().optional(),
      available_window_from: hhmmField.nullable().optional(),
      available_window_to: hhmmField.nullable().optional(),
    })
    .strict()
    .refine((v) => Object.keys(v).length > 0, {
      message: 'update body must include at least one field',
    }),
);

// T23-slice-1: bulk-availability body. Q-T23-#3 ids 1-100; reuses
// refineAvailableWindow for the both-or-neither + strictly-less-than window
// rule; Q-T23-#5 refines at least one delta field.
// FE canonical: field is `ids` (src/types/api.ts BulkAvailabilityPayload).
export const BulkAvailabilityBodySchema = refineAvailableWindow(
  z
    .object({
      ids: z.array(z.string().uuid()).min(1).max(100),
      is_available: z.boolean().optional(),
      available_window_from: hhmmField.nullable().optional(),
      available_window_to: hhmmField.nullable().optional(),
    })
    .strict()
    .refine(
      (v) =>
        v.is_available !== undefined ||
        v.available_window_from !== undefined ||
        v.available_window_to !== undefined,
      {
        message:
          'at least one of is_available / available_window_from / available_window_to must be provided',
      },
    ),
);

export const CategoryIdParamSchema = z.object({
  id: z.string().uuid('category id must be a valid uuid'),
});

export const ItemIdParamSchema = z.object({
  id: z.string().uuid('item id must be a valid uuid'),
});

const boolFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

export const ListMenuQuerySchema = z
  .object({
    is_active: boolFlag.optional(),
  })
  .strict();

// --- Multipart (FormData) coercion ------------------------------------------
// FE sends menu create/update as multipart/form-data with all values as
// strings (price_idr/prep_minutes numeric-as-string, is_available 'true'/
// 'false', window fields as HH:mm or '' when absent). image_url is NOT sent —
// the service derives it from the uploaded file. We coerce the raw string
// record into the same domain shape the JSON path produces, then reuse the
// window refine.

// Empty string from FormData means "field not provided" — drop it so optional
// fields stay undefined and the both-or-neither window refine holds.
function emptyToUndefined(v: unknown): unknown {
  return v === '' ? undefined : v;
}

// The `.optional()` sits INSIDE each preprocess so that an empty-string cell
// (mapped to undefined) is accepted rather than hitting the base validator with
// `undefined` (which would report "Required").
const multipartPrice = z.preprocess(emptyToUndefined, priceIdrField.optional());
const multipartPrepMinutes = z.preprocess(
  emptyToUndefined,
  z.coerce.number().int().nonnegative().optional(),
);
const multipartWindow = z.preprocess(emptyToUndefined, hhmmField.optional());

// z.coerce.boolean() makes 'false' truthy — coerce 'true'/'false' explicitly.
function coerceBoolString(v: unknown): unknown {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}
const multipartBoolCell = z.preprocess(
  (v) => coerceBoolString(emptyToUndefined(v)),
  z.boolean().optional(),
);

const multipartItemShape = {
  category_id: z.string().uuid(),
  name: itemNameField,
  description: descriptionField.optional(),
  price_idr: z.coerce.number().nonnegative().max(9999999999.99),
  prep_minutes: multipartPrepMinutes,
  is_available: multipartBoolCell,
  available_window_from: multipartWindow,
  available_window_to: multipartWindow,
};

export const CreateItemMultipartSchema = refineAvailableWindow(
  z.object(multipartItemShape).strict(),
);

export const UpdateItemMultipartSchema = refineAvailableWindow(
  z
    .object({
      category_id: z.string().uuid().optional(),
      name: itemNameField.optional(),
      description: descriptionField.optional(),
      price_idr: multipartPrice,
      prep_minutes: multipartPrepMinutes,
      is_available: multipartBoolCell,
      available_window_from: multipartWindow,
      available_window_to: multipartWindow,
    })
    .strict()
    .refine((v) => Object.keys(v).length > 0, {
      message: 'update body must include at least one field',
    }),
);

// FormData parts arrive with only the keys the client sent — strip undefined
// values so `.strict()` sees a clean object and optional fields stay absent.
function compactFields(fields: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function parseCreateItemMultipart(
  fields: Record<string, string | undefined>,
): CreateItemBody {
  const result = CreateItemMultipartSchema.safeParse(compactFields(fields));
  if (!result.success) throw toValidationError(result.error);
  return result.data as CreateItemBody;
}

export function parseUpdateItemMultipart(
  fields: Record<string, string | undefined>,
): UpdateItemBody {
  const result = UpdateItemMultipartSchema.safeParse(compactFields(fields));
  if (!result.success) throw toValidationError(result.error);
  return result.data as UpdateItemBody;
}

// --- CSV import row ----------------------------------------------------------
// Columns: name, description, price_idr, category_id, prep_minutes,
// is_available. Numeric + boolean cells coerced from their string form; empty
// description => null; empty prep_minutes => null.
export const MenuCsvRowSchema = z.object({
  name: itemNameField,
  description: z.preprocess((v) => (v === '' ? null : v), descriptionField),
  // Empty price cell => undefined => "Required" (never silently 0).
  price_idr: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.coerce.number().nonnegative().max(9999999999.99),
  ),
  category_id: z.string().uuid(),
  // Empty prep cell => null (always-optional prep); otherwise coerce the string.
  prep_minutes: z.preprocess(
    (v) => (v === '' ? null : v),
    z.coerce.number().int().nonnegative().nullable(),
  ),
  is_available: z.preprocess((v) => v === 'true', z.boolean()),
});

export type MenuCsvRow = z.infer<typeof MenuCsvRowSchema>;

// parseCsvWithSchema expects ZodType<T> (input === output). Our row schema uses
// z.coerce/z.preprocess, so its INPUT type is `unknown` (ZodEffects) — not
// assignable to ZodType<MenuCsvRow>. The parser only ever feeds it a string
// record, so exposing an output-typed handle is safe at runtime.
export const MenuCsvRowValidator: z.ZodType<MenuCsvRow> =
  MenuCsvRowSchema as unknown as z.ZodType<MenuCsvRow>;

export const MENU_CSV_COLUMNS = [
  'name',
  'description',
  'price_idr',
  'category_id',
  'prep_minutes',
  'is_available',
] as const;

export function parseMenuCsvRow(raw: unknown): MenuCsvRow {
  const result = MenuCsvRowSchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

function toValidationError(error: z.ZodError): ValidationError {
  const first = error.issues[0];
  const field = first?.path.join('.') ?? undefined;
  return new ValidationError(first?.message ?? 'Invalid input', {
    field,
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

export type CreateCategoryBody = z.infer<typeof CreateCategoryBodySchema>;
export type UpdateCategoryBody = z.infer<typeof UpdateCategoryBodySchema>;
export type CreateItemBody = z.infer<typeof CreateItemBodySchema>;
export type UpdateItemBody = z.infer<typeof UpdateItemBodySchema>;
export type BulkAvailabilityBody = z.infer<typeof BulkAvailabilityBodySchema>;

export function parseCreateCategoryBody(raw: unknown): CreateCategoryBody {
  const result = CreateCategoryBodySchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

export function parseUpdateCategoryBody(raw: unknown): UpdateCategoryBody {
  const result = UpdateCategoryBodySchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

export function parseCreateItemBody(raw: unknown): CreateItemBody {
  const result = CreateItemBodySchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

export function parseUpdateItemBody(raw: unknown): UpdateItemBody {
  const result = UpdateItemBodySchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

export function parseCategoryId(raw: unknown): string {
  const result = CategoryIdParamSchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data.id;
}

export function parseItemId(raw: unknown): string {
  const result = ItemIdParamSchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data.id;
}

export function parseBulkAvailabilityBody(raw: unknown): BulkAvailabilityBody {
  const result = BulkAvailabilityBodySchema.safeParse(raw);
  if (!result.success) throw toValidationError(result.error);
  return result.data;
}

export function parseListMenuQuery(raw: unknown): MenuListFilters {
  const result = ListMenuQuerySchema.safeParse(raw ?? {});
  if (!result.success) throw toValidationError(result.error);
  const q = result.data;
  return { ...(q.is_active !== undefined ? { isActive: q.is_active } : {}) };
}
