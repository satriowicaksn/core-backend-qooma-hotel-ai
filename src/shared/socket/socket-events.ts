// §3 event emit helpers — one thin function per catalog event, building the exact
// snake_case payload + room. Modules pass ALREADY-serialized wires (kept `unknown`
// here so shared/ never imports a module). Reuse existing serializers upstream.
//
// WIRED LIVE by Slot B (producers exist): ticketUpdated, ticketRerouted,
// verificationPending, verificationResolved.
// BUILDER-ONLY (no Slot-B producer yet — AI/Integration/workers wire later):
// ticketCreated, ticketEscalated, verificationFailed3x, notificationNew.

import type { SocketEmitterPort } from './socket-emitter.port.js';

// --- tickets ---
export function emitTicketCreated(
  emitter: SocketEmitterPort,
  hotelId: string,
  ticket: unknown,
): void {
  emitter.emitToHotel(hotelId, 'ticket:created', { ticket });
}

export function emitTicketUpdated(
  emitter: SocketEmitterPort,
  hotelId: string,
  ticket: unknown,
  changed: readonly string[],
): void {
  emitter.emitToHotel(hotelId, 'ticket:updated', { ticket, changed });
}

export function emitTicketRerouted(
  emitter: SocketEmitterPort,
  hotelId: string,
  args: { ticketId: string; fromDepartmentId: string; toDepartmentId: string },
): void {
  emitter.emitToHotel(hotelId, 'ticket:rerouted', {
    ticket_id: args.ticketId,
    from_department_id: args.fromDepartmentId,
    to_department_id: args.toDepartmentId,
  });
}

export function emitTicketEscalated(
  emitter: SocketEmitterPort,
  hotelId: string,
  args: { ticketId: string; toLevel: 'l2' | 'l3' },
): void {
  emitter.emitToHotel(hotelId, 'ticket:escalated', {
    ticket_id: args.ticketId,
    to_level: args.toLevel,
  });
}

// --- visits ---
export function emitVerificationPending(
  emitter: SocketEmitterPort,
  hotelId: string,
  args: { visitId: string; guestId: string },
): void {
  emitter.emitToHotel(hotelId, 'verification:pending', {
    visit_id: args.visitId,
    guest_id: args.guestId,
    hotel_id: hotelId,
  });
}

export function emitVerificationResolved(
  emitter: SocketEmitterPort,
  hotelId: string,
  args: { visitId: string; status: string },
): void {
  emitter.emitToHotel(hotelId, 'verification:resolved', {
    visit_id: args.visitId,
    status: args.status,
  });
}

export function emitVerificationFailed3x(
  emitter: SocketEmitterPort,
  hotelId: string,
  args: { visitId: string; attempts: number },
): void {
  emitter.emitToHotel(hotelId, 'verification:failed_3x', {
    visit_id: args.visitId,
    attempts: args.attempts,
  });
}

// --- notifications ---
export function emitNotificationNew(
  emitter: SocketEmitterPort,
  hotelId: string,
  notification: unknown,
): void {
  emitter.emitToHotel(hotelId, 'notification:new', { notification });
}
