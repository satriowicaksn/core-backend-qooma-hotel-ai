import { describe, expect, it, jest } from '@jest/globals';

import { BusinessRuleError, ValidationError } from '@core/errors/app-errors.js';
import type { Logger } from '@core/logger/logger.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { AnalyticsRepository } from '../analytics.repository.js';
import { parseExportQuery, parseRangeQuery } from '../analytics.schema.js';
import {
  buildAlertSummary,
  buildMeta,
  computeRecommendationKey,
  isAlertExceeded,
  serializeOverview,
} from '../analytics.serializer.js';
import { AnalyticsService } from '../analytics.service.js';
import type {
  ExportQuery,
  HighAlertDeptRow,
  OverviewAggRow,
  RangeQuery,
  TicketsByDayRow,
} from '../analytics.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const DEPT_1 = 'd1111111-1111-4111-8111-111111111111';
const DEPT_2 = 'd2222222-2222-4222-8222-222222222222';

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: USER_ID,
    hotelId: HOTEL_A,
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<AnalyticsRepository> = {}): AnalyticsRepository {
  return {
    overviewAgg: () =>
      Promise.resolve<OverviewAggRow>({
        totalTickets: 0,
        closedTickets: 0,
        avgSatisfaction: null,
        avgResponseTimeMinutes: null,
      }),
    ticketsByDay: () => Promise.resolve<TicketsByDayRow[]>([]),
    highAlertByDept: () => Promise.resolve<HighAlertDeptRow[]>([]),
    ...overrides,
  } as unknown as AnalyticsRepository;
}

function svc(
  repo: AnalyticsRepository,
  overrides: { skipCrossDbChecks?: boolean; nodeEnv?: string; logger?: Logger } = {},
): AnalyticsService {
  return new AnalyticsService(repo, {
    skipCrossDbChecks: overrides.skipCrossDbChecks ?? true,
    nodeEnv: overrides.nodeEnv ?? 'development',
    ...(overrides.logger ? { logger: overrides.logger } : {}),
  });
}

function query(overrides: Partial<RangeQuery> = {}): RangeQuery {
  return {
    from: new Date('2026-06-01T00:00:00.000Z'),
    to: new Date('2026-06-30T00:00:00.000Z'),
    period: 'day',
    ...overrides,
  };
}

describe('parseRangeQuery (zod)', () => {
  it('should default to 30d window ending today with period=day', () => {
    const q = parseRangeQuery({});
    expect(q.period).toBe('day');
    const spanDays = Math.round((q.to.getTime() - q.from.getTime()) / (24 * 60 * 60 * 1000));
    expect(spanDays).toBe(30);
  });

  it('should accept from/to as ISO date and convert to Date', () => {
    const q = parseRangeQuery({ from: '2026-06-01', to: '2026-06-30' });
    expect(q.from.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(q.to.toISOString()).toBe('2026-06-30T00:00:00.000Z');
  });

  it('should reject period=custom without both from + to', () => {
    expect(() => parseRangeQuery({ period: 'custom', from: '2026-06-01' })).toThrow(
      ValidationError,
    );
  });

  it('should reject from > to', () => {
    expect(() => parseRangeQuery({ from: '2026-06-30', to: '2026-06-01' })).toThrow(
      ValidationError,
    );
  });

  it('should reject bogus date format', () => {
    expect(() => parseRangeQuery({ from: 'not-a-date' })).toThrow(ValidationError);
  });

  it('should reject an unknown query field (strict)', () => {
    expect(() => parseRangeQuery({ hotel_id: 'attacker' })).toThrow(ValidationError);
  });

  it('should reject an invalid period enum', () => {
    expect(() => parseRangeQuery({ period: 'year' })).toThrow(ValidationError);
  });
});

describe('serializer helpers', () => {
  describe('isAlertExceeded (PM ACK T30 tightening #1)', () => {
    it('should return true when current > prev * 1.10', () => {
      expect(isAlertExceeded(0.2, 0.15)).toBe(true); // 0.2 > 0.165
    });

    it('should return false when current == prev * 1.10 (strict >)', () => {
      expect(isAlertExceeded(0.11, 0.1)).toBe(false); // 0.11 > 0.11 is false
    });

    it('should return false when prevRate is null', () => {
      expect(isAlertExceeded(0.5, null)).toBe(false);
    });
  });

  describe('computeRecommendationKey (PM ACK T30 tightening #2)', () => {
    it('should return all_departments_healthy on 0 exceeded', () => {
      expect(computeRecommendationKey(0, 5)).toBe('all_departments_healthy');
    });

    it('should return single_dept_spike on 1 exceeded', () => {
      expect(computeRecommendationKey(1, 5)).toBe('single_dept_spike');
    });

    it('should return multi_dept_concern on 2 exceeded (< 4)', () => {
      expect(computeRecommendationKey(2, 5)).toBe('multi_dept_concern');
    });

    it('should return cross_dept_pattern on 4 exceeded (< 75%)', () => {
      expect(computeRecommendationKey(4, 10)).toBe('cross_dept_pattern');
    });

    it('should return systemic_alert when >= 75% of active depts', () => {
      // 4 exceeded of 5 depts = 80%.
      expect(computeRecommendationKey(4, 5)).toBe('systemic_alert');
    });
  });

  describe('serializeOverview', () => {
    it('should compute resolution_rate with 4 decimals', () => {
      const wire = serializeOverview({
        totalTickets: 10,
        closedTickets: 7,
        avgSatisfaction: '4.20',
        avgResponseTimeMinutes: 42.5,
      });
      expect(wire.resolution_rate).toBe(0.7);
      expect(wire.avg_satisfaction).toBe('4.20');
      expect(wire.avg_response_time_minutes).toBe(42.5);
    });

    it('should return null resolution_rate on 0 total', () => {
      const wire = serializeOverview({
        totalTickets: 0,
        closedTickets: 0,
        avgSatisfaction: null,
        avgResponseTimeMinutes: null,
      });
      expect(wire.resolution_rate).toBeNull();
    });
  });

  describe('buildMeta (T26 three-state precedent)', () => {
    it('should ship tier + is_luxury_gate as null slice-1', () => {
      const meta = buildMeta(
        new Date('2026-06-01T00:00:00.000Z'),
        new Date('2026-06-30T00:00:00.000Z'),
        'day',
      );
      expect(meta.tier).toBeNull();
      expect(meta.is_luxury_gate).toBeNull();
      expect(meta.from).toBe('2026-06-01');
      expect(meta.to).toBe('2026-06-30');
      expect(meta.period).toBe('day');
    });
  });

  describe('buildAlertSummary', () => {
    it('should aggregate deterministic summary from dept wires', () => {
      const wires = [
        {
          department_id: DEPT_1,
          current_period_rate: 0.2,
          prev_period_rate: 0.15,
          alert_threshold_exceeded: true,
          salah_kamar_count: null,
          trend_7d: [],
        },
        {
          department_id: DEPT_2,
          current_period_rate: 0,
          prev_period_rate: 0,
          alert_threshold_exceeded: false,
          salah_kamar_count: null,
          trend_7d: [],
        },
      ];
      const summary = buildAlertSummary(wires);
      expect(summary.total_high_alert).toBe(1);
      expect(summary.threshold_exceeded_count).toBe(1);
      expect(summary.recommendation_key).toBe('single_dept_spike');
    });
  });
});

describe('AnalyticsService.overview', () => {
  it('should shape response with data + meta', async () => {
    const service = svc(
      fakeRepo({
        overviewAgg: () =>
          Promise.resolve({
            totalTickets: 100,
            closedTickets: 80,
            avgSatisfaction: '4.30',
            avgResponseTimeMinutes: 25.5,
          }),
      }),
    );
    const res = await service.overview(ctx(), query());
    expect(res.data.total_tickets).toBe(100);
    expect(res.data.resolution_rate).toBe(0.8);
    expect(res.data.avg_satisfaction).toBe('4.30');
    expect(res.meta.tier).toBeNull();
    expect(res.meta.is_luxury_gate).toBeNull();
  });

  it('should NOT throw TIER_GATE under Opsi C flag=true', async () => {
    const service = svc(fakeRepo(), { skipCrossDbChecks: true });
    await expect(service.overview(ctx(), query())).resolves.toBeDefined();
  });

  it('should throw BusinessRuleError TIER_GATE when flag=false (post-Opsi-A stub)', async () => {
    const service = svc(fakeRepo(), { skipCrossDbChecks: false });
    try {
      await service.overview(ctx(), query());
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BusinessRuleError);
      expect((err as BusinessRuleError).details.rule).toBe('TIER_GATE');
    }
  });

  it('should bypass TIER_GATE for super_admin under flag=false', async () => {
    const service = svc(fakeRepo(), { skipCrossDbChecks: false });
    const superCtx = ctx({ isSuperAdmin: true, role: 'super_admin' });
    await expect(service.overview(superCtx, query())).resolves.toBeDefined();
  });
});

describe('AnalyticsService.tickets', () => {
  it('should serialize buckets in order', async () => {
    const rows: TicketsByDayRow[] = [
      { date: '2026-06-01', count: 5, closed: 3, highAlert: 1 },
      { date: '2026-06-02', count: 8, closed: 6, highAlert: 2 },
    ];
    const service = svc(fakeRepo({ ticketsByDay: () => Promise.resolve(rows) }));
    const res = await service.tickets(ctx(), query());
    expect(res.data).toEqual([
      { date: '2026-06-01', count: 5, total: 5, closed: 3, high_alert: 1 },
      { date: '2026-06-02', count: 8, total: 8, closed: 6, high_alert: 2 },
    ]);
    expect(res.meta.from).toBe('2026-06-01');
  });
});

describe('AnalyticsService.highAlert', () => {
  it('should compute prev-period window as same-length preceding', async () => {
    const highAlertByDept = jest.fn<AnalyticsRepository['highAlertByDept']>().mockResolvedValue([]);
    const service = svc(fakeRepo({ highAlertByDept, ticketsByDay: () => Promise.resolve([]) }));
    await service.highAlert(ctx(), query());
    const call = highAlertByDept.mock.calls[0];
    if (!call) throw new Error('expected call');
    const [, from, to, prevFrom, prevTo] = call;
    // Current: 2026-06-01 → 2026-06-30 (30 days). Prev: same length preceding.
    expect(from.toISOString().slice(0, 10)).toBe('2026-06-01');
    expect(to.toISOString().slice(0, 10)).toBe('2026-06-30');
    // Prev window ends 1 ms before current starts.
    expect(prevTo.getTime()).toBe(from.getTime() - 1);
    const currentSpan = to.getTime() - from.getTime();
    const prevSpan = prevTo.getTime() - prevFrom.getTime() + 1;
    expect(prevSpan).toBe(currentSpan);
  });

  it('should return dept wires with salah_kamar_count=null (PM ACK #3)', async () => {
    const service = svc(
      fakeRepo({
        highAlertByDept: () =>
          Promise.resolve([
            {
              departmentId: DEPT_1,
              currentCount: 100,
              currentHighAlert: 20,
              prevCount: 100,
              prevHighAlert: 15,
            },
          ]),
      }),
    );
    const res = await service.highAlert(ctx(), query());
    expect(res.data).toHaveLength(1);
    const dept = res.data[0];
    expect(dept?.salah_kamar_count).toBeNull();
    expect(dept?.current_period_rate).toBe(0.2);
    expect(dept?.prev_period_rate).toBe(0.15);
    // 0.2 > 0.15 * 1.10 = 0.165 → exceeded.
    expect(dept?.alert_threshold_exceeded).toBe(true);
  });

  it('should return alert_summary.recommendation_key correctly', async () => {
    const service = svc(
      fakeRepo({
        highAlertByDept: () =>
          Promise.resolve([
            {
              departmentId: DEPT_1,
              currentCount: 100,
              currentHighAlert: 30,
              prevCount: 100,
              prevHighAlert: 20,
            },
          ]),
      }),
    );
    const res = await service.highAlert(ctx(), query());
    expect(res.alert_summary.threshold_exceeded_count).toBe(1);
    expect(res.alert_summary.recommendation_key).toBe('single_dept_spike');
  });
});

function exportQuery(overrides: Partial<ExportQuery> = {}): ExportQuery {
  return {
    from: new Date('2026-06-01T00:00:00.000Z'),
    to: new Date('2026-06-30T00:00:00.000Z'),
    period: 'day',
    format: 'xlsx',
    ...overrides,
  };
}

describe('parseExportQuery (zod)', () => {
  it('should require a format param', () => {
    expect(() => parseExportQuery({})).toThrow(ValidationError);
  });

  it('should reject a bogus format', () => {
    expect(() => parseExportQuery({ format: 'csv' })).toThrow(ValidationError);
  });

  it('should default the range window when only format is given', () => {
    const q = parseExportQuery({ format: 'pdf' });
    expect(q.format).toBe('pdf');
    const spanDays = Math.round((q.to.getTime() - q.from.getTime()) / (24 * 60 * 60 * 1000));
    expect(spanDays).toBe(30);
  });
});

describe('AnalyticsService.export', () => {
  it('should build a CSV filename + overview/tickets sections', async () => {
    const service = svc(
      fakeRepo({
        overviewAgg: () =>
          Promise.resolve<OverviewAggRow>({
            totalTickets: 42,
            closedTickets: 21,
            avgSatisfaction: '4.30',
            avgResponseTimeMinutes: 25.5,
          }),
        ticketsByDay: () =>
          Promise.resolve<TicketsByDayRow[]>([
            { date: '2026-06-01', count: 5, closed: 3, highAlert: 1 },
          ]),
      }),
    );
    const res = await service.export(ctx(), exportQuery());
    expect(res.filename).toBe('analytics-2026-06-01-2026-06-30.csv');
    expect(res.csv).toContain('section,overview');
    expect(res.csv).toContain('42');
    expect(res.csv).toContain('section,tickets');
    expect(res.csv).toContain('2026-06-01,5,3,1');
  });

  it('should throw TIER_GATE when the gate is enforced', async () => {
    const service = svc(fakeRepo(), { skipCrossDbChecks: false });
    await expect(service.export(ctx(), exportQuery())).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('AnalyticsService — Q-C-02 startup WARN', () => {
  it('should WARN once on prod + flag=true', () => {
    const warn = jest.fn();
    const logger: Logger = { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() };
    svc(fakeRepo(), { skipCrossDbChecks: true, nodeEnv: 'production', logger });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'analytics',
        event: 'cross_db_check_skip',
        env: 'production',
      }),
    );
  });

  it('should NOT WARN on development', () => {
    const warn = jest.fn();
    const logger: Logger = { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() };
    svc(fakeRepo(), { skipCrossDbChecks: true, nodeEnv: 'development', logger });
    expect(warn).not.toHaveBeenCalled();
  });
});
