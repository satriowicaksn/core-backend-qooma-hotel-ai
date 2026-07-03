import { describe, expect, it, jest } from '@jest/globals';
import { Prisma } from '@prisma/client';

import { ConflictError, NotFoundError, ValidationError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { MenuRepository } from '../menu.repository.js';
import {
  parseCreateCategoryBody,
  parseCreateItemBody,
  parseListMenuQuery,
  parseUpdateCategoryBody,
  parseUpdateItemBody,
} from '../menu.schema.js';
import {
  hhmmToTime,
  serializeMenuCategoryWithItems,
  serializeMenuItem,
  timeToHHmm,
} from '../menu.serializer.js';
import { buildMenuCategoryWhere, MenuService } from '../menu.service.js';
import type { MenuCategoryRow, MenuCategoryWithItemsRow, MenuItemRow } from '../menu.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ITEM_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const USER_ID = '11111111-1111-4111-8111-111111111111';

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: USER_ID,
    hotelId: HOTEL_A,
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function makeCategory(overrides: Partial<MenuCategoryRow> = {}): MenuCategoryRow {
  return {
    id: CATEGORY_ID,
    hotelId: HOTEL_A,
    name: 'Beverages',
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeItem(overrides: Partial<MenuItemRow> = {}): MenuItemRow {
  return {
    id: ITEM_ID,
    hotelId: HOTEL_A,
    categoryId: CATEGORY_ID,
    name: 'Coffee',
    description: null,
    priceIdr: new Prisma.Decimal('25000.00'),
    imageUrl: null,
    prepMinutes: 5,
    isAvailable: true,
    availableWindowFrom: null,
    availableWindowTo: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    listCategoriesWithItems: () => Promise.resolve([]),
    findCategoryById: () => Promise.resolve(null),
    createCategory: () => Promise.resolve(makeCategory()),
    updateCategory: (id: string) => Promise.resolve(makeCategory({ id })),
    deleteCategory: () => Promise.resolve(),
    countItemsInCategory: () => Promise.resolve(0),
    ensureCategoryBelongsToHotel: () => Promise.resolve(true),
    findItemById: () => Promise.resolve(null),
    createItem: () => Promise.resolve(makeItem()),
    updateItem: (id: string) => Promise.resolve(makeItem({ id })),
    deleteItem: () => Promise.resolve(),
    ...overrides,
  } as unknown as MenuRepository;
}

function prismaP2002(): Error {
  const err = new Error('unique violation') as Error & { code: string };
  err.code = 'P2002';
  return err;
}

function prismaP2003(): Error {
  const err = new Error('foreign key restrict') as Error & { code: string };
  err.code = 'P2003';
  return err;
}

describe('zod parsers', () => {
  describe('category', () => {
    it('should accept a valid create body', () => {
      expect(parseCreateCategoryBody({ name: 'Beverages' })).toEqual({ name: 'Beverages' });
    });

    it('should reject a category name over 80 chars', () => {
      expect(() => parseCreateCategoryBody({ name: 'x'.repeat(81) })).toThrow(ValidationError);
    });

    it('should reject an empty update body', () => {
      expect(() => parseUpdateCategoryBody({})).toThrow(ValidationError);
    });

    it('should reject an unknown field (strict — hotel_id)', () => {
      expect(() => parseCreateCategoryBody({ name: 'x', hotel_id: 'attacker' })).toThrow(
        ValidationError,
      );
    });
  });

  describe('item', () => {
    it('should accept a minimal create body', () => {
      const body = parseCreateItemBody({
        category_id: CATEGORY_ID,
        name: 'Coffee',
        price_idr: 25000,
      });
      expect(body.name).toBe('Coffee');
    });

    it('should reject price_idr above DECIMAL(12,2) max (PM tightening #1)', () => {
      expect(() =>
        parseCreateItemBody({
          category_id: CATEGORY_ID,
          name: 'Expensive',
          price_idr: 10000000000, // 10^10 — 1 IDR above the max
        }),
      ).toThrow(ValidationError);
    });

    it('should accept price_idr at the DECIMAL(12,2) ceiling', () => {
      const body = parseCreateItemBody({
        category_id: CATEGORY_ID,
        name: 'Max',
        price_idr: 9999999999.99,
      });
      expect(body.price_idr).toBe(9999999999.99);
    });

    it('should reject negative price_idr', () => {
      expect(() =>
        parseCreateItemBody({ category_id: CATEGORY_ID, name: 'x', price_idr: -1 }),
      ).toThrow(ValidationError);
    });

    it('should reject prep_minutes below 0', () => {
      expect(() =>
        parseCreateItemBody({
          category_id: CATEGORY_ID,
          name: 'x',
          price_idr: 1,
          prep_minutes: -1,
        }),
      ).toThrow(ValidationError);
    });

    it('should reject bad image_url (not a URL)', () => {
      expect(() =>
        parseCreateItemBody({
          category_id: CATEGORY_ID,
          name: 'x',
          price_idr: 1,
          image_url: 'not-a-url',
        }),
      ).toThrow(ValidationError);
    });

    it('should accept image_url as pre-signed URL string (Q-T22-#5)', () => {
      const body = parseCreateItemBody({
        category_id: CATEGORY_ID,
        name: 'x',
        price_idr: 1,
        image_url: 'https://storage.example.com/menu/coffee.jpg',
      });
      expect(body.image_url).toBe('https://storage.example.com/menu/coffee.jpg');
    });

    it('should accept image_url null (clear)', () => {
      const body = parseUpdateItemBody({ image_url: null });
      expect(body.image_url).toBeNull();
    });

    it('should reject non-HH:mm available_window_from', () => {
      expect(() =>
        parseCreateItemBody({
          category_id: CATEGORY_ID,
          name: 'x',
          price_idr: 1,
          available_window_from: '25:00',
        }),
      ).toThrow(ValidationError);
    });

    it('should reject available_window_from only (both-or-neither Q-T22-#4)', () => {
      expect(() =>
        parseCreateItemBody({
          category_id: CATEGORY_ID,
          name: 'x',
          price_idr: 1,
          available_window_from: '06:00',
        }),
      ).toThrow(ValidationError);
    });

    it('should reject from >= to (strictly-less-than Q-T22-#4)', () => {
      expect(() =>
        parseCreateItemBody({
          category_id: CATEGORY_ID,
          name: 'x',
          price_idr: 1,
          available_window_from: '06:00',
          available_window_to: '06:00',
        }),
      ).toThrow(ValidationError);
      expect(() =>
        parseCreateItemBody({
          category_id: CATEGORY_ID,
          name: 'x',
          price_idr: 1,
          available_window_from: '10:00',
          available_window_to: '06:00',
        }),
      ).toThrow(ValidationError);
    });

    it('should accept valid from < to', () => {
      const body = parseCreateItemBody({
        category_id: CATEGORY_ID,
        name: 'x',
        price_idr: 1,
        available_window_from: '06:00',
        available_window_to: '18:00',
      });
      expect(body.available_window_from).toBe('06:00');
    });

    it('should reject empty update body', () => {
      expect(() => parseUpdateItemBody({})).toThrow(ValidationError);
    });
  });

  it('parseListMenuQuery should accept is_active boolFlag', () => {
    expect(parseListMenuQuery({ is_active: 'true' })).toEqual({ isActive: true });
    expect(parseListMenuQuery({})).toEqual({});
  });
});

describe('serializer', () => {
  it('timeToHHmm should extract UTC HH:mm from Date', () => {
    expect(timeToHHmm(new Date('1970-01-01T06:00:00.000Z'))).toBe('06:00');
    expect(timeToHHmm(null)).toBeNull();
  });

  it('hhmmToTime should round-trip via timeToHHmm', () => {
    expect(timeToHHmm(hhmmToTime('06:00'))).toBe('06:00');
    expect(timeToHHmm(hhmmToTime('23:59'))).toBe('23:59');
  });

  it('serializeMenuItem should snake_case + toFixed(2) on price', () => {
    const wire = serializeMenuItem(
      makeItem({
        availableWindowFrom: new Date('1970-01-01T06:00:00.000Z'),
        availableWindowTo: new Date('1970-01-01T18:30:00.000Z'),
      }),
    );
    expect(wire.price_idr).toBe('25000.00');
    expect(wire.available_window_from).toBe('06:00');
    expect(wire.available_window_to).toBe('18:30');
  });

  it('serializeMenuCategoryWithItems should nest items', () => {
    const cat: MenuCategoryWithItemsRow = { ...makeCategory(), items: [makeItem()] };
    const wire = serializeMenuCategoryWithItems(cat);
    expect(wire.items).toHaveLength(1);
    expect(wire.items[0]?.price_idr).toBe('25000.00');
  });
});

describe('buildMenuCategoryWhere', () => {
  it('should scope by hotelId when not super_admin', () => {
    expect(buildMenuCategoryWhere(ctx(), {})).toEqual({ hotelId: HOTEL_A });
  });

  it('should NOT scope when super_admin', () => {
    expect(buildMenuCategoryWhere(ctx({ isSuperAdmin: true, role: 'super_admin' }), {})).toEqual(
      {},
    );
  });

  it('should add isActive filter (Q-T22-#6)', () => {
    expect(buildMenuCategoryWhere(ctx(), { isActive: true })).toEqual({
      hotelId: HOTEL_A,
      isActive: true,
    });
  });
});

describe('MenuService.list', () => {
  it('should return nested categories-with-items', async () => {
    const rows: MenuCategoryWithItemsRow[] = [{ ...makeCategory(), items: [makeItem()] }];
    const service = new MenuService(
      fakeRepo({ listCategoriesWithItems: () => Promise.resolve(rows) }),
    );
    const res = await service.list(ctx(), {});
    expect(res.data.categories).toHaveLength(1);
    expect(res.data.categories[0]?.items).toHaveLength(1);
  });
});

describe('MenuService.createCategory', () => {
  it('should sink hotel_id from tenant', async () => {
    const create = jest.fn<MenuRepository['createCategory']>().mockResolvedValue(makeCategory());
    const service = new MenuService(fakeRepo({ createCategory: create }));
    await service.createCategory(ctx(), { name: 'Beverages' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ hotelId: HOTEL_A }));
  });

  it('should translate P2002 to CATEGORY_NAME_TAKEN', async () => {
    const service = new MenuService(
      fakeRepo({ createCategory: () => Promise.reject(prismaP2002()) }),
    );
    try {
      await service.createCategory(ctx(), { name: 'dup' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      expect((err as ConflictError).details.reason).toBe('CATEGORY_NAME_TAKEN');
    }
  });
});

describe('MenuService.updateCategory', () => {
  it('should 404 on cross-tenant', async () => {
    const service = new MenuService(
      fakeRepo({
        findCategoryById: () => Promise.resolve(makeCategory({ hotelId: HOTEL_B })),
      }),
    );
    await expect(service.updateCategory(ctx(), CATEGORY_ID, { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should translate P2002 to CATEGORY_NAME_TAKEN', async () => {
    const service = new MenuService(
      fakeRepo({
        findCategoryById: () => Promise.resolve(makeCategory()),
        updateCategory: () => Promise.reject(prismaP2002()),
      }),
    );
    await expect(
      service.updateCategory(ctx(), CATEGORY_ID, { name: 'dup' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('MenuService.removeCategory', () => {
  it('should 409 CATEGORY_HAS_ITEMS via app-layer pre-check', async () => {
    const service = new MenuService(
      fakeRepo({
        findCategoryById: () => Promise.resolve(makeCategory()),
        countItemsInCategory: () => Promise.resolve(3),
      }),
    );
    try {
      await service.removeCategory(ctx(), CATEGORY_ID);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      expect((err as ConflictError).details.reason).toBe('CATEGORY_HAS_ITEMS');
      expect((err as ConflictError).details.itemCount).toBe(3);
    }
  });

  it('should allow delete when countItemsInCategory returns 0', async () => {
    const del = jest.fn<MenuRepository['deleteCategory']>().mockResolvedValue();
    const service = new MenuService(
      fakeRepo({
        findCategoryById: () => Promise.resolve(makeCategory()),
        countItemsInCategory: () => Promise.resolve(0),
        deleteCategory: del,
      }),
    );
    await service.removeCategory(ctx(), CATEGORY_ID);
    expect(del).toHaveBeenCalledWith(CATEGORY_ID);
  });

  it('should catch P2003 race + re-count + throw CATEGORY_HAS_ITEMS', async () => {
    let count = 0;
    const service = new MenuService(
      fakeRepo({
        findCategoryById: () => Promise.resolve(makeCategory()),
        countItemsInCategory: () => {
          count += 1;
          // First call (pre-check): 0. Second call (post-P2003 re-count): 1.
          return Promise.resolve(count === 1 ? 0 : 1);
        },
        deleteCategory: () => Promise.reject(prismaP2003()),
      }),
    );
    try {
      await service.removeCategory(ctx(), CATEGORY_ID);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      expect((err as ConflictError).details.reason).toBe('CATEGORY_HAS_ITEMS');
      expect((err as ConflictError).details.itemCount).toBe(1);
    }
  });

  it('should 404 on cross-tenant delete', async () => {
    const service = new MenuService(
      fakeRepo({
        findCategoryById: () => Promise.resolve(makeCategory({ hotelId: HOTEL_B })),
      }),
    );
    await expect(service.removeCategory(ctx(), CATEGORY_ID)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('MenuService.createItem', () => {
  it('should 404 MenuCategory when category_id does not belong to tenant', async () => {
    const service = new MenuService(
      fakeRepo({ ensureCategoryBelongsToHotel: () => Promise.resolve(false) }),
    );
    try {
      await service.createItem(ctx(), {
        category_id: CATEGORY_ID,
        name: 'x',
        price_idr: 1,
      });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).details.resource).toBe('MenuCategory');
    }
  });

  it('should sink hotel_id from tenant + convert HH:mm to Date', async () => {
    const create = jest.fn<MenuRepository['createItem']>().mockResolvedValue(makeItem());
    const service = new MenuService(fakeRepo({ createItem: create }));
    await service.createItem(ctx(), {
      category_id: CATEGORY_ID,
      name: 'x',
      price_idr: 1,
      available_window_from: '06:00',
      available_window_to: '18:00',
    });
    const call = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.hotelId).toBe(HOTEL_A);
    expect(call.availableWindowFrom).toBeInstanceOf(Date);
    expect((call.availableWindowFrom as Date).toISOString()).toBe('1970-01-01T06:00:00.000Z');
  });
});

describe('MenuService.updateItem', () => {
  it('should 404 on cross-tenant', async () => {
    const service = new MenuService(
      fakeRepo({ findItemById: () => Promise.resolve(makeItem({ hotelId: HOTEL_B })) }),
    );
    await expect(service.updateItem(ctx(), ITEM_ID, { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should re-validate category_id belongs to hotel on category change', async () => {
    const ensure = jest
      .fn<MenuRepository['ensureCategoryBelongsToHotel']>()
      .mockResolvedValue(false);
    const service = new MenuService(
      fakeRepo({
        findItemById: () => Promise.resolve(makeItem()),
        ensureCategoryBelongsToHotel: ensure,
      }),
    );
    const NEW_CAT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    await expect(
      service.updateItem(ctx(), ITEM_ID, { category_id: NEW_CAT }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(ensure).toHaveBeenCalledWith(NEW_CAT, HOTEL_A);
  });

  it('should skip category-check when category_id is unchanged', async () => {
    const ensure = jest
      .fn<MenuRepository['ensureCategoryBelongsToHotel']>()
      .mockResolvedValue(true);
    const service = new MenuService(
      fakeRepo({
        findItemById: () => Promise.resolve(makeItem()),
        ensureCategoryBelongsToHotel: ensure,
      }),
    );
    await service.updateItem(ctx(), ITEM_ID, { category_id: CATEGORY_ID });
    expect(ensure).not.toHaveBeenCalled();
  });

  it('should support image_url null passthrough (clear)', async () => {
    const update = jest.fn<MenuRepository['updateItem']>().mockResolvedValue(makeItem());
    const service = new MenuService(
      fakeRepo({
        findItemById: () => Promise.resolve(makeItem({ imageUrl: 'x' })),
        updateItem: update,
      }),
    );
    await service.updateItem(ctx(), ITEM_ID, { image_url: null });
    const call = update.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(call.imageUrl).toBeNull();
  });
});

describe('MenuService.removeItem', () => {
  it('should delete when tenant owns the item', async () => {
    const del = jest.fn<MenuRepository['deleteItem']>().mockResolvedValue();
    const service = new MenuService(
      fakeRepo({ findItemById: () => Promise.resolve(makeItem()), deleteItem: del }),
    );
    await service.removeItem(ctx(), ITEM_ID);
    expect(del).toHaveBeenCalledWith(ITEM_ID);
  });

  it('should 404 on cross-tenant', async () => {
    const service = new MenuService(
      fakeRepo({ findItemById: () => Promise.resolve(makeItem({ hotelId: HOTEL_B })) }),
    );
    await expect(service.removeItem(ctx(), ITEM_ID)).rejects.toBeInstanceOf(NotFoundError);
  });
});
