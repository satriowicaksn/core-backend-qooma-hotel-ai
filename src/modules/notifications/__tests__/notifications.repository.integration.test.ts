// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Self-contained: spins its own PG, applies migrations, seeds fixtures. Requires Docker.
// The crux (NT1): per-user isolation — user A must never see/mutate user B's rows.

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { buildNotificationsService } from '../index.js';
import type { NotificationsService } from '../notifications.service.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_A1 = '1111aaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_A2 = '2222aaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B1 = '3333bbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const a1: TenantContext = {
  userId: USER_A1,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const a2: TenantContext = {
  userId: USER_A2,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'dept_head',
  deptId: 'd1',
};
const b1: TenantContext = {
  userId: USER_B1,
  hotelId: HOTEL_B,
  isSuperAdmin: false,
  role: 'gm_admin',
};

let container: StartedPostgreSqlContainer;
let db: PrismaClient;
let service: NotificationsService;

function notifId(n: number): string {
  return `ffff${String(n).padStart(4, '0')}-ffff-4fff-8fff-ffffffffffff`;
}

async function seed(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });
  await db.user.createMany({ data: [{ id: USER_A1 }, { id: USER_A2 }, { id: USER_B1 }] });

  // A1: 3 notifications (2 unread, 1 read), increasing createdAt.
  const rows = [
    { id: notifId(0), hotelId: HOTEL_A, userId: USER_A1, isRead: false },
    { id: notifId(1), hotelId: HOTEL_A, userId: USER_A1, isRead: false },
    { id: notifId(2), hotelId: HOTEL_A, userId: USER_A1, isRead: true },
    // A2: 2 unread (must be invisible to A1).
    { id: notifId(3), hotelId: HOTEL_A, userId: USER_A2, isRead: false },
    { id: notifId(4), hotelId: HOTEL_A, userId: USER_A2, isRead: false },
    // B1: 1 unread (other hotel).
    { id: notifId(5), hotelId: HOTEL_B, userId: USER_B1, isRead: false },
  ];
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    if (!r) continue;
    await db.notification.create({
      data: {
        id: r.id,
        hotelId: r.hotelId,
        userId: r.userId,
        type: 'ticket_created',
        title: `Notif ${i}`,
        isRead: r.isRead,
        readAt: r.isRead ? new Date('2026-06-10T00:00:00.000Z') : null,
        createdAt: new Date(`2026-06-11T07:0${i}:00.000Z`),
      },
    });
  }
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine').start();
  const url = container.getConnectionUri();
  execFileSync('pnpm', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
  db = new PrismaClient({ datasources: { db: { url } } });
  service = buildNotificationsService(db);
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.notification.deleteMany();
  await db.user.deleteMany();
  await db.hotel.deleteMany();
  await seed();
});

describe('NotificationsService per-user isolation (integration)', () => {
  it('should list only the current user own notifications', async () => {
    const res = await service.list(a1, { limit: '50' });
    expect(res.data).toHaveLength(3);
    expect(res.data.every((n) => n.user_id === USER_A1)).toBe(true);
  });

  it('should filter by is_read within the user scope', async () => {
    const unread = await service.list(a1, { is_read: 'false' });
    expect(unread.data.map((n) => n.id).sort()).toEqual([notifId(0), notifId(1)].sort());
  });

  it('should cursor-paginate newest-first within the user scope', async () => {
    const first = await service.list(a1, { limit: '2' });
    expect(first.data.map((n) => n.id)).toEqual([notifId(2), notifId(1)]);
    expect(first.pageInfo.hasMore).toBe(true);
    const second = await service.list(a1, { limit: '2', cursor: first.pageInfo.nextCursor });
    expect(second.data.map((n) => n.id)).toEqual([notifId(0)]);
    expect(second.pageInfo.hasMore).toBe(false);
  });

  it('should count only the current user unread notifications', async () => {
    expect((await service.unreadCount(a1)).data.count).toBe(2);
    expect((await service.unreadCount(a2)).data.count).toBe(2);
    expect((await service.unreadCount(b1)).data.count).toBe(1);
  });

  it('should mark one own notification read (idempotent, preserves read_at)', async () => {
    const first = await service.markRead(a1, notifId(0));
    expect(first.data.is_read).toBe(true);
    const readAt = first.data.read_at;
    const second = await service.markRead(a1, notifId(0));
    expect(second.data.read_at).toBe(readAt); // unchanged on re-read
  });

  it("should 404 (no-mutate) when marking another user's notification read", async () => {
    // A1 tries to mark A2's notification (same hotel).
    await expect(service.markRead(a1, notifId(3))).rejects.toBeInstanceOf(NotFoundError);
    const row = await db.notification.findUnique({ where: { id: notifId(3) } });
    expect(row?.isRead).toBe(false);
  });

  it("should mark-all-read only the current user unread (not another user's)", async () => {
    const res = await service.markAllRead(a1);
    expect(res.data.updated).toBe(2); // A1 had 2 unread
    // A2's unread untouched.
    const a2Unread = await db.notification.count({ where: { userId: USER_A2, isRead: false } });
    expect(a2Unread).toBe(2);
    // Idempotent: a second mark-all flips nothing.
    expect((await service.markAllRead(a1)).data.updated).toBe(0);
  });

  it('should not see notifications from another hotel', async () => {
    const res = await service.list(b1, { limit: '50' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.id).toBe(notifId(5));
  });
});
