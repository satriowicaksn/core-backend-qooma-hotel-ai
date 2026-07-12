// Service: Menu categories + items CRUD with cross-tenant + delete-conflict
// guards. RBAC gate lives at the route layer (requireRole([gm_admin])).

import { randomUUID } from 'node:crypto';

import type { Prisma } from '@prisma/client';

import { ConflictError, NotFoundError } from '@core/errors/app-errors.js';
import type { ObjectStoragePort } from '@core/storage/object-storage.port.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';
import { parseCsvWithSchema } from '@shared/utils/csv-parser.js';

import type { MenuRepository } from './menu.repository.js';
import {
  MENU_CSV_COLUMNS,
  MenuCsvRowValidator,
  parseCreateItemMultipart,
  parseUpdateItemMultipart,
  type BulkAvailabilityBody,
  type CreateCategoryBody,
  type CreateItemBody,
  type MenuCsvRow,
  type UpdateCategoryBody,
  type UpdateItemBody,
} from './menu.schema.js';
import {
  hhmmToTime,
  serializeMenuCategory,
  serializeMenuCategoryWithItems,
  serializeMenuItem,
} from './menu.serializer.js';
import type {
  BulkAvailabilityDelta,
  BulkAvailabilityResponse,
  BulkAvailabilitySkippedItem,
  MenuCsvImportResult,
  MenuImageInput,
  MenuCategoryResponse,
  MenuCategoryRow,
  MenuItemResponse,
  MenuItemRow,
  MenuListFilters,
  MenuListResponse,
} from './menu.types.js';

function isPrismaUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

// FK Restrict violation (Postgres 23503 → Prisma P2003) — belt-and-suspenders
// backstop for delete-category race after the app-layer count pre-check.
function isPrismaForeignKeyRestrict(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2003';
}

export function buildMenuCategoryWhere(
  ctx: TenantContext,
  filters: MenuListFilters,
): Prisma.MenuCategoryWhereInput {
  const where: Prisma.MenuCategoryWhereInput = ctx.isSuperAdmin ? {} : { hotelId: ctx.hotelId };
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  return where;
}

export class MenuService {
  constructor(
    private readonly repo: MenuRepository,
    private readonly storage: ObjectStoragePort,
  ) {}

  async list(ctx: TenantContext, filters: MenuListFilters): Promise<MenuListResponse> {
    const rows = await this.repo.listCategoriesWithItems(buildMenuCategoryWhere(ctx, filters));
    return { data: { categories: rows.map(serializeMenuCategoryWithItems) } };
  }

  /**
   * Create a category. `hotel_id`, `id`, timestamps are ALWAYS server-set —
   * `.strict()` rejects at zod boundary; belt-and-suspenders here reinforces
   * the invariant.
   */
  async createCategory(
    ctx: TenantContext,
    input: CreateCategoryBody,
  ): Promise<MenuCategoryResponse> {
    const data: Prisma.MenuCategoryUncheckedCreateInput = {
      hotelId: ctx.hotelId,
      name: input.name,
      ...(input.sort_order !== undefined ? { sortOrder: input.sort_order } : {}),
      ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
    };
    let row: MenuCategoryRow;
    try {
      row = await this.repo.createCategory(data);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictError('Category name already taken for this hotel', {
          reason: 'CATEGORY_NAME_TAKEN',
          name: input.name,
        });
      }
      throw err;
    }
    return { data: serializeMenuCategory(row) };
  }

  async updateCategory(
    ctx: TenantContext,
    id: string,
    input: UpdateCategoryBody,
  ): Promise<MenuCategoryResponse> {
    await this.loadOwnedCategory(ctx, id);
    const data: Prisma.MenuCategoryUncheckedUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.sort_order !== undefined) data.sortOrder = input.sort_order;
    if (input.is_active !== undefined) data.isActive = input.is_active;
    let row: MenuCategoryRow;
    try {
      row = await this.repo.updateCategory(id, data);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictError('Category name already taken for this hotel', {
          reason: 'CATEGORY_NAME_TAKEN',
          ...(input.name !== undefined ? { name: input.name } : {}),
        });
      }
      throw err;
    }
    return { data: serializeMenuCategory(row) };
  }

  /**
   * Delete a category. App-layer `countItemsInCategory` pre-check throws
   * 409 CATEGORY_HAS_ITEMS when items reference the category. P2003 FK
   * Restrict backstop catches race between the pre-check and delete.
   */
  async removeCategory(ctx: TenantContext, id: string): Promise<void> {
    await this.loadOwnedCategory(ctx, id);
    const itemCount = await this.repo.countItemsInCategory(id);
    if (itemCount > 0) {
      throw new ConflictError('Category still has items', {
        reason: 'CATEGORY_HAS_ITEMS',
        itemCount,
      });
    }
    try {
      await this.repo.deleteCategory(id);
    } catch (err) {
      if (isPrismaForeignKeyRestrict(err)) {
        // Race: item created between pre-check and delete. Re-count to give
        // FE an accurate signal.
        const raceCount = await this.repo.countItemsInCategory(id);
        throw new ConflictError('Category still has items', {
          reason: 'CATEGORY_HAS_ITEMS',
          itemCount: raceCount,
        });
      }
      throw err;
    }
  }

  async createItem(ctx: TenantContext, input: CreateItemBody): Promise<MenuItemResponse> {
    // Cross-tenant category-reuse guard — leak-safe 404 when category is
    // not in the tenant hotel.
    const belongs = await this.repo.ensureCategoryBelongsToHotel(input.category_id, ctx.hotelId);
    if (!belongs) {
      throw new NotFoundError('MenuCategory', input.category_id);
    }

    const data: Prisma.MenuItemUncheckedCreateInput = {
      hotelId: ctx.hotelId,
      categoryId: input.category_id,
      name: input.name,
      priceIdr: input.price_idr,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.image_url !== undefined ? { imageUrl: input.image_url } : {}),
      ...(input.prep_minutes !== undefined ? { prepMinutes: input.prep_minutes } : {}),
      ...(input.is_available !== undefined ? { isAvailable: input.is_available } : {}),
      ...(input.available_window_from !== undefined
        ? {
            availableWindowFrom:
              input.available_window_from === null ? null : hhmmToTime(input.available_window_from),
          }
        : {}),
      ...(input.available_window_to !== undefined
        ? {
            availableWindowTo:
              input.available_window_to === null ? null : hhmmToTime(input.available_window_to),
          }
        : {}),
    };
    const row = await this.repo.createItem(data);
    return { data: serializeMenuItem(row) };
  }

  async updateItem(
    ctx: TenantContext,
    id: string,
    input: UpdateItemBody,
  ): Promise<MenuItemResponse> {
    const current = await this.loadOwnedItem(ctx, id);

    // If category_id is changing, re-validate it belongs to the same hotel.
    if (input.category_id !== undefined && input.category_id !== current.categoryId) {
      const belongs = await this.repo.ensureCategoryBelongsToHotel(input.category_id, ctx.hotelId);
      if (!belongs) {
        throw new NotFoundError('MenuCategory', input.category_id);
      }
    }

    const data: Prisma.MenuItemUncheckedUpdateInput = {};
    if (input.category_id !== undefined) data.categoryId = input.category_id;
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.price_idr !== undefined) data.priceIdr = input.price_idr;
    if (input.image_url !== undefined) data.imageUrl = input.image_url;
    if (input.prep_minutes !== undefined) data.prepMinutes = input.prep_minutes;
    if (input.is_available !== undefined) data.isAvailable = input.is_available;
    if (input.available_window_from !== undefined) {
      data.availableWindowFrom =
        input.available_window_from === null ? null : hhmmToTime(input.available_window_from);
    }
    if (input.available_window_to !== undefined) {
      data.availableWindowTo =
        input.available_window_to === null ? null : hhmmToTime(input.available_window_to);
    }
    const row = await this.repo.updateItem(id, data);
    return { data: serializeMenuItem(row) };
  }

  async removeItem(ctx: TenantContext, id: string): Promise<void> {
    await this.loadOwnedItem(ctx, id);
    await this.repo.deleteItem(id);
  }

  /**
   * Multipart create — FE sends form-data with an optional `image` file. When
   * present, upload to object storage first and thread the resulting URL into
   * the same domain path as JSON create (image_url is server-derived, never
   * client-supplied on this surface).
   */
  async createItemFromForm(
    ctx: TenantContext,
    fields: Record<string, string | undefined>,
    image?: MenuImageInput,
  ): Promise<MenuItemResponse> {
    const body = parseCreateItemMultipart(fields);
    const imageUrl = await this.maybeUploadImage(ctx, image);
    return this.createItem(ctx, imageUrl === undefined ? body : { ...body, image_url: imageUrl });
  }

  async updateItemFromForm(
    ctx: TenantContext,
    id: string,
    fields: Record<string, string | undefined>,
    image?: MenuImageInput,
  ): Promise<MenuItemResponse> {
    const body = parseUpdateItemMultipart(fields);
    const imageUrl = await this.maybeUploadImage(ctx, image);
    return this.updateItem(
      ctx,
      id,
      imageUrl === undefined ? body : { ...body, image_url: imageUrl },
    );
  }

  /**
   * CSV import — parse + per-row validate, then create each valid row. Row
   * failures (schema or create-time, e.g. cross-tenant category 404) are
   * collected as `errors[]` without aborting the batch. `skipped` counts the
   * rows that did not import (validation + create failures).
   */
  async importCsv(ctx: TenantContext, csvText: string): Promise<MenuCsvImportResult> {
    const { valid, errors } = parseCsvWithSchema<MenuCsvRow>(csvText, MenuCsvRowValidator, {
      columns: [...MENU_CSV_COLUMNS],
      hasHeader: true,
    });

    const rowErrors: { row: number; reason: string }[] = errors.map((e) => ({
      row: e.line,
      reason: e.issues.join('; '),
    }));

    let imported = 0;
    for (const row of valid) {
      try {
        await this.createItem(ctx, csvRowToCreateBody(row));
        imported += 1;
      } catch (err) {
        rowErrors.push({ row: 0, reason: err instanceof Error ? err.message : 'unknown error' });
      }
    }

    return { imported, skipped: rowErrors.length, errors: rowErrors };
  }

  private async maybeUploadImage(
    ctx: TenantContext,
    image?: MenuImageInput,
  ): Promise<string | undefined> {
    if (!image) return undefined;
    const key = `menu/${ctx.hotelId}/${randomUUID()}-${sanitizeFilename(image.filename)}`;
    const uploaded = await this.storage.upload({
      key,
      body: image.buffer,
      ...(image.contentType !== undefined ? { contentType: image.contentType } : {}),
    });
    return uploaded.url;
  }

  /**
   * T23-slice-1: bulk-update `is_available` / `available_window_from` /
   * `available_window_to` across N items in one call. Cross-tenant + non-
   * existent items collapse to a single `NOT_FOUND` skipped reason (Q-T23-#4
   * leak-safe — same discipline as T21/T22/T24 cross-tenant 404). `hotel_id`
   * is server-scoped from `ctx.hotelId`; item IDs from the body only feed
   * the `WHERE id IN (...)` filter, never a hotel selection. Partial-success
   * semantic: skipped items don't fail the batch, updated items persist.
   * `updated` is the Prisma-authoritative `updateMany.count` — race-safe if
   * an item is deleted between the pre-check and update.
   */
  async bulkAvailability(
    ctx: TenantContext,
    input: BulkAvailabilityBody,
  ): Promise<BulkAvailabilityResponse> {
    const matching = await this.repo.findMatchingItemIds(input.ids, ctx.hotelId);
    const matchingSet = new Set(matching);
    // Q-T23-#7: preserve input order for FE reconciliation against request.
    const skipped: BulkAvailabilitySkippedItem[] = input.ids
      .filter((id) => !matchingSet.has(id))
      .map((item_id) => ({ item_id, reason: 'NOT_FOUND' as const }));

    let updated = 0;
    if (matching.length > 0) {
      const delta = buildBulkDelta(input);
      updated = await this.repo.bulkUpdateAvailability(matching, ctx.hotelId, delta);
    }

    return { data: { updated, skipped } };
  }

  private async loadOwnedCategory(ctx: TenantContext, id: string): Promise<MenuCategoryRow> {
    const row = await this.repo.findCategoryById(id);
    if (!row) {
      throw new NotFoundError('MenuCategory', id);
    }
    assertHotelOwnership(ctx, row.hotelId, 'MenuCategory');
    return row;
  }

  private async loadOwnedItem(ctx: TenantContext, id: string): Promise<MenuItemRow> {
    const row = await this.repo.findItemById(id);
    if (!row) {
      throw new NotFoundError('MenuItem', id);
    }
    assertHotelOwnership(ctx, row.hotelId, 'MenuItem');
    return row;
  }
}

// CSV row → CreateItemBody. description/prep_minutes null stays omitted-safe:
// createItem's spread only writes description/prep_minutes when !== undefined,
// so a null description is preserved (nullable column) and null prep_minutes
// is written as-is. is_available is always present from the CSV row.
function csvRowToCreateBody(row: MenuCsvRow): CreateItemBody {
  return {
    category_id: row.category_id,
    name: row.name,
    description: row.description,
    price_idr: row.price_idr,
    prep_minutes: row.prep_minutes,
    is_available: row.is_available,
  };
}

// Strip path separators + control chars from a client filename before it
// becomes part of a storage key. Falls back to 'image' when nothing survives.
function sanitizeFilename(filename: string | undefined): string {
  if (!filename) return 'image';
  const base = filename.replace(/^.*[\\/]/, '');
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^\.+/, '');
  return cleaned.length > 0 ? cleaned : 'image';
}

// Body → Prisma delta. Three-way null semantic on TIME fields (T22 pattern):
// undefined = omit (preserve current); null = clear; string = codec to Date.
function buildBulkDelta(input: BulkAvailabilityBody): BulkAvailabilityDelta {
  const delta: {
    isAvailable?: boolean;
    availableWindowFrom?: Date | null;
    availableWindowTo?: Date | null;
  } = {};
  if (input.is_available !== undefined) {
    delta.isAvailable = input.is_available;
  }
  if (input.available_window_from !== undefined) {
    delta.availableWindowFrom =
      input.available_window_from === null ? null : hhmmToTime(input.available_window_from);
  }
  if (input.available_window_to !== undefined) {
    delta.availableWindowTo =
      input.available_window_to === null ? null : hhmmToTime(input.available_window_to);
  }
  return delta;
}
