// Service: Settings/voice groundwork stub (spec §1.5 wave 2a defer).
// RBAC gate lives at the route layer (requireRole([gm_admin])).
//
// GET returns empty default when no row exists (never 404, MVP §101 stub).
// PUT is idempotent upsert on hotelId PK.
// POST /test is a stub (no real PBX RPC in slice-1 — wave 2a scope).

import type { Prisma } from '@prisma/client';

import { BusinessRuleError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { VoiceRepository, VoiceUpsertDelta } from './voice.repository.js';
import type { UpsertVoiceBody } from './voice.schema.js';
import { emptyVoiceConfig, serializeVoiceConfig } from './voice.serializer.js';
import type { VoiceConfigResponse, VoiceTestResponse } from './voice.types.js';

const TEST_STUB_NOTE = 'stub — PBX integration is wave 2a per ADD-23.7';

export class VoiceService {
  constructor(private readonly repo: VoiceRepository) {}

  async get(ctx: TenantContext): Promise<VoiceConfigResponse> {
    const row = await this.repo.findByHotel(ctx.hotelId);
    if (!row) {
      return { data: emptyVoiceConfig(ctx.hotelId) };
    }
    return { data: serializeVoiceConfig(row) };
  }

  async upsert(ctx: TenantContext, input: UpsertVoiceBody): Promise<VoiceConfigResponse> {
    // hotel_id ALWAYS server-scoped from tenant — never body (zod strict
    // rejects unknown fields; belt-and-suspenders here reinforces invariant).
    const delta: VoiceUpsertDelta = {
      ...(input.pbx_type !== undefined ? { pbxType: input.pbx_type } : {}),
      ...(input.config !== undefined
        ? { config: input.config as unknown as Prisma.InputJsonValue }
        : {}),
      ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
    };

    const row = await this.repo.upsert(ctx.hotelId, delta);
    return { data: serializeVoiceConfig(row) };
  }

  async test(ctx: TenantContext): Promise<VoiceTestResponse> {
    const row = await this.repo.findByHotel(ctx.hotelId);
    // Precondition-not-met domain rule per PM ACK tightening #1 — 422
    // BusinessRuleError, not 400 ValidationError. FE discriminates on
    // details.rule (T25/T28 pattern).
    if (!row || row.pbxType === null) {
      throw new BusinessRuleError('Voice PBX not configured', {
        rule: 'VOICE_NOT_CONFIGURED',
      });
    }
    return {
      data: {
        success: true,
        note: TEST_STUB_NOTE,
      },
    };
  }
}
