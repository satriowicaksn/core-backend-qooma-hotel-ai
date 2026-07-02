// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Self-contained: spins its own PG, applies migrations, seeds fixtures. Does not
// depend on the (still-stubbed) global test-setup harness. Requires Docker.

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { BusinessRuleError, ForbiddenError, NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { buildTicketsService } from '../index.js';
import { isOverdue } from '../tickets.overdue.js';
import { encodeCursor } from '../tickets.schema.js';
import type { TicketsService } from '../tickets.service.js';

// Fixed reference clock for deterministic overdue/stats assertions.
const NOW = new Date('2026-06-11T12:00:00.000Z');
const PAST_SLA = new Date('2026-06-11T11:00:00.000Z');
const FUTURE_SLA = new Date('2026-06-11T13:00:00.000Z');

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DEPT_1 = '11111111-dddd-4ddd-8ddd-dddddddddddd';
const DEPT_2 = '22222222-dddd-4ddd-8ddd-dddddddddddd';
const DEPT_B = '33333333-dddd-4ddd-8ddd-dddddddddddd';
const GUEST_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GUEST_VVIP = 'dddddddd-cccc-4ccc-8ccc-cccccccccccc';
const USER_1 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const gmA: TenantContext = {
  userId: USER_1,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const gmB: TenantContext = {
  userId: USER_1,
  hotelId: HOTEL_B,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const deptHead1: TenantContext = {
  userId: USER_1,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'dept_head',
  deptId: DEPT_1,
};
const deptHead2: TenantContext = {
  userId: USER_1,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'dept_head',
  deptId: DEPT_2,
};

let container: StartedPostgreSqlContainer;
let db: PrismaClient;
let service: TicketsService;

function ticketId(n: number): string {
  return `ff${String(n).padStart(6, '0')}-ffff-4fff-8fff-ffffffffffff`;
}

async function seed(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });
  await db.user.create({ data: { id: USER_1 } });
  await db.department.createMany({
    data: [
      { id: DEPT_1, hotelId: HOTEL_A, name: 'Housekeeping', code: 'HSK' },
      { id: DEPT_2, hotelId: HOTEL_A, name: 'Front Office', code: 'FO' },
      { id: DEPT_B, hotelId: HOTEL_B, name: 'Other Hotel Dept', code: 'OTH' },
    ],
  });
  await db.guest.createMany({
    data: [
      { id: GUEST_A, hotelId: HOTEL_A, name: 'Budi Santoso', waPhone: '+6281234567890' },
      {
        id: GUEST_VVIP,
        hotelId: HOTEL_A,
        name: 'Rahmat Hidayat',
        waPhone: '+6281999998888',
        email: 'rahmat@example.com',
        privacyMode: 'vvip',
      },
    ],
  });

  // Five HSK tickets in hotel A with strictly increasing createdAt (for cursor order).
  // SLA/status/flag spread for T13: 0,1 overdue · 2 future(not) · 3 high-alert flag
  // · 4 closed+past (terminal → NOT overdue, proves status exclusion).
  const slaByIndex: Record<number, Date | null> = {
    0: PAST_SLA,
    1: PAST_SLA,
    2: FUTURE_SLA,
    3: null,
    4: PAST_SLA,
  };
  for (let i = 0; i < 5; i += 1) {
    await db.ticket.create({
      data: {
        id: ticketId(i),
        hotelId: HOTEL_A,
        ticketNumber: `HSK-2606-00${i}`,
        guestId: GUEST_A,
        departmentId: DEPT_1,
        assignedUserId: USER_1,
        status: i === 4 ? 'closed' : 'open',
        isHighAlert: i === 3,
        slaDueAt: slaByIndex[i] ?? null,
        subject: `Handuk tambahan ${i}`,
        body: `Kamar 120${i} minta handuk`,
        createdAt: new Date(`2026-06-11T07:0${i}:00.000Z`),
      },
    });
  }
  // One FO ticket in hotel A (dept_2), one ticket in hotel B.
  await db.ticket.create({
    data: {
      id: ticketId(90),
      hotelId: HOTEL_A,
      ticketNumber: 'FO-2606-001',
      guestId: GUEST_VVIP,
      departmentId: DEPT_2,
      subject: 'Late checkout',
      body: 'minta perpanjang',
      slaDueAt: PAST_SLA,
      createdAt: new Date('2026-06-11T08:00:00.000Z'),
    },
  });
  await db.ticket.create({
    data: {
      id: ticketId(99),
      hotelId: HOTEL_B,
      ticketNumber: 'HSK-2606-999',
      guestId: GUEST_A,
      departmentId: DEPT_1,
      subject: 'other hotel',
      createdAt: new Date('2026-06-11T09:00:00.000Z'),
    },
  });

  // Audit trail + messages on ticket 0, out of chronological insert order.
  await db.ticketUpdate.createMany({
    data: [
      {
        hotelId: HOTEL_A,
        ticketId: ticketId(0),
        type: 'status_change',
        toStatus: 'in_progress',
        createdAt: new Date('2026-06-11T07:10:00.000Z'),
      },
      {
        hotelId: HOTEL_A,
        ticketId: ticketId(0),
        type: 'note',
        note: 'first',
        createdAt: new Date('2026-06-11T07:05:00.000Z'),
      },
    ],
  });
  await db.ticketMessage.createMany({
    data: [
      {
        hotelId: HOTEL_A,
        ticketId: ticketId(0),
        sender: 'staff',
        body: 'second',
        sentAt: new Date('2026-06-11T07:20:00.000Z'),
      },
      {
        hotelId: HOTEL_A,
        ticketId: ticketId(0),
        sender: 'guest',
        body: 'first',
        sentAt: new Date('2026-06-11T07:15:00.000Z'),
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
  service = buildTicketsService(db);
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.ticketMessage.deleteMany();
  await db.ticketUpdate.deleteMany();
  await db.ticket.deleteMany();
  await db.guest.deleteMany();
  await db.department.deleteMany();
  await db.user.deleteMany();
  await db.hotel.deleteMany();
  await seed();
});

describe('TicketsService.list (integration)', () => {
  it('should return only the caller hotel tickets when role is gm_admin', async () => {
    const res = await service.list(gmA, {});
    expect(res.data).toHaveLength(6);
    expect(res.data.every((t) => t.ticket_number !== 'HSK-2606-999')).toBe(true);
  });

  it('should auto-filter to the own department when role is dept_head', async () => {
    const res = await service.list(deptHead1, {});
    expect(res.data).toHaveLength(5);
    expect(res.data.every((t) => t.department_id === DEPT_1)).toBe(true);
  });

  it('should order by created_at desc and paginate with an opaque cursor', async () => {
    const first = await service.list(deptHead1, { limit: '2' });
    expect(first.data.map((t) => t.ticket_number)).toEqual(['HSK-2606-004', 'HSK-2606-003']);
    expect(first.pageInfo.hasMore).toBe(true);
    expect(first.pageInfo.nextCursor).not.toBeNull();

    const second = await service.list(deptHead1, {
      limit: '2',
      cursor: first.pageInfo.nextCursor,
    });
    expect(second.data.map((t) => t.ticket_number)).toEqual(['HSK-2606-002', 'HSK-2606-001']);

    const third = await service.list(deptHead1, {
      limit: '2',
      cursor: second.pageInfo.nextCursor,
    });
    expect(third.data.map((t) => t.ticket_number)).toEqual(['HSK-2606-000']);
    expect(third.pageInfo.hasMore).toBe(false);
    expect(third.pageInfo.nextCursor).toBeNull();
  });

  it('should filter by the q search term across ticket number and body', async () => {
    const res = await service.list(gmA, { q: '1204' });
    expect(res.data.map((t) => t.ticket_number)).toEqual(['HSK-2606-004']);
  });

  it('should resolve assigned_to as null in dev when the user directory is empty', async () => {
    const res = await service.list(gmA, { q: '1200' });
    expect(res.data[0]?.assigned_user_id).toBe(USER_1);
    expect(res.data[0]?.assigned_to).toBeNull();
  });
});

describe('TicketsService.detail (integration)', () => {
  it('should return updates in created_at asc and messages in sent_at asc order', async () => {
    const res = await service.detail(gmA, ticketId(0));
    expect(res.data.updates.map((u) => u.note ?? u.to_status)).toEqual(['first', 'in_progress']);
    expect(res.data.messages.map((m) => m.body)).toEqual(['first', 'second']);
  });

  it('should mask vvip guest fields for dept_head but not for gm_admin', async () => {
    const masked = await service.detail(deptHead2, ticketId(90));
    expect(masked.data.guest_name).toBe('R***');
    expect(masked.data.guest_email).toBe('r***@example.com');

    const clear = await service.detail(gmA, ticketId(90));
    expect(clear.data.guest_name).toBe('Rahmat Hidayat');
    expect(clear.data.guest_email).toBe('rahmat@example.com');
  });

  it('should raise NotFoundError when the ticket does not exist', async () => {
    await expect(service.detail(gmA, ticketId(500))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should mask a cross-tenant ticket as NotFoundError (404, anti-enumeration)', async () => {
    await expect(service.detail(gmB, ticketId(0))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should mask a cross-department ticket as NotFoundError for a dept_head', async () => {
    await expect(service.detail(deptHead2, ticketId(0))).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should accept a valid cursor produced by encodeCursor without error', async () => {
    const cursor = encodeCursor({ createdAt: '2026-06-11T07:03:00.000Z', id: ticketId(3) });
    const res = await service.list(deptHead1, { cursor, limit: '10' });
    expect(res.data.map((t) => t.ticket_number)).toEqual([
      'HSK-2606-002',
      'HSK-2606-001',
      'HSK-2606-000',
    ]);
  });
});

describe('TicketsService.stats (integration)', () => {
  it('should return status counts + aggregates scoped to the hotel for gm_admin', async () => {
    const res = await service.stats(gmA, NOW);
    expect(res.data.by_status.open).toBe(5); // tickets 0,1,2,3 + FO-90
    expect(res.data.by_status.closed).toBe(1); // ticket 4
    expect(res.data.by_status.high_alert).toBe(0); // no ticket has STATUS high_alert
    expect(res.data.total).toBe(6);
    expect(res.data.overdue).toBe(3); // tickets 0,1 + FO-90 (ticket 4 closed excluded)
    expect(res.data.high_alert_count).toBe(1); // ticket 3 has the FLAG
  });

  it('should scope stats to the own department for dept_head', async () => {
    const res = await service.stats(deptHead1, NOW);
    expect(res.data.total).toBe(5); // dept_1 tickets 0-4 only (FO-90 excluded)
    expect(res.data.overdue).toBe(2); // tickets 0,1
    expect(res.data.high_alert_count).toBe(1);
  });
});

describe('TicketsService.overdue (integration)', () => {
  it('should list overdue tickets ordered by sla_due_at asc with is_overdue=true', async () => {
    const res = await service.overdue(gmA, { limit: '10' }, NOW);
    expect(res.data.map((t) => t.ticket_number)).toEqual([
      'HSK-2606-000',
      'HSK-2606-001',
      'FO-2606-001',
    ]);
    expect(res.data.every((t) => t.is_overdue)).toBe(true);
    expect(res.pageInfo.hasMore).toBe(false);
  });

  it('should top-N paginate overdue with hasMore', async () => {
    const res = await service.overdue(gmA, { limit: '2' }, NOW);
    expect(res.data).toHaveLength(2);
    expect(res.pageInfo.hasMore).toBe(true);
    expect(res.pageInfo.nextCursor).toBeNull();
  });

  it('should exclude terminal-status tickets even when past SLA', async () => {
    const res = await service.overdue(gmA, { limit: '50' }, NOW);
    expect(res.data.map((t) => t.ticket_number)).not.toContain('HSK-2606-004');
  });

  it('should agree with the isOverdue row predicate (SSOT coherence)', async () => {
    const allRows = await db.ticket.findMany({ where: { hotelId: HOTEL_A } });
    const expectedIds = allRows
      .filter((r) => isOverdue(r, NOW))
      .map((r) => r.id)
      .sort();
    const res = await service.overdue(gmA, { limit: '100' }, NOW);
    const listedIds = res.data.map((t) => t.id).sort();
    expect(listedIds).toEqual(expectedIds);
  });
});

describe('TicketsService.updateStatus (integration)', () => {
  it('should transition status and write an audit row with the actor', async () => {
    const res = await service.updateStatus(gmA, ticketId(1), {
      status: 'in_progress',
      note: 'on it',
    });
    expect(res.data.status).toBe('in_progress');
    const audit = res.data.updates.find((u) => u.type === 'status_change');
    expect(audit?.to_status).toBe('in_progress');
    expect(audit?.from_status).toBe('open');
    expect(audit?.actor_user_id).toBe(USER_1);
    expect(audit?.note).toBe('on it');
  });

  it('should reject an invalid transition with 422 and write no audit row', async () => {
    await expect(
      service.updateStatus(gmA, ticketId(3), { status: 'closed' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    const fresh = await service.detail(gmA, ticketId(3));
    expect(fresh.data.status).toBe('open');
    expect(fresh.data.updates).toHaveLength(0);
  });

  it('should let a dept_head transition an own-dept ticket', async () => {
    const res = await service.updateStatus(deptHead1, ticketId(1), { status: 'in_progress' });
    expect(res.data.status).toBe('in_progress');
  });

  it('should 404 a cross-tenant status update', async () => {
    await expect(
      service.updateStatus(gmB, ticketId(1), { status: 'in_progress' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('TicketsService.reroute (integration)', () => {
  it('should reroute and write a reroute audit row', async () => {
    const res = await service.reroute(gmA, ticketId(1), { department_id: DEPT_2 });
    expect(res.data.department_id).toBe(DEPT_2);
    const audit = res.data.updates.find((u) => u.type === 'reroute');
    expect(audit?.actor_user_id).toBe(USER_1);
  });

  it('should 403 when a dept_head attempts a reroute', async () => {
    await expect(
      service.reroute(deptHead1, ticketId(1), { department_id: DEPT_2 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('should 404 when rerouting to a cross-hotel department', async () => {
    await expect(
      service.reroute(gmA, ticketId(1), { department_id: DEPT_B }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
