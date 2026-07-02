// Public API of the socket infra (Q-B-14 → shared/socket).

export type { SocketEmitterPort, SocketEvent } from './socket-emitter.port.js';
export {
  NoopSocketEmitter,
  SocketIoEmitterAdapter,
  type SocketServerLike,
  type SocketRoomLike,
} from './socket-io-emitter.adapter.js';
export {
  emitNotificationNew,
  emitTicketCreated,
  emitTicketEscalated,
  emitTicketRerouted,
  emitTicketUpdated,
  emitVerificationFailed3x,
  emitVerificationPending,
  emitVerificationResolved,
} from './socket-events.js';
