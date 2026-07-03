import { describe, expect, it, jest } from '@jest/globals';

import { NotFoundError, ValidationError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { KnowledgeRepository } from '../knowledge.repository.js';
import {
  parseCreateEntryBody,
  parseListEntriesQuery,
  parseUpdateEntryBody,
} from '../knowledge.schema.js';
import { serializeKnowledgeEntry } from '../knowledge.serializer.js';
import { buildKnowledgeWhere, KnowledgeService } from '../knowledge.service.js';
import type { KnowledgeEntryRow } from '../knowledge.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ENTRY_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
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

function makeRow(overrides: Partial<KnowledgeEntryRow> = {}): KnowledgeEntryRow {
  return {
    id: ENTRY_ID,
    hotelId: HOTEL_A,
    title: 'Check-in FAQ',
    content: 'How to check in early',
    category: 'faq',
    tags: ['welcome', 'checkin'],
    isActive: true,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<KnowledgeRepository> = {}): KnowledgeRepository {
  return {
    findMany: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    create: () => Promise.resolve(makeRow()),
    update: (id: string) => Promise.resolve(makeRow({ id })),
    delete: () => Promise.resolve(),
    ...overrides,
  } as unknown as KnowledgeRepository;
}

describe('zod parsers', () => {
  it('should accept a minimal create body', () => {
    const body = parseCreateEntryBody({ title: 'x', content: 'y' });
    expect(body.title).toBe('x');
  });

  it('should reject a create body missing content', () => {
    expect(() => parseCreateEntryBody({ title: 'x' })).toThrow(ValidationError);
  });

  it('should reject title over 255 chars', () => {
    expect(() => parseCreateEntryBody({ title: 'x'.repeat(256), content: 'y' })).toThrow(
      ValidationError,
    );
  });

  it('should reject content over 10000 chars', () => {
    expect(() => parseCreateEntryBody({ title: 'x', content: 'y'.repeat(10001) })).toThrow(
      ValidationError,
    );
  });

  it('should reject an unknown field on create (strict — hotel_id)', () => {
    expect(() => parseCreateEntryBody({ title: 'x', content: 'y', hotel_id: 'attacker' })).toThrow(
      ValidationError,
    );
  });

  it('should reject an empty update body', () => {
    expect(() => parseUpdateEntryBody({})).toThrow(ValidationError);
  });

  it('should accept category=null (partial-clear)', () => {
    expect(parseUpdateEntryBody({ category: null })).toEqual({ category: null });
  });

  it('should reject tags over 20 items (Q-T24-#3)', () => {
    const many = Array.from({ length: 21 }, (_, i) => `t${i}`);
    expect(() => parseCreateEntryBody({ title: 'x', content: 'y', tags: many })).toThrow(
      ValidationError,
    );
  });

  it('should reject a tag over 40 chars', () => {
    expect(() =>
      parseCreateEntryBody({ title: 'x', content: 'y', tags: ['x'.repeat(41)] }),
    ).toThrow(ValidationError);
  });

  it('should reject an empty-string tag', () => {
    expect(() => parseCreateEntryBody({ title: 'x', content: 'y', tags: [''] })).toThrow(
      ValidationError,
    );
  });

  it('should parse list query filters together', () => {
    expect(parseListEntriesQuery({ is_active: 'true', category: 'faq', tag: 'welcome' })).toEqual({
      isActive: true,
      category: 'faq',
      tag: 'welcome',
    });
  });

  it('should parse an empty list query as {}', () => {
    expect(parseListEntriesQuery({})).toEqual({});
  });
});

describe('serializer', () => {
  it('should snake_case and pass-through tags array', () => {
    const wire = serializeKnowledgeEntry(makeRow());
    expect(wire).toEqual({
      id: ENTRY_ID,
      hotel_id: HOTEL_A,
      title: 'Check-in FAQ',
      content: 'How to check in early',
      category: 'faq',
      tags: ['welcome', 'checkin'],
      is_active: true,
      created_at: '2026-07-03T00:00:00.000Z',
      updated_at: '2026-07-03T00:00:00.000Z',
    });
  });

  it('should keep tags=[] shape when unset (PM ACK reminder #3)', () => {
    const wire = serializeKnowledgeEntry(makeRow({ tags: [] }));
    expect(wire.tags).toEqual([]);
  });
});

describe('buildKnowledgeWhere', () => {
  it('should scope by hotelId when not super_admin', () => {
    expect(buildKnowledgeWhere(ctx(), {})).toEqual({ hotelId: HOTEL_A });
  });

  it('should NOT scope when super_admin (cross-hotel bypass)', () => {
    expect(buildKnowledgeWhere(ctx({ isSuperAdmin: true, role: 'super_admin' }), {})).toEqual({});
  });

  it('should compose is_active filter', () => {
    expect(buildKnowledgeWhere(ctx(), { isActive: true })).toEqual({
      hotelId: HOTEL_A,
      isActive: true,
    });
  });

  it('should compose category filter (exact match)', () => {
    expect(buildKnowledgeWhere(ctx(), { category: 'faq' })).toEqual({
      hotelId: HOTEL_A,
      category: 'faq',
    });
  });

  it('should compose tag filter via Prisma has operator', () => {
    expect(buildKnowledgeWhere(ctx(), { tag: 'welcome' })).toEqual({
      hotelId: HOTEL_A,
      tags: { has: 'welcome' },
    });
  });

  it('should compose all three filters together', () => {
    expect(
      buildKnowledgeWhere(ctx(), { isActive: false, category: 'faq', tag: 'checkin' }),
    ).toEqual({
      hotelId: HOTEL_A,
      isActive: false,
      category: 'faq',
      tags: { has: 'checkin' },
    });
  });
});

describe('KnowledgeService.list', () => {
  it('should serialize rows returned by repo', async () => {
    const rows = [makeRow({ id: 'a' }), makeRow({ id: 'b' })];
    const service = new KnowledgeService(fakeRepo({ findMany: () => Promise.resolve(rows) }));
    const res = await service.list(ctx(), {});
    expect(res.data).toHaveLength(2);
    expect(res.data[0]?.id).toBe('a');
  });
});

describe('KnowledgeService.create', () => {
  it('should sink hotel_id from tenant', async () => {
    const create = jest.fn<KnowledgeRepository['create']>().mockResolvedValue(makeRow());
    const service = new KnowledgeService(fakeRepo({ create }));
    await service.create(ctx(), { title: 'x', content: 'y' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ hotelId: HOTEL_A }));
  });

  it('should skip omitted optional fields (partial-create)', async () => {
    const create = jest.fn<KnowledgeRepository['create']>().mockResolvedValue(makeRow());
    const service = new KnowledgeService(fakeRepo({ create }));
    await service.create(ctx(), { title: 'x', content: 'y' });
    const data = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(data).not.toHaveProperty('category');
    expect(data).not.toHaveProperty('tags');
    expect(data).not.toHaveProperty('isActive');
  });

  it('should pass tags array through', async () => {
    const create = jest.fn<KnowledgeRepository['create']>().mockResolvedValue(makeRow());
    const service = new KnowledgeService(fakeRepo({ create }));
    await service.create(ctx(), {
      title: 'x',
      content: 'y',
      tags: ['a', 'b', 'c'],
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ tags: ['a', 'b', 'c'] }));
  });
});

describe('KnowledgeService.update', () => {
  it('should 404 when repo returns null', async () => {
    const service = new KnowledgeService(fakeRepo({ findById: () => Promise.resolve(null) }));
    await expect(service.update(ctx(), ENTRY_ID, { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should 404 on cross-tenant update (leak-safe)', async () => {
    const service = new KnowledgeService(
      fakeRepo({ findById: () => Promise.resolve(makeRow({ hotelId: HOTEL_B })) }),
    );
    try {
      await service.update(ctx(), ENTRY_ID, { title: 'x' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).details.resource).toBe('KnowledgeEntry');
    }
  });

  it('should support category=null passthrough (clear)', async () => {
    const update = jest.fn<KnowledgeRepository['update']>().mockResolvedValue(makeRow());
    const service = new KnowledgeService(
      fakeRepo({ findById: () => Promise.resolve(makeRow()), update }),
    );
    await service.update(ctx(), ENTRY_ID, { category: null });
    const data = update.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(data.category).toBeNull();
  });

  it('should skip omitted fields (partial-update)', async () => {
    const update = jest.fn<KnowledgeRepository['update']>().mockResolvedValue(makeRow());
    const service = new KnowledgeService(
      fakeRepo({ findById: () => Promise.resolve(makeRow()), update }),
    );
    await service.update(ctx(), ENTRY_ID, { title: 'new' });
    const data = update.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(data).toHaveProperty('title');
    expect(data).not.toHaveProperty('content');
    expect(data).not.toHaveProperty('tags');
  });

  it('should allow super_admin cross-hotel update', async () => {
    const service = new KnowledgeService(
      fakeRepo({ findById: () => Promise.resolve(makeRow({ hotelId: HOTEL_B })) }),
    );
    const superCtx = ctx({ isSuperAdmin: true, role: 'super_admin' });
    const res = await service.update(superCtx, ENTRY_ID, { title: 'x' });
    expect(res.data).toBeDefined();
  });
});

describe('KnowledgeService.remove', () => {
  it('should call repo.delete on owned entry', async () => {
    const del = jest.fn<KnowledgeRepository['delete']>().mockResolvedValue();
    const service = new KnowledgeService(
      fakeRepo({ findById: () => Promise.resolve(makeRow()), delete: del }),
    );
    await service.remove(ctx(), ENTRY_ID);
    expect(del).toHaveBeenCalledWith(ENTRY_ID);
  });

  it('should 404 on cross-tenant delete', async () => {
    const service = new KnowledgeService(
      fakeRepo({ findById: () => Promise.resolve(makeRow({ hotelId: HOTEL_B })) }),
    );
    await expect(service.remove(ctx(), ENTRY_ID)).rejects.toBeInstanceOf(NotFoundError);
  });
});
