// Domain + wire (snake_case) types for the settings/menu surface.
// Envelope: camelCase wrapper + snake_case resource body (Q-B-01 / Q-B-07).
// Q-T22-#3: list shape is nested — each category carries its items.

import type { Prisma } from '@prisma/client';

export type MenuCategoryRow = Prisma.MenuCategoryGetPayload<Record<string, never>>;
export type MenuItemRow = Prisma.MenuItemGetPayload<Record<string, never>>;

// List query returns categories with nested items — spec §1.5 "List
// (categories + items)". Prisma include shape.
export type MenuCategoryWithItemsRow = Prisma.MenuCategoryGetPayload<{
  include: { items: true };
}>;

export interface MenuItemWire {
  readonly id: string;
  readonly hotel_id: string;
  readonly category_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly price_idr: string;
  readonly image_url: string | null;
  readonly prep_minutes: number | null;
  readonly is_available: boolean;
  readonly available_window_from: string | null;
  readonly available_window_to: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface MenuCategoryWire {
  readonly id: string;
  readonly hotel_id: string;
  readonly name: string;
  readonly sort_order: number;
  readonly is_active: boolean;
  readonly items: readonly MenuItemWire[];
  readonly created_at: string;
  readonly updated_at: string;
}

export interface MenuListFilters {
  readonly isActive?: boolean;
}

export interface MenuListResponse {
  readonly data: { readonly categories: readonly MenuCategoryWire[] };
}

export interface MenuCategoryResponse {
  readonly data: MenuCategoryWire;
}

export interface MenuItemResponse {
  readonly data: MenuItemWire;
}

// T23-slice-1: bulk-availability endpoint types.
export interface BulkAvailabilityDelta {
  readonly isAvailable?: boolean;
  readonly availableWindowFrom?: Date | null;
  readonly availableWindowTo?: Date | null;
}

export interface BulkAvailabilitySkippedItem {
  readonly item_id: string;
  readonly reason: 'NOT_FOUND';
}

export interface BulkAvailabilityResult {
  readonly updated: number;
  readonly skipped: readonly BulkAvailabilitySkippedItem[];
}

export interface BulkAvailabilityResponse {
  readonly data: BulkAvailabilityResult;
}
