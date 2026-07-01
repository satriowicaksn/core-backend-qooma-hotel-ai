// Repository: Prisma direct (no interface — ADR-0001).

import type { Prisma, PrismaClient } from '@prisma/client';

import type { GuestDetailRow, GuestPreferenceRow, GuestRow } from './guests.types.js';

const DETAIL_INCLUDE = {
  preferences: { orderBy: { createdAt: 'asc' } },
  visits: { orderBy: { checkIn: 'desc' } },
} satisfies Prisma.GuestInclude;

export class GuestsRepository {
  constructor(private readonly db: PrismaClient) {}

  async findManyAndCount(
    where: Prisma.GuestWhereInput,
    skip: number,
    take: number,
  ): Promise<{ rows: GuestRow[]; total: number }> {
    const [rows, total] = await this.db.$transaction([
      this.db.guest.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.db.guest.count({ where }),
    ]);
    return { rows, total };
  }

  async findDetailById(id: string): Promise<GuestDetailRow | null> {
    return this.db.guest.findUnique({ where: { id }, include: DETAIL_INCLUDE });
  }

  async findById(id: string): Promise<GuestRow | null> {
    return this.db.guest.findUnique({ where: { id } });
  }

  async updateGuest(id: string, data: Prisma.GuestUpdateInput): Promise<GuestRow> {
    return this.db.guest.update({ where: { id }, data });
  }

  async upsertPreferenceAndList(
    guestId: string,
    hotelId: string,
    preferenceType: string,
    preferenceValue: string,
  ): Promise<GuestPreferenceRow[]> {
    const [, list] = await this.db.$transaction([
      this.db.guestPreference.upsert({
        where: { guestId_preferenceType: { guestId, preferenceType } },
        create: { guestId, hotelId, preferenceType, preferenceValue },
        update: { preferenceValue },
      }),
      this.db.guestPreference.findMany({
        where: { guestId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return list;
  }
}
