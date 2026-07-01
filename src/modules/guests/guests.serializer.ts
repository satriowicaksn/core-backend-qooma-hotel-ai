// Serializer layer: PII masking (§4.5) + snake_case wire shaping.
// maskName + shouldMaskPii are kept BYTE-IDENTICAL to tickets.serializer so the
// planned consolidation (T-CLEAN-01 → @shared/utils/masking) is a pure move.

import type { TenantContext } from '@plugins/tenant-guard.js';
import { maskEmail, maskWaPhone } from '@shared/utils/masking.js';

import type {
  GuestDetailRow,
  GuestDetailWire,
  GuestPreferenceRow,
  GuestRow,
  GuestWire,
  PreferenceWire,
  VisitRow,
  VisitWire,
} from './guests.types.js';

function shouldMaskPii(guest: { privacyMode: string }, ctx: TenantContext): boolean {
  if (guest.privacyMode !== 'vvip') return false;
  return !(ctx.isSuperAdmin || ctx.role === 'gm_admin');
}

function maskName(name: string): string {
  const first = name.trim().charAt(0);
  return first ? `${first}***` : '***';
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function serializeGuest(row: GuestRow, ctx: TenantContext): GuestWire {
  const mask = shouldMaskPii(row, ctx);
  return {
    id: row.id,
    name: mask ? maskName(row.name) : row.name,
    wa_phone: mask ? maskWaPhone(row.waPhone) : row.waPhone,
    email: row.email ? (mask ? maskEmail(row.email) : row.email) : null,
    privacy_mode: row.privacyMode,
    is_vip: row.isVip,
    vip_level: row.vipLevel,
    total_stays: row.totalStays,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function serializePreference(pref: GuestPreferenceRow): PreferenceWire {
  return {
    id: pref.id,
    guest_id: pref.guestId,
    preference_type: pref.preferenceType,
    preference_value: pref.preferenceValue,
    created_at: pref.createdAt.toISOString(),
    updated_at: pref.updatedAt.toISOString(),
  };
}

export function serializeVisit(visit: VisitRow): VisitWire {
  return {
    id: visit.id,
    guest_id: visit.guestId,
    check_in: visit.checkIn.toISOString(),
    check_out: iso(visit.checkOut),
    nights: visit.nights,
    room_number: visit.roomNumber,
    status: visit.status,
    booking_source: visit.bookingSource,
    verification_attempts: visit.verificationAttempts,
    special_request: visit.specialRequest,
    satisfaction_score: visit.satisfactionScore,
    created_at: visit.createdAt.toISOString(),
    updated_at: visit.updatedAt.toISOString(),
  };
}

export function serializeGuestDetail(row: GuestDetailRow, ctx: TenantContext): GuestDetailWire {
  return {
    ...serializeGuest(row, ctx),
    preferences: row.preferences.map((p) => serializePreference(p)),
    visits: row.visits.map((v) => serializeVisit(v)),
  };
}
