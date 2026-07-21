// Outbound socket-push port (CLAUDE §4: socket emit = outbound IO → port + adapter).
// Consumed cross-module (tickets/visits/notifications); lives in shared/ as
// cross-cutting infra (Q-B-14 → shared/socket, Slot-B-ownable, no core/ gate).

// Full §3 catalog (docs/spec/02-hotel-core.md §3). The port supports every event;
// Slot B wires only the 4 that currently have a producer (see socket-events.ts).
export type SocketEvent =
  | 'ticket:created'
  | 'ticket:updated'
  | 'ticket:escalated'
  | 'ticket:rerouted'
  | 'verification:pending'
  | 'verification:resolved'
  | 'verification:failed_3x'
  | 'notification:new'
  | 'message:new'
  | 'billing:low_balance';

export interface SocketEmitterPort {
  // Emit to the tenant room `hotel:${hotelId}` (README §2.5 — server-authoritative).
  emitToHotel(hotelId: string, event: SocketEvent, payload: unknown): void;
}
