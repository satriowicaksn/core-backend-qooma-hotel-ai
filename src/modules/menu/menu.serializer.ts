// Serializer: Prisma rows → snake_case wire.
// price_idr as string via toFixed(2) — T27 pattern; TIME → HH:mm UTC helpers.

import type {
  MenuCategoryRow,
  MenuCategoryWire,
  MenuCategoryWithItemsRow,
  MenuItemRow,
  MenuItemWire,
} from './menu.types.js';

// Q-T22-#4 TIME field HH:mm codec. Postgres @db.Time returns a Date with an
// epoch date part (1970-01-01) — we extract UTC hours+minutes to avoid
// local timezone drift across test machines.
export function timeToHHmm(d: Date | null): string | null {
  if (d === null) return null;
  const hh = d.getUTCHours().toString().padStart(2, '0');
  const mm = d.getUTCMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// Reverse codec: HH:mm string → Date at 1970-01-01Thh:mm:00Z. Used by service
// when writing to Prisma @db.Time fields.
export function hhmmToTime(hhmm: string): Date {
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

export function serializeMenuItem(row: MenuItemRow): MenuItemWire {
  return {
    id: row.id,
    hotel_id: row.hotelId,
    category_id: row.categoryId,
    name: row.name,
    description: row.description,
    price_idr: row.priceIdr.toFixed(2),
    image_url: row.imageUrl,
    prep_minutes: row.prepMinutes,
    is_available: row.isAvailable,
    available_window_from: timeToHHmm(row.availableWindowFrom),
    available_window_to: timeToHHmm(row.availableWindowTo),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function serializeMenuCategoryHeader(row: MenuCategoryRow): Omit<MenuCategoryWire, 'items'> {
  return {
    id: row.id,
    hotel_id: row.hotelId,
    name: row.name,
    sort_order: row.sortOrder,
    is_active: row.isActive,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

// Empty-items wire (for single-category responses that don't fetch items).
export function serializeMenuCategory(row: MenuCategoryRow): MenuCategoryWire {
  return { ...serializeMenuCategoryHeader(row), items: [] };
}

export function serializeMenuCategoryWithItems(row: MenuCategoryWithItemsRow): MenuCategoryWire {
  return {
    ...serializeMenuCategoryHeader(row),
    items: row.items.map(serializeMenuItem),
  };
}
