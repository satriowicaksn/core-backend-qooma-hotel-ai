// Service: Menu categories + items CRUD with cross-tenant + delete-conflict
// guards. RBAC gate lives at the route layer (requireRole([gm_admin])).

import type { Prisma } from '@prisma/client';

import { ConflictError, NotFoundError } from '@core/errors/app-errors.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';

import type { MenuRepository } from './menu.repository.js';
import type {
  CreateCategoryBody,
  CreateItemBody,
  UpdateCategoryBody,
  UpdateItemBody,
} from './menu.schema.js';
import {
  hhmmToTime,
  serializeMenuCategory,
  serializeMenuCategoryWithItems,
  serializeMenuItem,
} from './menu.serializer.js';
import type {
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
  constructor(private readonly repo: MenuRepository) {}

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
