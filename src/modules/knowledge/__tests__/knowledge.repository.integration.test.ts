// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Crux (T24): tenant isolation + list filters (is_active / category / tag —
// Prisma `has` operator proven at index 2+ per PM ACK coding note) +
// tags array persistence + case-sensitive category exact match documented.

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { buildKnowledgeService } from '../index.js';
import type { KnowledgeService } from '../knowledge.service.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_A = '1111aaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = '2222bbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const gmA: TenantContext = {
  userId: USER_A,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const gmB: TenantContext = {
  userId: USER_B,
  hotelId: HOTEL_B,
  isSuperAdmin: false,
  role: 'gm_admin',
};

let container: StartedPostgreSqlContainer;
let db: PrismaClient;
let service: KnowledgeService;

// Fixture per PM ASSIGNMENT: HOTEL_A with 3 entries (varied categories +
// tags), HOTEL_B with 1 for tenant isolation. First entry seeds 3+ tags to
// prove Prisma `has` works beyond index 0.
async function seed(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });

  await db.knowledgeEntry.createMany({
    data: [
      {
        id: '30000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        title: 'Check-in FAQ',
        content: 'How to check in early and late arrivals',
        category: 'faq',
        // 3+ tags — 'sunset' at index 2 verifies Prisma `has` beyond [0].
        tags: ['welcome', 'checkin', 'sunset'],
        isActive: true,
      },
      {
        id: '30000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        title: 'Pool Rules',
        content: 'Open 06:00 – 22:00 daily',
        category: 'amenities',
        tags: ['pool'],
        isActive: false,
      },
      {
        id: '30000002-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        title: 'General Welcome',
        content: 'Welcome to the hotel',
        category: null,
        tags: [],
        isActive: true,
      },
    ],
  });

  await db.knowledgeEntry.create({
    data: {
      id: '30000000-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      hotelId: HOTEL_B,
      title: 'B Entry',
      content: 'Only in HOTEL_B',
      category: 'faq',
      tags: ['welcome'],
      isActive: true,
    },
  });
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine').start();
  const url = container.getConnectionUri();
  execFileSync('pnpm', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
  db = new PrismaClient({ datasources: { db: { url } } });
  service = buildKnowledgeService(db);
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.knowledgeEntry.deleteMany();
  await db.hotel.deleteMany();
  await seed();
});

describe('KnowledgeService list + tenant isolation (integration)', () => {
  it('should return HOTEL_A entries only', async () => {
    const res = await service.list(gmA, {});
    expect(res.data).toHaveLength(3);
    expect(res.data.every((e) => e.hotel_id === HOTEL_A)).toBe(true);
  });

  it('should isolate HOTEL_B entries', async () => {
    const res = await service.list(gmB, {});
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.title).toBe('B Entry');
  });

  it('should filter by ?is_active=true', async () => {
    const res = await service.list(gmA, { isActive: true });
    expect(res.data).toHaveLength(2);
    expect(res.data.every((e) => e.is_active)).toBe(true);
  });

  it('should filter by ?is_active=false', async () => {
    const res = await service.list(gmA, { isActive: false });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.title).toBe('Pool Rules');
  });

  it('should filter by ?category exact match', async () => {
    const res = await service.list(gmA, { category: 'faq' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.title).toBe('Check-in FAQ');
  });

  it('should be case-sensitive on ?category (PM ACK reminder — documents behavior)', async () => {
    const upperRes = await service.list(gmA, { category: 'FAQ' });
    expect(upperRes.data).toHaveLength(0);
    const lowerRes = await service.list(gmA, { category: 'faq' });
    expect(lowerRes.data).toHaveLength(1);
  });

  it('should filter by ?tag=welcome (index 0)', async () => {
    const res = await service.list(gmA, { tag: 'welcome' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.title).toBe('Check-in FAQ');
  });

  it('should filter by ?tag=sunset — proves Prisma `has` beyond index 0 (PM ACK reminder)', async () => {
    // 'sunset' is at index 2 in the seed. If Prisma has() operator only
    // matched [0], this would return 0 rows. It should return 1.
    const res = await service.list(gmA, { tag: 'sunset' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.title).toBe('Check-in FAQ');
  });

  it('should return [] for a non-existent tag', async () => {
    const res = await service.list(gmA, { tag: 'nope' });
    expect(res.data).toHaveLength(0);
  });

  it('should compose multiple filters (AND semantics)', async () => {
    const res = await service.list(gmA, { isActive: true, category: 'faq' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.title).toBe('Check-in FAQ');
  });
});

describe('KnowledgeService CRUD lifecycle (integration)', () => {
  it('should create → update → delete an entry', async () => {
    const created = await service.create(gmA, {
      title: 'New Entry',
      content: 'Body',
      category: 'faq',
      tags: ['new'],
    });
    expect(created.data.title).toBe('New Entry');
    expect(created.data.tags).toEqual(['new']);

    const updated = await service.update(gmA, created.data.id, { title: 'Renamed' });
    expect(updated.data.title).toBe('Renamed');

    await service.remove(gmA, created.data.id);
    const gone = await db.knowledgeEntry.findUnique({ where: { id: created.data.id } });
    expect(gone).toBeNull();
  });

  it('should default tags to [] when omitted', async () => {
    const created = await service.create(gmA, { title: 'x', content: 'y' });
    expect(created.data.tags).toEqual([]);
  });

  it('should support category=null (partial-clear)', async () => {
    const existing = await db.knowledgeEntry.findFirst({
      where: { hotelId: HOTEL_A, title: 'Pool Rules' },
    });
    if (!existing) throw new Error('seed missing');
    const updated = await service.update(gmA, existing.id, { category: null });
    expect(updated.data.category).toBeNull();
  });

  it('should replace tags array (not merge) on PATCH', async () => {
    const existing = await db.knowledgeEntry.findFirst({
      where: { hotelId: HOTEL_A, title: 'Check-in FAQ' },
    });
    if (!existing) throw new Error('seed missing');
    const updated = await service.update(gmA, existing.id, { tags: ['a', 'b'] });
    expect(updated.data.tags).toEqual(['a', 'b']);
  });
});

describe('KnowledgeService cross-tenant (integration)', () => {
  it('should 404 on cross-tenant update (leak-safe)', async () => {
    const bEntry = await db.knowledgeEntry.findFirst({ where: { hotelId: HOTEL_B } });
    if (!bEntry) throw new Error('seed missing');
    await expect(service.update(gmA, bEntry.id, { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should 404 on cross-tenant delete (leak-safe)', async () => {
    const bEntry = await db.knowledgeEntry.findFirst({ where: { hotelId: HOTEL_B } });
    if (!bEntry) throw new Error('seed missing');
    await expect(service.remove(gmA, bEntry.id)).rejects.toBeInstanceOf(NotFoundError);
    // Row must survive.
    const still = await db.knowledgeEntry.findUnique({ where: { id: bEntry.id } });
    expect(still).not.toBeNull();
  });
});
