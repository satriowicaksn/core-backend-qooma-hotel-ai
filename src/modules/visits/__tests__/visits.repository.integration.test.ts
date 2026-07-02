// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Self-contained: spins its own PG, applies migrations, seeds fixtures. Does not
// depend on the (still-stubbed) global test-setup harness. Requires Docker.
//
// Covers V1 (list read-path) + V2–V5 (verify-manual tx atomicity, transition
// guard, tenant-404) against real Postgres.

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { BusinessRuleError, NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { buildVisitsService } from '../index.js';
import type { VisitsService } from '../visits.service.js';
import type { VisitStatus } from '../visits.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const GUEST_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GUEST_B = 'dddddddd-cccc-4ccc-8ccc-cccccccccccc';

const gmA: TenantContext = {
  userId: 'user-a',
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const gmB: TenantContext = {
  userId: 'user-b',
  hotelId: HOTEL_B,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const superAdmin: TenantContext = {
  userId: 'user-s',
  hotelId: HOTEL_A,
  isSuperAdmin: true,
  role: 'super_admin',
};

let container: StartedPostgreSqlContainer;
let db: PrismaClient;
let service: VisitsService;

function visitId(n: number): string {
  return `ff${String(n).padStart(6, '0')}-ffff-4fff-8fff-ffffffffffff`;
}

// Hotel A: 5 visits with a spread of statuses + increasing createdAt.
// Hotel B: 1 visit (proves tenant isolation).
const STATUSES_A: VisitStatus[] = [
  'pending_verification',
  'pending_verification',
  'checked_in',
  'failed_verification',
  'checked_out',
];

async function seed(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });
  await db.guest.createMany({
    data: [
      { id: GUEST_A, hotelId: HOTEL_A, name: 'Budi Santoso', waPhone: '+6281234567890' },
      { id: GUEST_B, hotelId: HOTEL_B, name: 'Other Hotel', waPhone: '+6289999998888' },
    ],
  });
  for (let i = 0; i < STATUSES_A.length; i += 1) {
    await db.visit.create({
      data: {
        id: visitId(i),
        hotelId: HOTEL_A,
        guestId: GUEST_A,
        checkIn: new Date(`2026-06-11T0${i}:00:00.000Z`),
        status: STATUSES_A[i] as string,
        createdAt: new Date(`2026-06-11T07:0${i}:00.000Z`),
      },
    });
  }
  await db.visit.create({
    data: {
      id: visitId(99),
      hotelId: HOTEL_B,
      guestId: GUEST_B,
      checkIn: new Date('2026-06-11T09:00:00.000Z'),
      status: 'pending_verification',
      createdAt: new Date('2026-06-11T09:00:00.000Z'),
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
  service = buildVisitsService(db);
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.visit.deleteMany();
  await db.guest.deleteMany();
  await db.hotel.deleteMany();
  await seed();
});

describe('VisitsService.list (integration)', () => {
  it('should return only the caller hotel visits when role is gm_admin', async () => {
    const res = await service.list(gmA, {});
    expect(res.data).toHaveLength(5);
    expect(res.data.every((v) => v.guest_id === GUEST_A)).toBe(true);
    expect(res.pageInfo.total).toBe(5);
  });

  it('should not see other-hotel visits (tenant isolation)', async () => {
    const res = await service.list(gmB, {});
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.id).toBe(visitId(99));
  });

  it('should return all hotels when caller is super_admin', async () => {
    const res = await service.list(superAdmin, {});
    expect(res.pageInfo.total).toBe(6);
  });

  it('should filter by a single status', async () => {
    const res = await service.list(gmA, { status: 'pending_verification' });
    expect(res.data).toHaveLength(2);
    expect(res.data.every((v) => v.status === 'pending_verification')).toBe(true);
  });

  it('should filter by a CSV of statuses', async () => {
    const res = await service.list(gmA, { status: 'checked_in,failed_verification' });
    expect(res.data.map((v) => v.status).sort()).toEqual(['checked_in', 'failed_verification']);
  });

  it('should order by created_at desc and page with offset', async () => {
    const first = await service.list(gmA, { page: '1', pageSize: '2' });
    expect(first.data.map((v) => v.id)).toEqual([visitId(4), visitId(3)]);
    expect(first.pageInfo).toEqual({ page: 1, pageSize: 2, total: 5, hasMore: true });

    const second = await service.list(gmA, { page: '2', pageSize: '2' });
    expect(second.data.map((v) => v.id)).toEqual([visitId(2), visitId(1)]);
    expect(second.pageInfo.hasMore).toBe(true);

    const third = await service.list(gmA, { page: '3', pageSize: '2' });
    expect(third.data.map((v) => v.id)).toEqual([visitId(0)]);
    expect(third.pageInfo.hasMore).toBe(false);
  });

  it('should serialize the canonical 13-field Visit shape', async () => {
    const res = await service.list(gmB, {});
    const wire = res.data[0];
    expect(Object.keys(wire ?? {}).sort()).toEqual(
      [
        'booking_source',
        'check_in',
        'check_out',
        'created_at',
        'guest_id',
        'id',
        'nights',
        'room_number',
        'satisfaction_score',
        'special_request',
        'status',
        'updated_at',
        'verification_attempts',
      ].sort(),
    );
  });
});

describe('VisitsService.verifyManual (integration)', () => {
  // visit 0 = pending_verification, check_in 2026-06-11T00:00:00Z.
  it('should approve a pending visit → checked_in with derived checkout persisted', async () => {
    const res = await service.verifyManual(gmA, visitId(0), {
      guest_name: 'Budi Santoso',
      room_number: '1204',
      nights: 2,
    });
    expect(res.data.status).toBe('checked_in');
    expect(res.data.room_number).toBe('1204');
    expect(res.data.nights).toBe(2);
    expect(res.data.check_out).toBe('2026-06-13T11:00:00.000Z');

    const row = await db.visit.findUnique({ where: { id: visitId(0) } });
    expect(row?.status).toBe('checked_in');
    expect(row?.checkOut?.toISOString()).toBe('2026-06-13T11:00:00.000Z');
  });

  it('should reject a pending visit → rejected without setting room/nights/checkout', async () => {
    const res = await service.verifyManual(gmA, visitId(1), { action: 'reject' });
    expect(res.data.status).toBe('rejected');
    expect(res.data.room_number).toBeNull();
    expect(res.data.check_out).toBeNull();
  });

  it('should reject a non-pending visit with BusinessRuleError (422) and not mutate it', async () => {
    // visit 2 = checked_in.
    await expect(
      service.verifyManual(gmA, visitId(2), { action: 'reject' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    const row = await db.visit.findUnique({ where: { id: visitId(2) } });
    expect(row?.status).toBe('checked_in');
  });

  it('should mask a cross-tenant visit as NotFoundError (404) and leave it untouched', async () => {
    // visit 99 belongs to hotel B; gmA must not resolve it.
    await expect(
      service.verifyManual(gmA, visitId(99), { action: 'reject' }),
    ).rejects.toBeInstanceOf(NotFoundError);
    const row = await db.visit.findUnique({ where: { id: visitId(99) } });
    expect(row?.status).toBe('pending_verification');
  });

  it('should raise NotFoundError when the visit does not exist', async () => {
    await expect(
      service.verifyManual(gmA, visitId(500), { action: 'reject' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('VisitsService.reject (integration)', () => {
  it('should reject a pending visit → rejected (dedicated endpoint, no body)', async () => {
    const res = await service.reject(gmA, visitId(0));
    expect(res.data.status).toBe('rejected');
    const row = await db.visit.findUnique({ where: { id: visitId(0) } });
    expect(row?.status).toBe('rejected');
  });

  it('should 422 rejecting a non-pending visit and not mutate it', async () => {
    // visit 2 = checked_in.
    await expect(service.reject(gmA, visitId(2))).rejects.toBeInstanceOf(BusinessRuleError);
    const row = await db.visit.findUnique({ where: { id: visitId(2) } });
    expect(row?.status).toBe('checked_in');
  });

  it('should 404 a cross-tenant reject and leave it untouched', async () => {
    await expect(service.reject(gmA, visitId(99))).rejects.toBeInstanceOf(NotFoundError);
    const row = await db.visit.findUnique({ where: { id: visitId(99) } });
    expect(row?.status).toBe('pending_verification');
  });
});

describe('VisitsService.approveManual (integration)', () => {
  // visit 3 = failed_verification, check_in 2026-06-11T03:00:00Z.
  it('should approve a failed_verification visit → checked_in with derived checkout', async () => {
    const res = await service.approveManual(gmA, visitId(3), {
      guest_name: 'Budi Santoso',
      room_number: '1210',
      nights: 2,
    });
    expect(res.data.status).toBe('checked_in');
    expect(res.data.room_number).toBe('1210');
    expect(res.data.check_out).toBe('2026-06-13T11:00:00.000Z');
    const row = await db.visit.findUnique({ where: { id: visitId(3) } });
    expect(row?.status).toBe('checked_in');
  });

  it('should approve without nights (checkout stays null)', async () => {
    const res = await service.approveManual(gmA, visitId(3), {
      guest_name: 'Budi Santoso',
      room_number: '1210',
    });
    expect(res.data.status).toBe('checked_in');
    expect(res.data.check_out).toBeNull();
    expect(res.data.nights).toBeNull();
  });

  it('should 422 approve-manual on a non-failed source and not mutate it', async () => {
    // visit 0 = pending_verification (must use verify-manual, not approve-manual).
    await expect(
      service.approveManual(gmA, visitId(0), { guest_name: 'B', room_number: '1' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    const row = await db.visit.findUnique({ where: { id: visitId(0) } });
    expect(row?.status).toBe('pending_verification');
  });

  it('should 404 a cross-tenant approve-manual', async () => {
    await expect(
      service.approveManual(gmA, visitId(99), { guest_name: 'B', room_number: '1' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('VisitsService.create (integration)', () => {
  it('should create a pending_verification visit for an own-tenant guest', async () => {
    const before = await db.visit.count({ where: { hotelId: HOTEL_A } });
    const res = await service.create(gmA, {
      guest_id: GUEST_A,
      check_in: '2026-06-20T06:00:00.000Z',
      nights: 3,
      room_number: '1501',
      booking_source: 'direct',
      special_request: 'high floor',
    });
    expect(res.data.status).toBe('pending_verification');
    expect(res.data.room_number).toBe('1501');
    expect(res.data.special_request).toBe('high floor');
    expect(res.data.check_out).toBeNull(); // not set on create

    const row = await db.visit.findUnique({ where: { id: res.data.id } });
    expect(row?.hotelId).toBe(HOTEL_A);
    expect(row?.guestId).toBe(GUEST_A);
    expect(row?.specialRequest).toBe('high floor');
    const after = await db.visit.count({ where: { hotelId: HOTEL_A } });
    expect(after).toBe(before + 1);
  });

  it('should 404 (no-create) for a cross-tenant guest', async () => {
    const before = await db.visit.count();
    // GUEST_B belongs to hotel B; gmA must not create against it.
    await expect(
      service.create(gmA, { guest_id: GUEST_B, check_in: '2026-06-20T06:00:00.000Z' }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await db.visit.count()).toBe(before);
  });

  it('should 404 (no-create) for a non-existent guest', async () => {
    await expect(
      service.create(gmA, {
        guest_id: '99999999-9999-4999-8999-999999999999',
        check_in: '2026-06-20T06:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should reject an invalid body (missing check_in) with ValidationError', async () => {
    await expect(service.create(gmA, { guest_id: GUEST_A })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
