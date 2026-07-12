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
import type { UpsertVoiceBody, VoiceTestBody } from './voice.schema.js';
import { emptyVoiceConfig, serializeVoiceConfig } from './voice.serializer.js';
import type { VoiceConfigResponse, VoiceTestResponse } from './voice.types.js';

const TEST_STUB_NOTE = 'stub — PBX integration is wave 2a per ADD-23.7';

// FE-flat SIP detail fields that persist inside the `config` JSON (no dedicated
// Prisma columns). Kept in sync with the flat fields of UpsertVoiceBodySchema.
const SIP_CONFIG_KEYS = [
  'pbx_host',
  'sip_username',
  'sip_password',
  'sip_port',
  'sip_codec',
  'did_number',
] as const;

function collectSipConfig(input: UpsertVoiceBody): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of SIP_CONFIG_KEYS) {
    const value = input[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

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
    // FE sends SIP details flat; they have no Prisma columns, so merge them
    // over any explicit `config` blob (flat fields win) before persisting.
    const sip = collectSipConfig(input);
    const mergedConfig =
      input.config !== undefined || Object.keys(sip).length > 0
        ? { ...(input.config ?? {}), ...sip }
        : undefined;

    const delta: VoiceUpsertDelta = {
      ...(input.pbx_type !== undefined ? { pbxType: input.pbx_type } : {}),
      ...(mergedConfig !== undefined
        ? { config: mergedConfig as unknown as Prisma.InputJsonValue }
        : {}),
      ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
    };

    const row = await this.repo.upsert(ctx.hotelId, delta);
    return { data: serializeVoiceConfig(row) };
  }

  async test(ctx: TenantContext, _payload: VoiceTestBody): Promise<VoiceTestResponse> {
    const row = await this.repo.findByHotel(ctx.hotelId);
    // Precondition-not-met domain rule per PM ACK tightening #1 — 422
    // BusinessRuleError, not 400 ValidationError. FE discriminates on
    // details.rule (T25/T28 pattern).
    if (!row || row.pbxType === null) {
      throw new BusinessRuleError('Voice PBX not configured', {
        rule: 'VOICE_NOT_CONFIGURED',
      });
    }
    // Flat VoiceTestResponse shape per FE ({ success, message, latency_ms? }).
    // `note` retained for FE shim back-compat. Real PBX RPC is wave 2a — no
    // live latency yet, so latency_ms is omitted (optional on the wire).
    return {
      data: {
        success: true,
        message: TEST_STUB_NOTE,
        note: TEST_STUB_NOTE,
      },
    };
  }
}
