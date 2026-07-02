// Adapters for SocketEmitterPort.
//
// SocketIoEmitterAdapter targets a STRUCTURAL `SocketServerLike` — the real
// Socket.io `Server` satisfies it without T20 importing/installing `socket.io`
// (that install + the live server bootstrap + cookie-auth room-join = DEP-7,
// foundation). Until then the port is fully testable with a fake `io`.

import type { SocketEmitterPort, SocketEvent } from './socket-emitter.port.js';

// Minimal shape of Socket.io's `Server`: `io.to(room).emit(event, payload)`.
export interface SocketRoomLike {
  emit(event: string, payload: unknown): void;
}
export interface SocketServerLike {
  to(room: string): SocketRoomLike;
}

export class SocketIoEmitterAdapter implements SocketEmitterPort {
  constructor(private readonly io: SocketServerLike) {}

  emitToHotel(hotelId: string, event: SocketEvent, payload: unknown): void {
    this.io.to(`hotel:${hotelId}`).emit(event, payload);
  }
}

// Default no-op — used when no live `io` is wired (pre-DEP-7) so producers can
// emit unconditionally without a null check.
export class NoopSocketEmitter implements SocketEmitterPort {
  emitToHotel(): void {
    // intentionally empty
  }
}
