// Repository: Prisma direct (no interface — ADR-0001).

import type { Prisma, PrismaClient } from '@prisma/client';

import type { NotificationRow } from './notifications.types.js';

export class NotificationsRepository {
  constructor(private readonly db: PrismaClient) {}

  async findMany(where: Prisma.NotificationWhereInput, take: number): Promise<NotificationRow[]> {
    return this.db.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
  }

  async countWhere(where: Prisma.NotificationWhereInput): Promise<number> {
    return this.db.notification.count({ where });
  }

  async findOwned(id: string, userId: string, hotelId: string): Promise<NotificationRow | null> {
    return this.db.notification.findFirst({ where: { id, userId, hotelId } });
  }

  // Idempotent mark-one-read: only flips a still-unread owned row (preserves the
  // original read_at on re-read). count===0 means already-read OR not-owned; the
  // service disambiguates via findOwned.
  async markOneRead(id: string, userId: string, hotelId: string): Promise<number> {
    const res = await this.db.notification.updateMany({
      where: { id, userId, hotelId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return res.count;
  }

  async markAllRead(userId: string, hotelId: string): Promise<number> {
    const res = await this.db.notification.updateMany({
      where: { userId, hotelId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return res.count;
  }
}
