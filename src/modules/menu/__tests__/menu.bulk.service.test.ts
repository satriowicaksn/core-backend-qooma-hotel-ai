// T23-slice-1 bulk-availability service tests. Separate file from
// `menu.service.test.ts` to keep T22 tests untouched for review clarity.

import { describe, expect, it, jest } from '@jest/globals';

import { ValidationError } from '@core/errors/app-errors.js';
import { InMemoryAdapter } from '@core/storage/in-memory-adapter.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { MenuRepository } from '../menu.repository.js';
import { parseBulkAvailabilityBody } from '../menu.schema.js';
import { MenuService } from '../menu.service.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const ID_A1 = '30000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ID_A2 = '30000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ID_A3 = '30000002-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ID_B1 = '30000000-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: USER_ID,
    hotelId: HOTEL_A,
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<MenuRepository> = {}): MenuRepository {
  return {
    findMatchingItemIds: () => Promise.resolve([]),
    bulkUpdateAvailability: () => Promise.resolve(0),
    ...overrides,
  } as unknown as MenuRepository;
}

function makeService(repo: MenuRepository, storage = new InMemoryAdapter()): MenuService {
  return new MenuService(repo, storage);
}

describe('parseBulkAvailabilityBody (zod)', () => {
  it('should accept a valid body with is_available only', () => {
    const body = parseBulkAvailabilityBody({
      ids: [ID_A1],
      is_available: false,
    });
    expect(body.ids).toEqual([ID_A1]);
    expect(body.is_available).toBe(false);
  });

  it('should accept a valid body with a full window', () => {
    const body = parseBulkAvailabilityBody({
      ids: [ID_A1, ID_A2],
      available_window_from: '06:00',
      available_window_to: '18:00',
    });
    expect(body.available_window_from).toBe('06:00');
    expect(body.available_window_to).toBe('18:00');
  });

  it('should reject empty item_ids (min 1)', () => {
    expect(() => parseBulkAvailabilityBody({ ids: [], is_available: true })).toThrow(
      ValidationError,
    );
  });

  it('should accept item_ids at ceiling N=100 (Q-T23-#3)', () => {
    const many = Array.from({ length: 100 }, (_, i) => {
      const idx = String(i).padStart(4, '0');
      return `30000${idx.slice(0, 3)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
    });
    const body = parseBulkAvailabilityBody({ ids: many, is_available: true });
    expect(body.ids).toHaveLength(100);
  });

  it('should reject item_ids over N=100 (Q-T23-#3)', () => {
    const tooMany = Array.from({ length: 101 }, (_, i) => {
      const idx = String(i).padStart(4, '0');
      return `30000${idx.slice(0, 3)}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
    });
    expect(() => parseBulkAvailabilityBody({ ids: tooMany, is_available: true })).toThrow(
      ValidationError,
    );
  });

  it('should reject non-uuid item_ids', () => {
    expect(() => parseBulkAvailabilityBody({ ids: ['not-a-uuid'], is_available: true })).toThrow(
      ValidationError,
    );
  });

  it('should reject body with no delta field (Q-T23-#5)', () => {
    expect(() => parseBulkAvailabilityBody({ ids: [ID_A1] })).toThrow(ValidationError);
  });

  it('should treat null as defined for refine-non-empty (PM ACK note)', () => {
    const body = parseBulkAvailabilityBody({
      ids: [ID_A1],
      available_window_from: null,
      available_window_to: null,
    });
    expect(body.available_window_from).toBeNull();
    expect(body.available_window_to).toBeNull();
  });

  it('should reject only-from (both-or-neither via refineAvailableWindow reuse)', () => {
    expect(() =>
      parseBulkAvailabilityBody({
        ids: [ID_A1],
        available_window_from: '06:00',
      }),
    ).toThrow(ValidationError);
  });

  it('should reject from >= to (strictly-less-than via refineAvailableWindow reuse)', () => {
    expect(() =>
      parseBulkAvailabilityBody({
        ids: [ID_A1],
        available_window_from: '18:00',
        available_window_to: '06:00',
      }),
    ).toThrow(ValidationError);
  });

  it('should allow no window at all (both undefined)', () => {
    const body = parseBulkAvailabilityBody({ ids: [ID_A1], is_available: true });
    expect(body.available_window_from).toBeUndefined();
    expect(body.available_window_to).toBeUndefined();
  });

  it('should reject unknown field (strict — hotel_id belt-and-suspenders)', () => {
    expect(() =>
      parseBulkAvailabilityBody({
        ids: [ID_A1],
        is_available: true,
        hotel_id: 'attacker',
      }),
    ).toThrow(ValidationError);
  });
});

describe('MenuService.bulkAvailability', () => {
  it('should return updated=N + empty skipped when all items match', async () => {
    const bulk = jest.fn<MenuRepository['bulkUpdateAvailability']>().mockResolvedValue(3);
    const service = makeService(
      fakeRepo({
        findMatchingItemIds: () => Promise.resolve([ID_A1, ID_A2, ID_A3]),
        bulkUpdateAvailability: bulk,
      }),
    );
    const res = await service.bulkAvailability(ctx(), {
      ids: [ID_A1, ID_A2, ID_A3],
      is_available: false,
    });
    expect(res.data.updated).toBe(3);
    expect(res.data.skipped).toEqual([]);
    expect(bulk).toHaveBeenCalledWith(
      [ID_A1, ID_A2, ID_A3],
      HOTEL_A,
      expect.objectContaining({ isAvailable: false }),
    );
  });

  it('should collect cross-tenant + nonexistent items as NOT_FOUND skipped', async () => {
    const service = makeService(
      fakeRepo({
        findMatchingItemIds: () => Promise.resolve([ID_A1, ID_A2]),
        bulkUpdateAvailability: () => Promise.resolve(2),
      }),
    );
    const RANDOM = '99999999-9999-4999-8999-999999999999';
    const res = await service.bulkAvailability(ctx(), {
      ids: [ID_A1, ID_A2, ID_B1, RANDOM],
      is_available: true,
    });
    expect(res.data.updated).toBe(2);
    expect(res.data.skipped).toEqual([
      { item_id: ID_B1, reason: 'NOT_FOUND' },
      { item_id: RANDOM, reason: 'NOT_FOUND' },
    ]);
  });

  it('should preserve input order in skipped[] (Q-T23-#7)', async () => {
    const service = makeService(
      fakeRepo({
        findMatchingItemIds: () => Promise.resolve([ID_A1]),
        bulkUpdateAvailability: () => Promise.resolve(1),
      }),
    );
    const RANDOM_1 = '99999999-9999-4999-8999-999999999991';
    const RANDOM_2 = '99999999-9999-4999-8999-999999999992';
    // Input order: RANDOM_1, ID_A1 (matches), ID_B1, RANDOM_2.
    // Skipped preserves that order minus ID_A1.
    const res = await service.bulkAvailability(ctx(), {
      ids: [RANDOM_1, ID_A1, ID_B1, RANDOM_2],
      is_available: true,
    });
    expect(res.data.skipped.map((s) => s.item_id)).toEqual([RANDOM_1, ID_B1, RANDOM_2]);
  });

  it('should return updated=0 + all skipped when nothing matches (Q-T23-#6 all-skipped edge)', async () => {
    const bulk = jest.fn<MenuRepository['bulkUpdateAvailability']>();
    const service = makeService(
      fakeRepo({
        findMatchingItemIds: () => Promise.resolve([]),
        bulkUpdateAvailability: bulk,
      }),
    );
    const res = await service.bulkAvailability(ctx(), {
      ids: [ID_B1],
      is_available: true,
    });
    expect(res.data.updated).toBe(0);
    expect(res.data.skipped).toEqual([{ item_id: ID_B1, reason: 'NOT_FOUND' }]);
    // No call to bulkUpdate when nothing to update — micro-optimization.
    expect(bulk).not.toHaveBeenCalled();
  });

  it('should convert HH:mm to Date in delta (T22 codec reuse)', async () => {
    const bulk = jest.fn<MenuRepository['bulkUpdateAvailability']>().mockResolvedValue(1);
    const service = makeService(
      fakeRepo({
        findMatchingItemIds: () => Promise.resolve([ID_A1]),
        bulkUpdateAvailability: bulk,
      }),
    );
    await service.bulkAvailability(ctx(), {
      ids: [ID_A1],
      available_window_from: '06:00',
      available_window_to: '18:30',
    });
    const delta = bulk.mock.calls[0]?.[2] as {
      availableWindowFrom?: Date;
      availableWindowTo?: Date;
    };
    expect(delta.availableWindowFrom).toBeInstanceOf(Date);
    expect(delta.availableWindowFrom?.toISOString()).toBe('1970-01-01T06:00:00.000Z');
    expect(delta.availableWindowTo?.toISOString()).toBe('1970-01-01T18:30:00.000Z');
  });

  it('should pass null through as null in delta (three-way null semantic)', async () => {
    const bulk = jest.fn<MenuRepository['bulkUpdateAvailability']>().mockResolvedValue(1);
    const service = makeService(
      fakeRepo({
        findMatchingItemIds: () => Promise.resolve([ID_A1]),
        bulkUpdateAvailability: bulk,
      }),
    );
    await service.bulkAvailability(ctx(), {
      ids: [ID_A1],
      available_window_from: null,
      available_window_to: null,
    });
    const delta = bulk.mock.calls[0]?.[2] as {
      availableWindowFrom?: Date | null;
      availableWindowTo?: Date | null;
    };
    expect(delta.availableWindowFrom).toBeNull();
    expect(delta.availableWindowTo).toBeNull();
  });

  it('should call findMatchingItemIds scoped to ctx.hotelId (leak-safe)', async () => {
    const find = jest.fn<MenuRepository['findMatchingItemIds']>().mockResolvedValue([ID_A1]);
    const service = makeService(
      fakeRepo({
        findMatchingItemIds: find,
        bulkUpdateAvailability: () => Promise.resolve(1),
      }),
    );
    await service.bulkAvailability(ctx(), {
      ids: [ID_A1, ID_B1],
      is_available: true,
    });
    expect(find).toHaveBeenCalledWith([ID_A1, ID_B1], HOTEL_A);
  });

  it('should use Prisma-authoritative updated count (not matchingIds.length)', async () => {
    // Simulate race: findMatching returns 3 IDs but bulkUpdate finds only 2
    // (one item deleted between calls). Service returns Prisma count, not 3.
    const service = makeService(
      fakeRepo({
        findMatchingItemIds: () => Promise.resolve([ID_A1, ID_A2, ID_A3]),
        bulkUpdateAvailability: () => Promise.resolve(2),
      }),
    );
    const res = await service.bulkAvailability(ctx(), {
      ids: [ID_A1, ID_A2, ID_A3],
      is_available: true,
    });
    expect(res.data.updated).toBe(2);
    // Skipped stays empty — race happened server-side, all items were valid at request time.
    expect(res.data.skipped).toEqual([]);
  });
});
