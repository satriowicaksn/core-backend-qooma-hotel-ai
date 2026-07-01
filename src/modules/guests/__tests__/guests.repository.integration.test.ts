// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Self-contained: spins its own PG, applies migrations, seeds fixtures. Requires Docker.

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { GuestsService } from '../guests.service.js';
import { buildGuestsService } from '../index.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const GUEST_A1 = 'c1111111-cccc-4ccc-8ccc-cccccccccccc';
const GUEST_B1 = 'c2222222-cccc-4ccc-8ccc-cccccccccccc';
const DEPT_A = 'd1111111-dddd-4ddd-8ddd-dddddddddddd';
const DEPT_B = 'd2222222-dddd-4ddd-8ddd-dddddddddddd';
const TICKET_A1 = 'e1111111-eeee-4eee-8eee-eeeeeeeeeeee';
const TICKET_A2 = 'e2222222-eeee-4eee-8eee-eeeeeeeeeeee';
const TICKET_OTHER = 'e3333333-eeee-4eee-8eee-eeeeeeeeeeee';
const TICKET_B = 'e4444444-eeee-4eee-8eee-eeeeeeeeeeee';

const gmA: TenantContext = { hotelId: HOTEL_A, isSuperAdmin: false, role: 'gm_admin' };
const gmB: TenantContext = { hotelId: HOTEL_B, isSuperAdmin: false, role: 'gm_admin' };

let container: StartedPostgreSqlContainer;
let db: PrismaClient;
let service: GuestsService;

function guestId(n: number): string {
  return `a${String(n).padStart(7, '0')}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
}

async function seed(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });

  // Named anchor guests.
  await db.guest.create({
    data: {
      id: GUEST_A1,
      hotelId: HOTEL_A,
      name: 'Budi Santoso',
      waPhone: '+6281234567890',
      email: 'budi@example.com',
    },
  });
  await db.guest.create({
    data: { id: GUEST_B1, hotelId: HOTEL_B, name: 'Other Hotel Guest', waPhone: '+6289999' },
  });

  // Extra hotel-A guests for pagination (5 total in A incl. GUEST_A1).
  for (let i = 0; i < 4; i += 1) {
    await db.guest.create({
      data: {
        id: guestId(i),
        hotelId: HOTEL_A,
        name: `Guest ${i}`,
        waPhone: `+628100000000${i}`,
        createdAt: new Date(`2026-06-0${i + 1}T00:00:00.000Z`),
      },
    });
  }

  await db.guestPreference.createMany({
    data: [
      {
        hotelId: HOTEL_A,
        guestId: GUEST_A1,
        preferenceType: 'pillow',
        preferenceValue: 'soft',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
      },
      {
        hotelId: HOTEL_A,
        guestId: GUEST_A1,
        preferenceType: 'allergy',
        preferenceValue: 'peanut',
        createdAt: new Date('2026-06-02T00:00:00.000Z'),
      },
    ],
  });

  await db.visit.createMany({
    data: [
      {
        hotelId: HOTEL_A,
        guestId: GUEST_A1,
        checkIn: new Date('2026-05-01T06:00:00.000Z'),
        status: 'checked_out',
      },
      {
        hotelId: HOTEL_A,
        guestId: GUEST_A1,
        checkIn: new Date('2026-06-10T06:00:00.000Z'),
        status: 'pending_verification',
      },
    ],
  });

  // Tickets + messages for the guest-messages history aggregation.
  await db.department.createMany({
    data: [
      { id: DEPT_A, hotelId: HOTEL_A, name: 'Housekeeping', code: 'HSK' },
      { id: DEPT_B, hotelId: HOTEL_B, name: 'Front Office', code: 'FO' },
    ],
  });
  await db.ticket.createMany({
    data: [
      {
        id: TICKET_A1,
        hotelId: HOTEL_A,
        ticketNumber: 'HSK-2606-001',
        guestId: GUEST_A1,
        departmentId: DEPT_A,
        subject: 't1',
      },
      {
        id: TICKET_A2,
        hotelId: HOTEL_A,
        ticketNumber: 'HSK-2606-002',
        guestId: GUEST_A1,
        departmentId: DEPT_A,
        subject: 't2',
      },
      {
        id: TICKET_OTHER,
        hotelId: HOTEL_A,
        ticketNumber: 'HSK-2606-003',
        guestId: guestId(0),
        departmentId: DEPT_A,
        subject: 't3',
      },
      {
        id: TICKET_B,
        hotelId: HOTEL_B,
        ticketNumber: 'FO-2606-001',
        guestId: GUEST_B1,
        departmentId: DEPT_B,
        subject: 't4',
      },
    ],
  });
  await db.ticketMessage.createMany({
    data: [
      // GUEST_A1 messages across two tickets, out of order to prove sorting.
      {
        hotelId: HOTEL_A,
        ticketId: TICKET_A1,
        sender: 'guest',
        body: 'a1-old',
        sentAt: new Date('2026-06-11T07:00:00.000Z'),
      },
      {
        hotelId: HOTEL_A,
        ticketId: TICKET_A2,
        sender: 'staff',
        body: 'a2-new',
        sentAt: new Date('2026-06-11T09:00:00.000Z'),
      },
      {
        hotelId: HOTEL_A,
        ticketId: TICKET_A1,
        sender: 'ai',
        body: 'a1-mid',
        sentAt: new Date('2026-06-11T08:00:00.000Z'),
      },
      // A message on a DIFFERENT guest's ticket (same hotel) — must be excluded.
      {
        hotelId: HOTEL_A,
        ticketId: TICKET_OTHER,
        sender: 'guest',
        body: 'other-guest',
        sentAt: new Date('2026-06-11T10:00:00.000Z'),
      },
      // A message in hotel B — must be excluded for hotel-A callers.
      {
        hotelId: HOTEL_B,
        ticketId: TICKET_B,
        sender: 'guest',
        body: 'other-hotel',
        sentAt: new Date('2026-06-11T10:00:00.000Z'),
      },
    ],
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
  service = buildGuestsService(db);
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.ticketMessage.deleteMany();
  await db.ticket.deleteMany();
  await db.guestPreference.deleteMany();
  await db.visit.deleteMany();
  await db.guest.deleteMany();
  await db.department.deleteMany();
  await db.hotel.deleteMany();
  await seed();
});

describe('GuestsService.list (integration)', () => {
  it('should return only the caller hotel guests', async () => {
    const res = await service.list(gmA, { pageSize: '50' });
    expect(res.data).toHaveLength(5);
    expect(res.data.every((g) => g.name !== 'Other Hotel Guest')).toBe(true);
  });

  it('should offset-paginate with a total and hasMore', async () => {
    const page1 = await service.list(gmA, { page: '1', pageSize: '2' });
    expect(page1.data).toHaveLength(2);
    expect(page1.pageInfo).toEqual({ page: 1, pageSize: 2, total: 5, hasMore: true });

    const page3 = await service.list(gmA, { page: '3', pageSize: '2' });
    expect(page3.data).toHaveLength(1);
    expect(page3.pageInfo.hasMore).toBe(false);
  });

  it('should search by name and wa_phone', async () => {
    const byName = await service.list(gmA, { q: 'Budi' });
    expect(byName.data.map((g) => g.id)).toEqual([GUEST_A1]);

    const byPhone = await service.list(gmA, { q: '81234567890' });
    expect(byPhone.data.map((g) => g.id)).toEqual([GUEST_A1]);
  });
});

describe('GuestsService.detail (integration)', () => {
  it('should return preferences asc and visits desc', async () => {
    const res = await service.detail(gmA, GUEST_A1);
    expect(res.data.preferences.map((p) => p.preference_type)).toEqual(['pillow', 'allergy']);
    expect(res.data.visits.map((v) => v.status)).toEqual(['pending_verification', 'checked_out']);
    expect(res.data.wa_phone).toBe('+6281234567890');
  });

  it('should 404 a missing guest', async () => {
    await expect(service.detail(gmA, guestId(9))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should mask a cross-tenant guest as NotFoundError', async () => {
    await expect(service.detail(gmB, GUEST_A1)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('GuestsService.update (integration)', () => {
  it('should persist allowed profile fields', async () => {
    const res = await service.update(gmA, GUEST_A1, {
      is_vip: true,
      vip_level: 'gold',
      privacy_mode: 'vvip',
    });
    expect(res.data.is_vip).toBe(true);
    expect(res.data.vip_level).toBe('gold');
    const reread = await service.detail(gmA, GUEST_A1);
    expect(reread.data.privacy_mode).toBe('vvip');
  });

  it('should mask a cross-tenant update as NotFoundError', async () => {
    await expect(service.update(gmB, GUEST_A1, { is_vip: true })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('GuestsService.addPreference (integration)', () => {
  it('should upsert by preference_type (idempotent, no duplicate)', async () => {
    await service.addPreference(gmA, GUEST_A1, {
      preference_type: 'pillow',
      preference_value: 'firm',
    });
    const res = await service.addPreference(gmA, GUEST_A1, {
      preference_type: 'pillow',
      preference_value: 'medium',
    });
    const pillow = res.data.filter((p) => p.preference_type === 'pillow');
    expect(pillow).toHaveLength(1);
    expect(pillow[0]?.preference_value).toBe('medium');
    expect(res.data).toHaveLength(2); // pillow + allergy, not 3
  });

  it('should mask a cross-tenant preference add as NotFoundError', async () => {
    await expect(
      service.addPreference(gmB, GUEST_A1, { preference_type: 'x', preference_value: 'y' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('GuestsService.messages (integration)', () => {
  it('should aggregate the guest ticket_messages newest-first, excluding other guests/hotels', async () => {
    const res = await service.messages(gmA, GUEST_A1, { limit: '10' });
    expect(res.data.map((m) => m.body)).toEqual(['a2-new', 'a1-mid', 'a1-old']);
    expect(res.pageInfo.hasMore).toBe(false);
  });

  it('should cursor-paginate the history', async () => {
    const page1 = await service.messages(gmA, GUEST_A1, { limit: '2' });
    expect(page1.data.map((m) => m.body)).toEqual(['a2-new', 'a1-mid']);
    expect(page1.pageInfo.hasMore).toBe(true);

    const page2 = await service.messages(gmA, GUEST_A1, {
      limit: '2',
      cursor: page1.pageInfo.nextCursor,
    });
    expect(page2.data.map((m) => m.body)).toEqual(['a1-old']);
    expect(page2.pageInfo.hasMore).toBe(false);
  });

  it('should 404 for a cross-tenant guest', async () => {
    await expect(service.messages(gmB, GUEST_A1, {})).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should return an empty history for a guest with no tickets', async () => {
    const res = await service.messages(gmA, guestId(1), {});
    expect(res.data).toEqual([]);
    expect(res.pageInfo.hasMore).toBe(false);
  });
});
