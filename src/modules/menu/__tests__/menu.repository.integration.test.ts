// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Crux (T22): UNIQUE(hotel_id, name) on categories + price/prep CHECKs + FK
// Restrict on category delete + tenant isolation + nested-list ordering +
// TIME field round-trip preservation.

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Prisma, PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { ConflictError, NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { buildMenuService } from '../index.js';
import type { MenuService } from '../menu.service.js';

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
let service: MenuService;

function catId(hotel: 'A' | 'B', index: number): string {
  const seg = hotel === 'A' ? 'aaaa' : 'bbbb';
  const idx = String(index).padStart(4, '0');
  return `2000${idx}-${seg}-4${seg.slice(1)}-8${seg.slice(1)}-${seg.repeat(3)}`;
}

async function seed(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });

  // HOTEL_A: 2 categories × 2 items each.
  await db.menuCategory.createMany({
    data: [
      { id: catId('A', 0), hotelId: HOTEL_A, name: 'Beverages', sortOrder: 0 },
      { id: catId('A', 1), hotelId: HOTEL_A, name: 'Mains', sortOrder: 1 },
    ],
  });
  await db.menuItem.createMany({
    data: [
      {
        id: '30000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        categoryId: catId('A', 0),
        name: 'Coffee',
        priceIdr: new Prisma.Decimal('25000.00'),
      },
      {
        id: '30000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        categoryId: catId('A', 0),
        name: 'Tea',
        priceIdr: new Prisma.Decimal('20000.00'),
      },
      {
        id: '30000002-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        categoryId: catId('A', 1),
        name: 'Nasi Goreng',
        priceIdr: new Prisma.Decimal('55000.00'),
      },
      {
        id: '30000003-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        categoryId: catId('A', 1),
        name: 'Ayam Bakar',
        priceIdr: new Prisma.Decimal('65000.00'),
      },
    ],
  });

  // HOTEL_B: 1 category (same name as HOTEL_A's to prove per-hotel UNIQUE allowance).
  await db.menuCategory.create({
    data: { id: catId('B', 0), hotelId: HOTEL_B, name: 'Beverages', sortOrder: 0 },
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
  service = buildMenuService(db);
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.menuItem.deleteMany();
  await db.menuCategory.deleteMany();
  await db.hotel.deleteMany();
  await seed();
});

describe('MenuService list + tenant isolation (integration)', () => {
  it('should return HOTEL_A nested categories-with-items', async () => {
    const res = await service.list(gmA, {});
    expect(res.data.categories).toHaveLength(2);
    expect(res.data.categories[0]?.name).toBe('Beverages'); // sortOrder 0 first
    expect(res.data.categories[0]?.items).toHaveLength(2);
    expect(res.data.categories[1]?.name).toBe('Mains');
  });

  it('should isolate HOTEL_A and HOTEL_B', async () => {
    const resA = await service.list(gmA, {});
    const resB = await service.list(gmB, {});
    expect(resA.data.categories.every((c) => c.hotel_id === HOTEL_A)).toBe(true);
    expect(resB.data.categories.every((c) => c.hotel_id === HOTEL_B)).toBe(true);
    expect(resB.data.categories).toHaveLength(1);
    expect(resB.data.categories[0]?.items).toHaveLength(0);
  });

  it('should filter by ?is_active (Q-T22-#6 categories-only)', async () => {
    const cat = await db.menuCategory.findFirst({
      where: { hotelId: HOTEL_A, name: 'Beverages' },
    });
    if (!cat) throw new Error('seed missing');
    await db.menuCategory.update({ where: { id: cat.id }, data: { isActive: false } });

    const active = await service.list(gmA, { isActive: true });
    expect(active.data.categories.map((c) => c.name)).toEqual(['Mains']);
    const inactive = await service.list(gmA, { isActive: false });
    expect(inactive.data.categories.map((c) => c.name)).toEqual(['Beverages']);
  });

  it('should serialize price_idr as toFixed(2) string with items ordered by name asc', async () => {
    const res = await service.list(gmA, {});
    const bev = res.data.categories.find((c) => c.name === 'Beverages');
    // Order by name asc: Coffee (25000), Tea (20000).
    expect(bev?.items[0]?.name).toBe('Coffee');
    expect(bev?.items[0]?.price_idr).toBe('25000.00');
    expect(bev?.items[1]?.name).toBe('Tea');
    expect(bev?.items[1]?.price_idr).toBe('20000.00');
  });
});

describe('MenuService category CRUD (integration)', () => {
  it('should honor UNIQUE(hotel_id, name) → CATEGORY_NAME_TAKEN', async () => {
    try {
      await service.createCategory(gmA, { name: 'Beverages' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      expect((err as ConflictError).details.reason).toBe('CATEGORY_NAME_TAKEN');
    }
  });

  it('should allow same name across hotels (per-hotel UNIQUE)', async () => {
    // HOTEL_A already has Beverages; HOTEL_B already has Beverages (from seed).
    const countA = await db.menuCategory.count({
      where: { hotelId: HOTEL_A, name: 'Beverages' },
    });
    const countB = await db.menuCategory.count({
      where: { hotelId: HOTEL_B, name: 'Beverages' },
    });
    expect(countA).toBe(1);
    expect(countB).toBe(1);
  });

  it('should 409 CATEGORY_HAS_ITEMS on delete when items exist', async () => {
    const cat = await db.menuCategory.findFirst({
      where: { hotelId: HOTEL_A, name: 'Beverages' },
    });
    if (!cat) throw new Error('seed missing');
    try {
      await service.removeCategory(gmA, cat.id);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      expect((err as ConflictError).details.reason).toBe('CATEGORY_HAS_ITEMS');
      expect((err as ConflictError).details.itemCount).toBe(2);
    }
    // Row must survive.
    const still = await db.menuCategory.findUnique({ where: { id: cat.id } });
    expect(still).not.toBeNull();
  });

  it('should delete a category with no items', async () => {
    // Create a fresh empty category.
    const created = await service.createCategory(gmA, { name: 'Empty' });
    await service.removeCategory(gmA, created.data.id);
    const gone = await db.menuCategory.findUnique({ where: { id: created.data.id } });
    expect(gone).toBeNull();
  });

  it('should 404 on cross-tenant category update (leak-safe)', async () => {
    const catB = await db.menuCategory.findFirst({ where: { hotelId: HOTEL_B } });
    if (!catB) throw new Error('seed missing');
    await expect(service.updateCategory(gmA, catB.id, { name: 'renamed' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('MenuService item CRUD + DB constraints (integration)', () => {
  it('should reject price_idr < 0 at the DB CHECK layer', async () => {
    const cat = await db.menuCategory.findFirst({
      where: { hotelId: HOTEL_A, name: 'Mains' },
    });
    if (!cat) throw new Error('seed missing');
    await expect(
      db.menuItem.create({
        data: {
          id: '99999999-9999-4999-8999-999999999999',
          hotelId: HOTEL_A,
          categoryId: cat.id,
          name: 'BadPrice',
          priceIdr: new Prisma.Decimal('-1.00'),
        },
      }),
    ).rejects.toBeDefined();
  });

  it('should reject prep_minutes < 0 at the DB CHECK layer', async () => {
    const cat = await db.menuCategory.findFirst({
      where: { hotelId: HOTEL_A, name: 'Mains' },
    });
    if (!cat) throw new Error('seed missing');
    await expect(
      db.menuItem.create({
        data: {
          id: '99999999-9999-4999-8999-999999999998',
          hotelId: HOTEL_A,
          categoryId: cat.id,
          name: 'BadPrep',
          priceIdr: new Prisma.Decimal('1.00'),
          prepMinutes: -1,
        },
      }),
    ).rejects.toBeDefined();
  });

  it('should 404 MenuCategory when category_id is cross-tenant on create', async () => {
    const catB = await db.menuCategory.findFirst({ where: { hotelId: HOTEL_B } });
    if (!catB) throw new Error('seed missing');
    try {
      await service.createItem(gmA, {
        category_id: catB.id,
        name: 'Sneaky',
        price_idr: 100,
      });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).details.resource).toBe('MenuCategory');
    }
  });

  it('should round-trip available_window HH:mm preserving UTC', async () => {
    const cat = await db.menuCategory.findFirst({
      where: { hotelId: HOTEL_A, name: 'Mains' },
    });
    if (!cat) throw new Error('seed missing');
    const created = await service.createItem(gmA, {
      category_id: cat.id,
      name: 'Breakfast',
      price_idr: 30000,
      available_window_from: '06:00',
      available_window_to: '10:30',
    });
    expect(created.data.available_window_from).toBe('06:00');
    expect(created.data.available_window_to).toBe('10:30');
    // Re-read via list.
    const list = await service.list(gmA, {});
    const mains = list.data.categories.find((c) => c.name === 'Mains');
    const breakfast = mains?.items.find((i) => i.name === 'Breakfast');
    expect(breakfast?.available_window_from).toBe('06:00');
    expect(breakfast?.available_window_to).toBe('10:30');
  });

  it('should clear image_url to null on PATCH', async () => {
    const cat = await db.menuCategory.findFirst({
      where: { hotelId: HOTEL_A, name: 'Beverages' },
    });
    if (!cat) throw new Error('seed missing');
    const created = await service.createItem(gmA, {
      category_id: cat.id,
      name: 'Latte',
      price_idr: 30000,
      image_url: 'https://storage.example.com/latte.jpg',
    });
    const updated = await service.updateItem(gmA, created.data.id, { image_url: null });
    expect(updated.data.image_url).toBeNull();
  });

  it('should 404 cross-tenant item delete (leak-safe)', async () => {
    const catB = await db.menuCategory.findFirst({ where: { hotelId: HOTEL_B } });
    if (!catB) throw new Error('seed missing');
    // Seed an item under HOTEL_B for the test.
    const bItem = await db.menuItem.create({
      data: {
        id: '30000000-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        hotelId: HOTEL_B,
        categoryId: catB.id,
        name: 'B item',
        priceIdr: new Prisma.Decimal('10000.00'),
      },
    });
    await expect(service.removeItem(gmA, bItem.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
