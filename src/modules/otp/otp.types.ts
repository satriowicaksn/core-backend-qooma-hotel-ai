import type { Prisma } from '@prisma/client';

import type { PageInfoWire, TicketListItemWire } from '@modules/tickets/index.js';

// ADD-24 §1: requires_otp iff category ∈ OTP_CATEGORIES AND direct hand-over
// to a present guest AND guest_visit.status = 'checked_in'.
export const OTP_CATEGORIES = ['room_request', 'menu_order', 'ordering'] as const;

export const OTP_MAX_ATTEMPTS = 3;
export const OTP_MAX_RESENDS = 2;

export type OtpSkipReason = 'grace_timeout' | 'guest_declined' | 'wrong_code_3x' | 'other';
export type ManualSkipReason = Extract<OtpSkipReason, 'guest_declined' | 'other'>;
export type ReviewStatus = 'none' | 'pending_supervisor' | 'reviewed';
export type ReviewOutcome = 'staff_fault' | 'wrong_dept' | 'guest_unreasonable' | 'other';
export type OtpVerifyResult =
  | 'verified'
  | 'wrong_code'
  | 'locked'
  | 'already_closed'
  | 'not_required';

export const REVIEW_OUTCOMES: readonly ReviewOutcome[] = [
  'staff_fault',
  'wrong_dept',
  'guest_unreasonable',
  'other',
] as const;

export interface OtpSettings {
  readonly otpEnabled: boolean;
  readonly otpGraceMinutes: number;
  readonly otpComplaintWindow: number;
}

export const DEFAULT_OTP_SETTINGS: OtpSettings = {
  otpEnabled: true,
  otpGraceMinutes: 10,
  otpComplaintWindow: 180,
};

export interface OtpSettingsWire {
  readonly otp_enabled: boolean;
  readonly otp_grace_minutes: number;
  readonly otp_complaint_window: number;
}

export interface OtpSettingsResponse {
  readonly data: OtpSettingsWire;
}

// --- rows ---

export type OtpTicketRow = Prisma.TicketGetPayload<Record<string, never>>;
export type OtpTicketListRow = Prisma.TicketGetPayload<{
  include: { guest: true; assignedUser: true };
}>;
export type ReviewQueueRow = Prisma.TicketGetPayload<{
  include: { guest: true; assignedUser: true; updates: true };
}>;

export interface ComplaintRef {
  readonly id: string;
  readonly ticketNumber: string;
  readonly subject: string;
  readonly createdAt: Date;
}

// --- review queue wire ---

export interface ReviewTimelineEventWire {
  readonly at: string;
  readonly event: string;
}

export interface ReviewComplaintWire {
  readonly ticket_id: string;
  readonly ticket_number: string;
  readonly summary: string;
  readonly created_at: string;
}

export interface ReviewQueueItemWire {
  readonly ticket: TicketListItemWire;
  readonly staff: { readonly assigned_to: string | null; readonly name: string | null };
  readonly otp_skip_reason: string | null;
  readonly skip_note: string | null;
  readonly complaint: ReviewComplaintWire | null;
  readonly timeline: readonly ReviewTimelineEventWire[];
}

export interface ReviewQueueResponse {
  readonly data: readonly ReviewQueueItemWire[];
  readonly pageInfo: PageInfoWire;
}

export interface ReviewResultWire {
  readonly id: string;
  readonly review_status: string;
  readonly review_outcome: string | null;
  readonly reviewed_by: string | null;
  readonly reviewed_at: string | null;
}

export interface ReviewResponse {
  readonly data: ReviewResultWire;
}

// --- metrics ---

export interface OtpMetricsAggRow {
  readonly staffUserId: string | null;
  readonly departmentId: string;
  readonly departmentName: string;
  readonly departmentCode: string;
  readonly total: number;
  readonly verified: number;
  readonly skipped: number;
  readonly skipComplaint: number;
  readonly reviewed: number;
  readonly fault: number;
}

export interface OtpMetricsRatesWire {
  readonly otp_verified_rate: number;
  readonly otp_skip_rate: number;
  readonly skip_then_complaint_rate: number;
  readonly supervisor_confirmed_fault_rate: number;
}

export interface OtpStaffMetricsWire extends OtpMetricsRatesWire {
  readonly staff_key: string;
  readonly name: string | null;
  readonly department: { readonly id: string; readonly name: string; readonly code: string };
  readonly total_otp_tickets: number;
}

export interface OtpMetricsResponse {
  readonly period: string;
  readonly team_average: OtpMetricsRatesWire;
  readonly staff: readonly OtpStaffMetricsWire[];
}

// --- parsed inputs ---

export interface ReviewBody {
  readonly outcome: ReviewOutcome;
  readonly note: string | null;
}

export interface ReviewQueueQuery {
  readonly limit: number;
  readonly cursor?: { readonly createdAt: string; readonly id: string };
}

export interface OtpMetricsQuery {
  readonly period: string;
  readonly from: Date;
  readonly to: Date;
  readonly departmentId?: string;
}
