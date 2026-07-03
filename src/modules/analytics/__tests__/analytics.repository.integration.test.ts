// Integration: real Postgres via testcontainers.
// Crux (T30): $queryRaw aggregations over the Slot B tickets table produce
// the KPI values the serializer expects. Tenant isolation via hotel_id filter.

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type Prisma, PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import type { Logger } from '@core/logger/logger.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { AnalyticsService } from '../analytics.service.js';
import { buildAnalyticsService } from '../index.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_A = '1111aaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A_1 = 'd1111aaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_A_2 = 'd2222aaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_B = 'd3333bbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const GUEST_A = 'a1111111-1111-4111-8111-111111111111';
const GUEST_B = 'b2222222-2222-4222-8222-222222222222';

const gmA: TenantContext = {
  userId: USER_A,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const gmB: TenantContext = {
  userId: '2222bbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  hotelId: HOTEL_B,
  isSuperAdmin: false,
  role: 'gm_admin',
};

let container: StartedPostgreSqlContainer;
let db: PrismaClient;
let service: AnalyticsService;

function silentLogger(): Logger {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

// Seed varied tickets across dates + statuses + departments + high-alert
// flags for HOTEL_A; a minimal set for HOTEL_B to verify isolation.
async function seed(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });
  await db.department.createMany({
    data: [
      { id: DEPT_A_1, hotelId: HOTEL_A, name: 'Housekeeping A1', code: 'HSK' },
      { id: DEPT_A_2, hotelId: HOTEL_A, name: 'Front Office A2', code: 'FO' },
      { id: DEPT_B, hotelId: HOTEL_B, name: 'Housekeeping B', code: 'HSK' },
    ],
  });
  await db.guest.createMany({
    data: [
      { id: GUEST_A, hotelId: HOTEL_A, name: 'Guest A', waPhone: '+6281111111111' },
      { id: GUEST_B, hotelId: HOTEL_B, name: 'Guest B', waPhone: '+6282222222222' },
    ],
  });

  // HOTEL_A current period (2026-06-01 → 2026-06-30):
  //   DEPT_A_1: 10 tickets, 2 high-alert, 8 closed with satisfaction 4,5
  //   DEPT_A_2: 5 tickets, 1 high-alert, 3 closed with satisfaction 3
  // HOTEL_A prev period (2026-05-01 → 2026-05-31):
  //   DEPT_A_1: 5 tickets, 0 high-alert
  //   DEPT_A_2: 5 tickets, 0 high-alert
  const items: Prisma.TicketUncheckedCreateInput[] = [];
  let seq = 0;
  const push = (
    dept: string,
    createdAt: Date,
    isHigh: boolean,
    status: string,
    closedAt: Date | null,
    satisfaction: number | null,
  ): void => {
    seq += 1;
    const id = `f0000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
    items.push({
      id,
      hotelId: HOTEL_A,
      ticketNumber: `HSK-2606-${String(seq).padStart(3, '0')}`,
      guestId: GUEST_A,
      departmentId: dept,
      subject: 'x',
      status,
      isHighAlert: isHigh,
      resolvedSatisfaction: satisfaction,
      createdAt,
      ...(closedAt ? { closedAt } : {}),
    });
  };

  // 10 DEPT_A_1 current
  for (let i = 0; i < 10; i += 1) {
    const created = new Date(`2026-06-${String(i + 5).padStart(2, '0')}T09:00:00.000Z`);
    const isHigh = i < 2;
    const closed = i < 8 ? new Date(created.getTime() + 30 * 60 * 1000) : null;
    push(DEPT_A_1, created, isHigh, closed ? 'closed' : 'open', closed, i < 8 ? 4 : null);
  }
  // 5 DEPT_A_2 current
  for (let i = 0; i < 5; i += 1) {
    const created = new Date(`2026-06-${String(i + 10).padStart(2, '0')}T10:00:00.000Z`);
    const isHigh = i === 0;
    const closed = i < 3 ? new Date(created.getTime() + 60 * 60 * 1000) : null;
    push(DEPT_A_2, created, isHigh, closed ? 'closed' : 'open', closed, i < 3 ? 3 : null);
  }
  // 5 DEPT_A_1 prev period
  for (let i = 0; i < 5; i += 1) {
    const created = new Date(`2026-05-${String(i + 5).padStart(2, '0')}T09:00:00.000Z`);
    push(DEPT_A_1, created, false, 'closed', new Date(created.getTime() + 30 * 60 * 1000), 5);
  }
  // 5 DEPT_A_2 prev period
  for (let i = 0; i < 5; i += 1) {
    const created = new Date(`2026-05-${String(i + 10).padStart(2, '0')}T10:00:00.000Z`);
    push(DEPT_A_2, created, false, 'closed', new Date(created.getTime() + 30 * 60 * 1000), 5);
  }

  await db.ticket.createMany({ data: items });

  // HOTEL_B: 1 ticket for tenant-isolation proof.
  await db.ticket.create({
    data: {
      id: 'fbbb0000-0000-4000-8000-000000000001',
      hotelId: HOTEL_B,
      ticketNumber: 'HSK-2606-001',
      guestId: GUEST_B,
      departmentId: DEPT_B,
      subject: 'B ticket',
      status: 'closed',
      isHighAlert: true,
      resolvedSatisfaction: 5,
      createdAt: new Date('2026-06-15T00:00:00.000Z'),
      closedAt: new Date('2026-06-15T01:00:00.000Z'),
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
  service = buildAnalyticsService(db, {
    logger: silentLogger(),
    skipCrossDbChecks: true,
    nodeEnv: 'development',
  });
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.ticket.deleteMany();
  await db.guest.deleteMany();
  await db.department.deleteMany();
  await db.hotel.deleteMany();
  await seed();
});

const currentQuery = {
  from: new Date('2026-06-01T00:00:00.000Z'),
  to: new Date('2026-06-30T23:59:59.999Z'),
  period: 'day' as const,
};

describe('AnalyticsService.overview (integration)', () => {
  it('should aggregate KPIs across current period for HOTEL_A', async () => {
    const res = await service.overview(gmA, currentQuery);
    // 10 + 5 = 15 tickets total.
    expect(res.data.total_tickets).toBe(15);
    // 8 (DEPT_A_1 closed) + 3 (DEPT_A_2 closed) = 11 closed.
    expect(res.data.resolution_rate).toBeCloseTo(11 / 15, 4);
    // Avg satisfaction: 8 × 4 + 3 × 3 = 41 / 11 ≈ 3.73.
    expect(res.data.avg_satisfaction).toBe('3.73');
    // Every closed ticket has 30 or 60 min diff. Avg mix depends on ratio;
    // just assert nonnull + positive.
    const rt = res.data.avg_response_time_minutes;
    expect(rt).not.toBeNull();
    expect(rt as number).toBeGreaterThan(0);
    // Meta three-state
    expect(res.meta.tier).toBeNull();
    expect(res.meta.is_luxury_gate).toBeNull();
  });

  it('should isolate HOTEL_A from HOTEL_B in overview', async () => {
    const res = await service.overview(gmB, currentQuery);
    expect(res.data.total_tickets).toBe(1);
    expect(res.data.avg_satisfaction).toBe('5.00');
  });

  it('should return zero-values on an empty range', async () => {
    const res = await service.overview(gmA, {
      from: new Date('2020-01-01T00:00:00.000Z'),
      to: new Date('2020-12-31T00:00:00.000Z'),
      period: 'day' as const,
    });
    expect(res.data.total_tickets).toBe(0);
    expect(res.data.resolution_rate).toBeNull();
    expect(res.data.avg_satisfaction).toBeNull();
    expect(res.data.avg_response_time_minutes).toBeNull();
  });
});

describe('AnalyticsService.tickets (integration)', () => {
  it('should return daily buckets across the range', async () => {
    const res = await service.tickets(gmA, currentQuery);
    expect(res.data.length).toBeGreaterThan(0);
    // Every entry has ISO date + positive count.
    for (const bucket of res.data) {
      expect(bucket.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(bucket.count).toBeGreaterThan(0);
    }
    // Total across buckets = 15 (10 + 5 = current HOTEL_A tickets).
    const total = res.data.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(15);
  });

  it('should isolate HOTEL_B', async () => {
    const res = await service.tickets(gmB, currentQuery);
    const total = res.data.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(1);
  });
});

describe('AnalyticsService.highAlert (integration)', () => {
  it('should compute per-dept rates + summary for HOTEL_A', async () => {
    const res = await service.highAlert(gmA, currentQuery);
    expect(res.data.length).toBe(2); // 2 depts in HOTEL_A with tickets
    // Every dept wire has salah_kamar_count=null (PM ACK #3).
    for (const dept of res.data) {
      expect(dept.salah_kamar_count).toBeNull();
    }
    // At least one dept has current_period_rate > 0 (2 of 10 or 1 of 5).
    expect(res.data.some((d) => d.current_period_rate > 0)).toBe(true);
    // alert_summary.recommendation_key is one of the 5 enum values.
    expect(
      [
        'all_departments_healthy',
        'single_dept_spike',
        'multi_dept_concern',
        'cross_dept_pattern',
        'systemic_alert',
      ].includes(res.alert_summary.recommendation_key),
    ).toBe(true);
  });

  it('should include trend_7d (last 7 days ending at `to`)', async () => {
    const res = await service.highAlert(gmA, currentQuery);
    // Every dept shares the same trend_7d (global slice-1 approximation).
    const trend = res.data[0]?.trend_7d ?? [];
    expect(trend.length).toBeLessThanOrEqual(7);
    // Non-negative counts.
    for (const bucket of trend) {
      expect(bucket.count).toBeGreaterThanOrEqual(0);
    }
  });
});
