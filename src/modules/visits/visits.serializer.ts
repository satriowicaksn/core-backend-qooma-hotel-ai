import type { VisitRow, VisitWire } from './visits.types.js';

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

// Canonical Visit serializer (Q-B-05). The Visit wire shape carries no guest PII
// (guest_id only), so no §4.5 masking applies here — masking lives in the guests
// module. Emits exactly the 13 pinned fields, snake_case.
export function serializeVisit(row: VisitRow): VisitWire {
  return {
    id: row.id,
    guest_id: row.guestId,
    check_in: row.checkIn.toISOString(),
    check_out: iso(row.checkOut),
    nights: row.nights,
    room_number: row.roomNumber,
    status: row.status,
    booking_source: row.bookingSource,
    verification_attempts: row.verificationAttempts,
    special_request: row.specialRequest,
    satisfaction_score: row.satisfactionScore,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
