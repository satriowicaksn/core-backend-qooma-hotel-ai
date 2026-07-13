// Repository: Prisma direct (no interface — ADR-0001).

import type { Prisma, PrismaClient } from '@prisma/client';

import type { FeatureFlagRow } from './feature-flags.types.js';

export interface UpsertFlagInput {
  readonly hotelId: string;
  readonly flag: string;
  readonly isEnabled?: boolean;
  readonly config?: Prisma.InputJsonValue;
  // PM ACK tightening #1: under Opsi C users FK would fail — service passes
  // null when SKIP_CROSS_DB_CHECKS=true. Nullable column accepts null.
  readonly updatedBy: string | null;
}

export class FeatureFlagsRepository {
  constructor(private readonly db: PrismaClient) {}

  async findManyByHotel(hotelId: string): Promise<FeatureFlagRow[]> {
    return this.db.featureFlag.findMany({
      where: { hotelId },
      orderBy: { flag: 'asc' },
    });
  }

  async upsertFlag(input: UpsertFlagInput): Promise<FeatureFlagRow> {
    const create: Prisma.FeatureFlagUncheckedCreateInput = {
      hotelId: input.hotelId,
      flag: input.flag,
      updatedBy: input.updatedBy,
      ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
      ...(input.config !== undefined ? { config: input.config } : {}),
    };
    const update: Prisma.FeatureFlagUncheckedUpdateInput = {
      updatedBy: input.updatedBy,
      ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
      ...(input.config !== undefined ? { config: input.config } : {}),
    };
    // Opsi C: core DB and auth DB are separate databases (hotel_core_dev vs
    // hotel_auth_dev). The `hotels` stub table in core DB is not populated by
    // auth-BE, so the first INSERT into feature_flags fails with a FK violation
    // (P2003). Upsert the hotel stub row first so the FK is satisfied.
    await this.db.hotel.upsert({
      where: { id: input.hotelId },
      create: { id: input.hotelId },
      update: {},
    });
    return this.db.featureFlag.upsert({
      where: { hotelId_flag: { hotelId: input.hotelId, flag: input.flag } },
      create,
      update,
    });
  }
}
