// Repository: Prisma direct (no interface — ADR-0001).
// `countByHotelAndName` is the app-layer pre-check for Q-T25-#5 (foundation
// UNIQUE constraint absent from T02 migration — Slot A owns the fix).

import type { Prisma, PrismaClient } from '@prisma/client';

import type { WaTemplateRow } from './wa-templates.types.js';

export class WaTemplatesRepository {
  constructor(private readonly db: PrismaClient) {}

  async findMany(where: Prisma.WaTemplateWhereInput): Promise<WaTemplateRow[]> {
    return this.db.waTemplate.findMany({
      where,
      orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
    });
  }

  async findById(id: string): Promise<WaTemplateRow | null> {
    return this.db.waTemplate.findUnique({ where: { id } });
  }

  async create(data: Prisma.WaTemplateUncheckedCreateInput): Promise<WaTemplateRow> {
    return this.db.waTemplate.create({ data });
  }

  async update(id: string, data: Prisma.WaTemplateUncheckedUpdateInput): Promise<WaTemplateRow> {
    return this.db.waTemplate.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.db.waTemplate.delete({ where: { id } });
  }

  // Q-T25-#5 app-layer pre-check. `excludeId` skips the row being edited
  // (PATCH-name path — avoid false-positive against self). Foundation UNIQUE
  // fix (Slot A) will make this pre-check redundant with the DB constraint,
  // but keeping both is fine (idempotent-safe).
  async countByHotelAndName(hotelId: string, name: string, excludeId?: string): Promise<number> {
    const where: Prisma.WaTemplateWhereInput = { hotelId, name };
    if (excludeId !== undefined) {
      where.id = { not: excludeId };
    }
    return this.db.waTemplate.count({ where });
  }
}
