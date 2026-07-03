// Service: Analytics slice-1 — overview + tickets time-series + high-alert.
// Tier-gate stubbed per T26 three-state precedent + PM ACK tightening #4.

import { BusinessRuleError } from '@core/errors/app-errors.js';
import type { Logger } from '@core/logger/logger.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { AnalyticsRepository } from './analytics.repository.js';
import {
  buildAlertSummary,
  buildMeta,
  serializeHighAlertDept,
  serializeOverview,
  serializeTicketBucket,
} from './analytics.serializer.js';
import type {
  HighAlertDeptWire,
  HighAlertResponse,
  OverviewResponse,
  RangeQuery,
  TicketVolumeBucket,
  TicketsTimeSeriesResponse,
} from './analytics.types.js';

export interface AnalyticsServiceOptions {
  readonly skipCrossDbChecks: boolean;
  readonly nodeEnv: string;
  readonly logger?: Logger;
}

const TREND_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export class AnalyticsService {
  private readonly skipCrossDbChecks: boolean;

  constructor(
    private readonly repo: AnalyticsRepository,
    opts: AnalyticsServiceOptions,
  ) {
    this.skipCrossDbChecks = opts.skipCrossDbChecks;
    // Q-C-02 observability — mirror T21/T27/T26 pattern with same event key
    // `cross_db_check_skip` for cross-module grep. Fires ONCE at construction.
    if (this.skipCrossDbChecks && opts.nodeEnv === 'production' && opts.logger) {
      opts.logger.warn({
        module: 'analytics',
        event: 'cross_db_check_skip',
        env: opts.nodeEnv,
        msg: 'Luxury tier-gate + tier read stubbed (Opsi C)',
      });
    }
  }

  /**
   * PM ACK T30 tightening #4: TIER_GATE uses `BusinessRuleError` (422) per
   * spec §7 canonical error catalog. Spec §1.4:133 says 403 in prose but §7
   * is the authoritative catalog (Q-T30-#8 escalation). Under Opsi C
   * flag=true this throw path is UNREACHABLE — meta signals via three-state
   * `is_luxury_gate: null`.
   */
  private assertTierGate(ctx: TenantContext): void {
    if (this.skipCrossDbChecks) return; // Opsi C bypass
    if (ctx.isSuperAdmin) return;
    // Post-Opsi-A: real tier lookup would happen here. Slice-1 raises the
    // BusinessRuleError unconditionally when flag=false to lock down the
    // path until slice-2 wires the real check.
    throw new BusinessRuleError('Analytics restricted to Luxury tier', {
      rule: 'TIER_GATE',
    });
  }

  async overview(ctx: TenantContext, query: RangeQuery): Promise<OverviewResponse> {
    this.assertTierGate(ctx);
    const agg = await this.repo.overviewAgg(ctx.hotelId, query.from, query.to);
    return {
      data: serializeOverview(agg),
      meta: buildMeta(query.from, query.to, query.period),
    };
  }

  async tickets(ctx: TenantContext, query: RangeQuery): Promise<TicketsTimeSeriesResponse> {
    this.assertTierGate(ctx);
    const rows = await this.repo.ticketsByDay(ctx.hotelId, query.from, query.to);
    return {
      data: rows.map(serializeTicketBucket),
      meta: buildMeta(query.from, query.to, query.period),
    };
  }

  /**
   * Q-CONTRACT-21 ASSUMED shape (Q-T30-#9 escalation). Per-dept aggregation
   * computes current-period + same-length prev-period; alert_threshold_exceeded
   * uses spec §1.4:161 formula `current > prev * 1.10`. recommendation_key
   * per PM ACK T30 tightening #2 algorithm (5 enum values). `trend_7d` is
   * last-7-day per-day count for each dept.
   */
  async highAlert(ctx: TenantContext, query: RangeQuery): Promise<HighAlertResponse> {
    this.assertTierGate(ctx);
    const windowMs = query.to.getTime() - query.from.getTime();
    const prevFrom = new Date(query.from.getTime() - windowMs);
    const prevTo = new Date(query.from.getTime() - 1);

    const trendFrom = new Date(query.to.getTime() - (TREND_DAYS - 1) * DAY_MS);
    const trendTo = query.to;

    const [aggRows, trendRows] = await Promise.all([
      this.repo.highAlertByDept(ctx.hotelId, query.from, query.to, prevFrom, prevTo),
      this.repo.ticketsByDay(ctx.hotelId, trendFrom, trendTo),
    ]);

    // Global 7-day trend used for every dept slice-1 (spec §1.4:159 shows
    // per-dept trend_7d but doesn't specify aggregation — Q-T30-#9 covers
    // shape ambiguity). Slice-2 refines to per-dept trend once PO ratifies.
    const trend7d: TicketVolumeBucket[] = trendRows.map(serializeTicketBucket);

    const deptWires: HighAlertDeptWire[] = aggRows.map((row) =>
      serializeHighAlertDept(row, trend7d),
    );

    return {
      data: deptWires,
      alert_summary: buildAlertSummary(deptWires),
      meta: buildMeta(query.from, query.to, query.period),
    };
  }
}
