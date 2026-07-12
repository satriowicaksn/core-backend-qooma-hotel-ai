// Domain + wire (snake_case) types for the analytics surface.
// Slice-1 scope: overview + tickets time-series + high-alert.
//
// PM ACK T30 tightening #3: three-state fields (`salah_kamar_count | null`,
// `meta.tier: TierName | null`, `meta.is_luxury_gate: boolean | null`).
// PM ACK T30 tightening #4: TIER_GATE 422 BusinessRuleError (spec §7 wins
// over §1.4 prose 403 — Q-T30-#8 escalation).

import type { TierName } from '../billing/index.js';

export type PeriodBucket = 'day' | 'week' | 'month' | 'custom';

export interface RangeQuery {
  readonly from: Date;
  readonly to: Date;
  readonly period: PeriodBucket;
}

// Shared meta wrapper — carries three-state tier metadata + query echo
// (Q-T30-#2 wrapping-with-meta discipline).
export interface AnalyticsMetaWire {
  readonly tier: TierName | null;
  readonly is_luxury_gate: boolean | null;
  readonly from: string;
  readonly to: string;
  readonly period: PeriodBucket;
}

// ---------- Overview ----------
export interface OverviewKpiWire {
  readonly total_tickets: number;
  readonly resolution_rate: number | null;
  readonly avg_satisfaction: string | null;
  readonly avg_response_time_minutes: number | null;
}

export interface OverviewResponse {
  readonly data: OverviewKpiWire;
  readonly meta: AnalyticsMetaWire;
}

// ---------- Tickets time-series ----------
export interface TicketVolumeBucket {
  readonly date: string;
  readonly count: number;
}

export interface TicketsTimeSeriesResponse {
  readonly data: readonly TicketVolumeBucket[];
  readonly meta: AnalyticsMetaWire;
}

// ---------- High-alert ----------
// Q-CONTRACT-21 ASSUMED shape (spec §1.4:138-159). Q-T30-#9 escalates for
// formal PO ratification.
export interface HighAlertDeptWire {
  readonly department_id: string;
  readonly current_period_rate: number;
  readonly prev_period_rate: number | null;
  readonly alert_threshold_exceeded: boolean;
  // PM ACK tightening #3: null slice-1 (Q-T30-#5 escalation for spec define).
  readonly salah_kamar_count: number | null;
  readonly trend_7d: readonly TicketVolumeBucket[];
}

// Spec §1.4:161 enum — 5 values.
export type RecommendationKey =
  | 'all_departments_healthy'
  | 'single_dept_spike'
  | 'multi_dept_concern'
  | 'cross_dept_pattern'
  | 'systemic_alert';

export interface HighAlertSummary {
  readonly total_high_alert: number;
  readonly threshold_exceeded_count: number;
  readonly recommendation_key: RecommendationKey;
}

export interface HighAlertResponse {
  readonly data: readonly HighAlertDeptWire[];
  readonly alert_summary: HighAlertSummary;
  readonly meta: AnalyticsMetaWire;
}

// ---------- Department performance ----------
export interface DepartmentRefWire {
  readonly id: string;
  readonly name: string;
  readonly code: string;
}

export interface DepartmentPerformancePoint {
  readonly department: DepartmentRefWire;
  readonly total: number;
  readonly closed: number;
  readonly avg_response_minutes: number;
}

export interface DepartmentPerformanceResponse {
  readonly data: readonly DepartmentPerformancePoint[];
  readonly meta: AnalyticsMetaWire;
}

// ---------- Peak hours ----------
export interface PeakHoursBucket {
  readonly weekday: number;
  readonly hour: number;
  readonly total: number;
}

export interface PeakHoursResponse {
  readonly data: readonly PeakHoursBucket[];
  readonly max: number;
  readonly meta: AnalyticsMetaWire;
}

// ---------- Top requests ----------
export interface TopRequest {
  readonly code: string;
  readonly total: number;
}

export interface TopRequestsResponse {
  readonly data: readonly TopRequest[];
  readonly meta: AnalyticsMetaWire;
}

// ---------- Satisfaction ----------
export interface SatisfactionPoint {
  readonly date: string;
  readonly score: number;
  readonly responses: number;
}

export interface SatisfactionResponse {
  readonly data: readonly SatisfactionPoint[];
  readonly meta: AnalyticsMetaWire;
}

// ---------- Repository row types ----------
// Prisma aggregation-result shapes returned by the repository. Kept internal
// so the routes/service layer doesn't leak Decimal.

export interface OverviewAggRow {
  readonly totalTickets: number;
  readonly closedTickets: number;
  readonly avgSatisfaction: string | null; // Decimal.toFixed(2) or null
  readonly avgResponseTimeMinutes: number | null;
}

export interface TicketsByDayRow {
  readonly date: string; // YYYY-MM-DD
  readonly count: number;
}

export interface HighAlertDeptRow {
  readonly departmentId: string;
  readonly currentCount: number;
  readonly currentHighAlert: number;
  readonly prevCount: number;
  readonly prevHighAlert: number;
}

export interface DepartmentPerformanceRow {
  readonly departmentId: string;
  readonly departmentName: string;
  readonly departmentCode: string;
  readonly total: number;
  readonly closed: number;
  readonly avgResponseMinutes: number;
}

export interface PeakHoursRow {
  readonly weekday: number;
  readonly hour: number;
  readonly total: number;
}

export interface TopRequestRow {
  readonly code: string;
  readonly total: number;
}

export interface SatisfactionRow {
  readonly date: string; // YYYY-MM-DD
  readonly score: number;
  readonly responses: number;
}
