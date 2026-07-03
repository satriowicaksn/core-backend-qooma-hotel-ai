// Service: Feature-flags list + toggle. Simplest business rules — no delete-
// conflict, no cross-tenant category check. Under Opsi C SKIP_CROSS_DB_CHECKS
// = true, tier-lock + dependency-check + updated_by all stubbed per PM ACK
// tightenings #1-#4 (three-state wire + null updated_by to avoid users FK).

import type { Prisma } from '@prisma/client';

import type { Logger } from '@core/logger/logger.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { KnownFlag } from './feature-flags.constants.js';
import type { FeatureFlagsRepository } from './feature-flags.repository.js';
import type { UpdateFlagBody } from './feature-flags.schema.js';
import { composeFlagList, serializeFlagRow } from './feature-flags.serializer.js';
import type { FeatureFlagListResponse, FeatureFlagResponse } from './feature-flags.types.js';

export interface FeatureFlagsServiceOptions {
  readonly skipCrossDbChecks: boolean;
  readonly nodeEnv: string;
  readonly logger?: Logger;
}

export class FeatureFlagsService {
  private readonly skipCrossDbChecks: boolean;

  constructor(
    private readonly repo: FeatureFlagsRepository,
    opts: FeatureFlagsServiceOptions,
  ) {
    this.skipCrossDbChecks = opts.skipCrossDbChecks;
    // Q-C-02 observability (mirror departments.service.ts:55-64,
    // billing.service.ts:49-58). Fires once at construction on
    // prod+flag=true so silent stubs don't ship.
    if (this.skipCrossDbChecks && opts.nodeEnv === 'production' && opts.logger) {
      opts.logger.warn({
        module: 'feature-flags',
        event: 'cross_db_check_skip',
        env: opts.nodeEnv,
        msg: 'tier-lock + dependency-check + updated_by stubbed (Opsi C)',
      });
    }
  }

  async list(ctx: TenantContext): Promise<FeatureFlagListResponse> {
    const rows = await this.repo.findManyByHotel(ctx.hotelId);
    return { data: composeFlagList(ctx.hotelId, rows) };
  }

  /**
   * Toggle a single flag. Upserts on UNIQUE(hotel_id, flag).
   *
   * Under Opsi C `SKIP_CROSS_DB_CHECKS=true`:
   *   - `updated_by` passed as `null` (users table not in hotel_core_dev;
   *     FK would fail — PM ACK tightening #1).
   *   - Tier-lock enforcement SKIPPED (would raise `FEATURE_FLAG_TIER_LOCKED`
   *     when `hotel.tier < min_tier`, but tier data unavailable).
   *   - Dependency check SKIPPED (`campaigns` model not in T02 — spec §4.7
   *     `FEATURE_FLAG_DEPENDENCY_VIOLATION` deferred to slice-2).
   *
   * Under flag=false (post-Opsi-A slice-2):
   *   - `updated_by = ctx.userId` (users table available).
   *   - Real tier-lock + dependency checks fire.
   */
  async patch(
    ctx: TenantContext,
    flag: KnownFlag,
    input: UpdateFlagBody,
  ): Promise<FeatureFlagResponse> {
    const updatedBy = this.skipCrossDbChecks ? null : ctx.userId;
    const row = await this.repo.upsertFlag({
      hotelId: ctx.hotelId,
      flag,
      updatedBy,
      ...(input.is_enabled !== undefined ? { isEnabled: input.is_enabled } : {}),
      ...(input.config !== undefined
        ? { config: input.config as unknown as Prisma.InputJsonValue }
        : {}),
    });
    return { data: serializeFlagRow(row, flag) };
  }
}
