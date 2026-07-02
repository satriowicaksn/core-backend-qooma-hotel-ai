import type { Prisma } from '@prisma/client';

export type VisitStatus =
  | 'pending_verification'
  | 'checked_in'
  | 'checked_out'
  | 'rejected'
  | 'failed_verification'
  | 'cancelled';

export type BookingSource = 'ota_email' | 'direct' | 'walk-in' | 'pms';

export const VISIT_STATUSES: readonly VisitStatus[] = [
  'pending_verification',
  'checked_in',
  'checked_out',
  'rejected',
  'failed_verification',
  'cancelled',
] as const;

export const BOOKING_SOURCES: readonly BookingSource[] = [
  'ota_email',
  'direct',
  'walk-in',
  'pms',
] as const;

export type VisitRow = Prisma.VisitGetPayload<Record<string, never>>;

export interface VisitListFilters {
  readonly status?: readonly VisitStatus[];
}

export interface VisitListQuery {
  readonly filters: VisitListFilters;
  readonly page: number;
  readonly pageSize: number;
}

// Canonical Visit wire object (Q-B-05, 13 fields from DDL §2.3). This module OWNS
// this shape; T14 embeds the same subset module-local. snake_case body inside the
// camelCase envelope (Q-B-01 casing contract). No guest PII fields → no masking here.
export interface VisitWire {
  readonly id: string;
  readonly guest_id: string;
  readonly check_in: string;
  readonly check_out: string | null;
  readonly nights: number | null;
  readonly room_number: string | null;
  readonly status: string;
  readonly booking_source: string | null;
  readonly verification_attempts: number;
  readonly special_request: string | null;
  readonly satisfaction_score: number | null;
  readonly created_at: string;
  readonly updated_at: string;
}

// Offset pagination envelope (Q-B-04, ratified shared T14+T16): camelCase `pageInfo`
// wrapper consistent with §2.7 cursor lists; offset fields inside.
export interface OffsetPageInfoWire {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly hasMore: boolean;
}

export interface VisitListResponse {
  readonly data: readonly VisitWire[];
  readonly pageInfo: OffsetPageInfoWire;
}

export interface VisitDetailResponse {
  readonly data: VisitWire;
}

// verify-manual dual-mode payload (parsed). approve → checked_in (+ derived
// checkout); reject → rejected. guest_name is validate-only (GAP T16-#2 / Q-B-08:
// no visits column, no cross-module write into guests).
export type VerifyManualInput =
  | { readonly mode: 'reject' }
  | {
      readonly mode: 'approve';
      readonly guestName: string;
      readonly roomNumber: string;
      readonly nights: number;
    };
