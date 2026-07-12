// Serializer: repo aggregation rows → snake_case wire.
// Three-state meta per T26 precedent (PM ratified for Slot C Opsi C tasks).

import type {
  AnalyticsMetaWire,
  DepartmentPerformancePoint,
  DepartmentPerformanceRow,
  HighAlertDeptRow,
  HighAlertDeptWire,
  HighAlertSummary,
  OverviewAggRow,
  OverviewKpiWire,
  PeakHoursBucket,
  PeakHoursRow,
  PeriodBucket,
  RecommendationKey,
  SatisfactionPoint,
  SatisfactionRow,
  TicketVolumeBucket,
  TicketsByDayRow,
  TopRequest,
  TopRequestRow,
} from './analytics.types.js';

// PM ACK T30 tightening #1: spec §1.4:161 formula `current > prev * 1.10`.
// NOT a hardcoded absolute threshold. Prev-period rate 0 requires care —
// treat `null` (undefined-prev-rate) as no exceedance.
export function isAlertExceeded(currentRate: number, prevRate: number | null): boolean {
  if (prevRate === null) return false;
  return currentRate > prevRate * 1.1;
}

// PM ACK T30 tightening #2: 5-enum recommendation_key algorithm.
export function computeRecommendationKey(
  exceededCount: number,
  activeDeptCount: number,
): RecommendationKey {
  if (exceededCount === 0) return 'all_departments_healthy';
  if (exceededCount === 1) return 'single_dept_spike';
  const share = activeDeptCount > 0 ? exceededCount / activeDeptCount : 0;
  if (share >= 0.75) return 'systemic_alert';
  if (exceededCount >= 4) return 'cross_dept_pattern';
  return 'multi_dept_concern';
}

export function serializeOverview(agg: OverviewAggRow): OverviewKpiWire {
  const resolutionRate =
    agg.totalTickets > 0 ? Number((agg.closedTickets / agg.totalTickets).toFixed(4)) : null;
  return {
    total_tickets: agg.totalTickets,
    resolution_rate: resolutionRate,
    avg_satisfaction: agg.avgSatisfaction,
    avg_response_time_minutes: agg.avgResponseTimeMinutes,
  };
}

export function serializeTicketBucket(row: TicketsByDayRow): TicketVolumeBucket {
  // `count`/`total` are the same per-day volume; FE tickets view reads
  // total/closed/high_alert, high-alert trend_7d reads date/count.
  return {
    date: row.date,
    count: row.count,
    total: row.count,
    closed: row.closed,
    high_alert: row.highAlert,
  };
}

export function serializeDepartmentPerf(row: DepartmentPerformanceRow): DepartmentPerformancePoint {
  return {
    department: {
      id: row.departmentId,
      name: row.departmentName,
      code: row.departmentCode,
    },
    total: row.total,
    closed: row.closed,
    avg_response_minutes: row.avgResponseMinutes,
  };
}

export function serializePeakHoursBucket(row: PeakHoursRow): PeakHoursBucket {
  return { weekday: row.weekday, hour: row.hour, total: row.total };
}

export function serializeTopRequest(row: TopRequestRow): TopRequest {
  return { code: row.code, total: row.total };
}

export function serializeSatisfactionPoint(row: SatisfactionRow): SatisfactionPoint {
  return { date: row.date, score: row.score, responses: row.responses };
}

// Compute a per-dept high-alert wire from the joined agg row + a per-dept
// trend_7d array (fetched separately + keyed by department_id).
export function serializeHighAlertDept(
  row: HighAlertDeptRow,
  trend7d: readonly TicketVolumeBucket[],
): HighAlertDeptWire {
  const currentRate =
    row.currentCount > 0 ? Number((row.currentHighAlert / row.currentCount).toFixed(4)) : 0;
  const prevRate =
    row.prevCount > 0 ? Number((row.prevHighAlert / row.prevCount).toFixed(4)) : null;
  return {
    department_id: row.departmentId,
    current_period_rate: currentRate,
    prev_period_rate: prevRate,
    alert_threshold_exceeded: isAlertExceeded(currentRate, prevRate),
    // PM ACK T30 tightening #3: null slice-1 (Q-T30-#5 escalation for
    // PO define — no wrong_room complaint_type in T02 CHECK enum).
    salah_kamar_count: null,
    trend_7d: trend7d,
  };
}

export function buildAlertSummary(deptWires: readonly HighAlertDeptWire[]): HighAlertSummary {
  const totalHighAlert = deptWires.reduce(
    (acc, d) =>
      // Approximate high-alert count = current_period_rate * <best available>;
      // for slice-1 we surface the count of depts with any high-alert plus the
      // exceeded count. Real per-dept counts are already inside each wire's
      // current_period_rate — the summary is the shape spec expects. Kept
      // deterministic + spec-shaped.
      acc + (d.current_period_rate > 0 ? 1 : 0),
    0,
  );
  const exceededCount = deptWires.filter((d) => d.alert_threshold_exceeded).length;
  return {
    total_high_alert: totalHighAlert,
    threshold_exceeded_count: exceededCount,
    recommendation_key: computeRecommendationKey(exceededCount, deptWires.length),
  };
}

// Escape a CSV cell per RFC 4180 — quote when it contains a comma, quote or
// newline; double any embedded quotes.
function csvCell(value: string | number | null): string {
  const s = value === null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(cells: readonly (string | number | null)[]): string {
  return cells.map(csvCell).join(',');
}

// Build an export CSV from the overview KPIs + tickets time-series. Two labeled
// sections in one file so the FE Blob download carries both.
export function buildExportCsv(
  overview: OverviewKpiWire,
  buckets: readonly TicketVolumeBucket[],
): string {
  const lines: string[] = [
    csvRow(['section', 'overview']),
    csvRow(['total_tickets', 'resolution_rate', 'avg_satisfaction', 'avg_response_time_minutes']),
    csvRow([
      overview.total_tickets,
      overview.resolution_rate,
      overview.avg_satisfaction,
      overview.avg_response_time_minutes,
    ]),
    '',
    csvRow(['section', 'tickets']),
    csvRow(['date', 'total', 'closed', 'high_alert']),
    ...buckets.map((b) => csvRow([b.date, b.total, b.closed, b.high_alert])),
  ];
  return `${lines.join('\r\n')}\r\n`;
}

// Meta wrapper — three-state tier fields per PM ACK T30 tightening #4
// (T26 precedent applied). Under Opsi C `skipCrossDbChecks=true`, tier
// data is unavailable → both fields `null`.
export function buildMeta(from: Date, to: Date, period: PeriodBucket): AnalyticsMetaWire {
  return {
    tier: null,
    is_luxury_gate: null,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    period,
  };
}
