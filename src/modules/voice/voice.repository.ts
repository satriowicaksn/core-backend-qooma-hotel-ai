// Repository: Prisma direct (no interface — ADR-0001).
// voice_configs.hotelId is the PK — natural upsert target (spec §2.12).

import type { Prisma, PrismaClient } from '@prisma/client';

import type { VoiceConfigRow } from './voice.types.js';

export interface VoiceUpsertDelta {
  readonly pbxType?: string | null;
  readonly config?: Prisma.InputJsonValue;
  readonly isActive?: boolean;
}

export class VoiceRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByHotel(hotelId: string): Promise<VoiceConfigRow | null> {
    return this.db.voiceConfig.findUnique({ where: { hotelId } });
  }

  async upsert(hotelId: string, delta: VoiceUpsertDelta): Promise<VoiceConfigRow> {
    const create: Prisma.VoiceConfigUncheckedCreateInput = { hotelId };
    if (delta.pbxType !== undefined) create.pbxType = delta.pbxType;
    if (delta.config !== undefined) create.config = delta.config;
    if (delta.isActive !== undefined) create.isActive = delta.isActive;

    const update: Prisma.VoiceConfigUncheckedUpdateInput = {};
    if (delta.pbxType !== undefined) update.pbxType = delta.pbxType;
    if (delta.config !== undefined) update.config = delta.config;
    if (delta.isActive !== undefined) update.isActive = delta.isActive;

    return this.db.voiceConfig.upsert({ where: { hotelId }, create, update });
  }
}
