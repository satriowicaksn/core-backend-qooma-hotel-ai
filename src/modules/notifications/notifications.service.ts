// Service: strict per-user scope (NT1) + list/unread-count/mark-read/mark-all.
// A notification is PERSONAL — every query is scoped to ctx.userId + ctx.hotelId,
// with NO super_admin bypass. Consumes T03/DEP-5 TenantContext (userId).

import type { Prisma } from '@prisma/client';

import { NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { NotificationsRepository } from './notifications.repository.js';
import { encodeCursor, parseNotificationsQuery } from './notifications.schema.js';
import { serializeNotification } from './notifications.serializer.js';
import type {
  MarkAllResponse,
  NotificationCursor,
  NotificationListFilters,
  NotificationListResponse,
  NotificationResponse,
  UnreadCountResponse,
} from './notifications.types.js';

// Per-user scope + optional is_read filter + cursor keyset (N1 OR-decomposition in
// its own AND arm). NO super_admin bypass — notifications are personal.
export function buildNotificationWhere(
  ctx: TenantContext,
  filters: NotificationListFilters,
  cursor?: NotificationCursor,
): Prisma.NotificationWhereInput {
  const and: Prisma.NotificationWhereInput[] = [{ userId: ctx.userId, hotelId: ctx.hotelId }];
  if (filters.isRead !== undefined) {
    and.push({ isRead: filters.isRead });
  }
  if (cursor) {
    const createdAt = new Date(cursor.createdAt);
    and.push({
      OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: cursor.id } }],
    });
  }
  return { AND: and };
}

export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  async list(ctx: TenantContext, rawQuery: unknown): Promise<NotificationListResponse> {
    // No hotel scope (e.g. super_admin, hotelId null) → empty valid page.
    if (!ctx.hotelId) {
      return { data: [], pageInfo: { nextCursor: null, hasMore: false } };
    }
    const query = parseNotificationsQuery(rawQuery);
    const where = buildNotificationWhere(ctx, query.filters, query.cursor);
    const rows = await this.repo.findMany(where, query.limit + 1);

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    return { data: page.map(serializeNotification), pageInfo: { nextCursor, hasMore } };
  }

  async unreadCount(ctx: TenantContext): Promise<UnreadCountResponse> {
    // No hotel scope (e.g. super_admin, hotelId null) → zero count.
    if (!ctx.hotelId) {
      return { data: { count: 0 } };
    }
    const count = await this.repo.countWhere({
      userId: ctx.userId,
      hotelId: ctx.hotelId,
      isRead: false,
    });
    return { data: { count } };
  }

  async markRead(ctx: TenantContext, id: string): Promise<NotificationResponse> {
    await this.repo.markOneRead(id, ctx.userId, ctx.hotelId);
    // Ownership + existence: a notification not owned by ctx.userId → 404 (not 403).
    // Idempotent: already-read owned rows are found here and returned 200.
    const row = await this.repo.findOwned(id, ctx.userId, ctx.hotelId);
    if (!row) {
      throw new NotFoundError('Notification', id);
    }
    return { data: serializeNotification(row) };
  }

  async markAllRead(ctx: TenantContext): Promise<MarkAllResponse> {
    const updated = await this.repo.markAllRead(ctx.userId, ctx.hotelId);
    return { data: { updated } };
  }
}
