import { describe, expect, it } from '@jest/globals';

import { NotFoundError, ValidationError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { NotificationsRepository } from '../notifications.repository.js';
import { decodeCursor, encodeCursor, parseNotificationsQuery } from '../notifications.schema.js';
import { serializeNotification } from '../notifications.serializer.js';
import { buildNotificationWhere, NotificationsService } from '../notifications.service.js';
import type { NotificationRow } from '../notifications.types.js';

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: 'user-1',
    hotelId: 'hotel-1',
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function makeRow(overrides: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: 'notif-1',
    hotelId: 'hotel-1',
    userId: 'user-1',
    type: 'ticket_created',
    title: 'Tiket baru',
    body: 'Handuk kamar 1204',
    link: '/tickets/x',
    metadata: {},
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-06-11T07:00:00.000Z'),
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<NotificationsRepository>): NotificationsRepository {
  return {
    findMany: () => Promise.resolve([]),
    countWhere: () => Promise.resolve(0),
    findOwned: () => Promise.resolve(null),
    markOneRead: () => Promise.resolve(1),
    markAllRead: () => Promise.resolve(0),
    ...overrides,
  } as unknown as NotificationsRepository;
}

describe('buildNotificationWhere (per-user scope)', () => {
  it('should always scope by userId AND hotelId (no super_admin bypass)', () => {
    const where = buildNotificationWhere(ctx({ isSuperAdmin: true, role: 'super_admin' }), {});
    expect(where.AND).toContainEqual({ userId: 'user-1', hotelId: 'hotel-1' });
  });

  it('should add an is_read arm when the filter is present', () => {
    const where = buildNotificationWhere(ctx(), { isRead: false });
    expect(where.AND).toContainEqual({ isRead: false });
  });

  it('should add the cursor keyset OR in its own arm', () => {
    const now = new Date('2026-06-11T07:00:00.000Z');
    const where = buildNotificationWhere(
      ctx(),
      {},
      {
        createdAt: '2026-06-11T07:00:00.000Z',
        id: 'notif-1',
      },
    );
    expect(where.AND).toContainEqual({
      OR: [{ createdAt: { lt: now } }, { createdAt: now, id: { lt: 'notif-1' } }],
    });
  });
});

describe('cursor codec + parseNotificationsQuery', () => {
  it('should round-trip a cursor', () => {
    const c = { createdAt: '2026-06-11T07:00:00.000Z', id: '11111111-1111-4111-8111-111111111111' };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });

  it('should throw ValidationError on a malformed cursor', () => {
    expect(() => decodeCursor('nope')).toThrow(ValidationError);
  });

  it('should default limit to 20 and clamp to 100', () => {
    expect(parseNotificationsQuery({}).limit).toBe(20);
    expect(parseNotificationsQuery({ limit: '500' }).limit).toBe(100);
  });

  it('should parse the is_read flag', () => {
    expect(parseNotificationsQuery({ is_read: 'false' }).filters.isRead).toBe(false);
    expect(parseNotificationsQuery({ is_read: 'true' }).filters.isRead).toBe(true);
  });
});

describe('serializeNotification', () => {
  it('should include hotel_id + user_id and snake_case the row', () => {
    expect(
      serializeNotification(makeRow({ readAt: new Date('2026-06-11T08:00:00.000Z') })),
    ).toEqual({
      id: 'notif-1',
      hotel_id: 'hotel-1',
      user_id: 'user-1',
      type: 'ticket_created',
      title: 'Tiket baru',
      body: 'Handuk kamar 1204',
      link: '/tickets/x',
      metadata: {},
      is_read: false,
      read_at: '2026-06-11T08:00:00.000Z',
      created_at: '2026-06-11T07:00:00.000Z',
    });
  });
});

describe('NotificationsService', () => {
  it('should paginate the list and emit a nextCursor when more remain', async () => {
    const rows = [makeRow({ id: 'n1' }), makeRow({ id: 'n2' })];
    const service = new NotificationsService(
      fakeRepo({ findMany: (_w, take: number) => Promise.resolve(rows.slice(0, take)) }),
    );
    const res = await service.list(ctx(), { limit: '1' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.id).toBe('n1');
    expect(res.pageInfo.hasMore).toBe(true);
    expect(res.pageInfo.nextCursor).not.toBeNull();
  });

  it('should return the unread count in the ratified envelope', async () => {
    const service = new NotificationsService(fakeRepo({ countWhere: () => Promise.resolve(7) }));
    expect(await service.unreadCount(ctx())).toEqual({ data: { count: 7 } });
  });

  it('should mark one read and return the notification', async () => {
    const service = new NotificationsService(
      fakeRepo({ findOwned: () => Promise.resolve(makeRow({ isRead: true })) }),
    );
    const res = await service.markRead(ctx(), 'notif-1');
    expect(res.data.is_read).toBe(true);
  });

  it('should 404 markRead when the notification is not owned', async () => {
    const service = new NotificationsService(fakeRepo({ findOwned: () => Promise.resolve(null) }));
    await expect(service.markRead(ctx(), 'notif-x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should return the updated count from mark-all-read', async () => {
    const service = new NotificationsService(fakeRepo({ markAllRead: () => Promise.resolve(3) }));
    expect(await service.markAllRead(ctx())).toEqual({ data: { updated: 3 } });
  });
});
