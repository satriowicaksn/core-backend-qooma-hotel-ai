// Domain + wire (snake_case) types for the guests surface.
// Envelope: camelCase wrapper + snake_case resource body (ratified Q-B-01/Q-B-04).

import type { Prisma } from '@prisma/client';

export type PrivacyMode = 'standard' | 'vvip';
export type VipLevel = 'silver' | 'gold' | 'platinum';

export const PRIVACY_MODES: readonly PrivacyMode[] = ['standard', 'vvip'] as const;
export const VIP_LEVELS: readonly VipLevel[] = ['silver', 'gold', 'platinum'] as const;

// Prisma row shapes.
export type GuestRow = Prisma.GuestGetPayload<Record<string, never>>;
export type GuestPreferenceRow = Prisma.GuestPreferenceGetPayload<Record<string, never>>;
export type GuestDetailRow = Prisma.GuestGetPayload<{
  include: { preferences: true; visits: true };
}>;
export type VisitRow = GuestDetailRow['visits'][number];

// Validated PATCH payload — only mutable profile fields.
export interface GuestUpdate {
  readonly name?: string;
  readonly email?: string | null;
  readonly privacyMode?: PrivacyMode;
  readonly isVip?: boolean;
  readonly vipLevel?: VipLevel | null;
}

export interface PreferenceInput {
  readonly preferenceType: string;
  readonly preferenceValue: string;
}

export interface GuestListQuery {
  readonly q?: string;
  readonly page: number;
  readonly pageSize: number;
}

// Wire shapes (snake_case). wa_phone/name/email are conditionally masked (§4.5).
export interface GuestWire {
  readonly id: string;
  readonly name: string;
  readonly wa_phone: string;
  readonly email: string | null;
  readonly privacy_mode: string;
  readonly is_vip: boolean;
  readonly vip_level: string | null;
  readonly total_stays: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface PreferenceWire {
  readonly id: string;
  readonly guest_id: string;
  readonly preference_type: string;
  readonly preference_value: string;
  readonly created_at: string;
  readonly updated_at: string;
}

// Embedded visit summary — the canonical Q-B-05 Visit wire shape (module-local
// serialization; MUST NOT rename/retype shared fields).
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

export interface GuestDetailWire extends GuestWire {
  readonly preferences: readonly PreferenceWire[];
  readonly visits: readonly VisitWire[];
}

export interface OffsetPageInfo {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly hasMore: boolean;
}

export interface GuestListResponse {
  readonly data: readonly GuestWire[];
  readonly pageInfo: OffsetPageInfo;
}

export interface GuestDetailResponse {
  readonly data: GuestDetailWire;
}

export interface GuestResponse {
  readonly data: GuestWire;
}

export interface PreferencesResponse {
  readonly data: readonly PreferenceWire[];
}
