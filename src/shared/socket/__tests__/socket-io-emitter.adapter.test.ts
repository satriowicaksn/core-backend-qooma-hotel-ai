import { describe, expect, it } from '@jest/globals';

import {
  emitNotificationNew,
  emitTicketCreated,
  emitTicketEscalated,
  emitTicketRerouted,
  emitTicketUpdated,
  emitVerificationFailed3x,
  emitVerificationPending,
  emitVerificationResolved,
  NoopSocketEmitter,
  SocketIoEmitterAdapter,
  type SocketEmitterPort,
  type SocketEvent,
  type SocketServerLike,
} from '../index.js';

interface EmitCall {
  room: string;
  event: string;
  payload: unknown;
}

function fakeIo(): { io: SocketServerLike; calls: EmitCall[] } {
  const calls: EmitCall[] = [];
  const io: SocketServerLike = {
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => calls.push({ room, event, payload }),
    }),
  };
  return { io, calls };
}

function spy(): {
  port: SocketEmitterPort;
  calls: Array<{ hotelId: string; event: SocketEvent; payload: unknown }>;
} {
  const calls: Array<{ hotelId: string; event: SocketEvent; payload: unknown }> = [];
  return {
    calls,
    port: { emitToHotel: (hotelId, event, payload) => calls.push({ hotelId, event, payload }) },
  };
}

describe('SocketIoEmitterAdapter', () => {
  it('should emit to the hotel:${hotelId} room with the event + payload', () => {
    const { io, calls } = fakeIo();
    const adapter = new SocketIoEmitterAdapter(io);
    adapter.emitToHotel('hotel-9', 'ticket:updated', { ticket: { id: 't1' }, changed: ['status'] });
    expect(calls).toEqual([
      {
        room: 'hotel:hotel-9',
        event: 'ticket:updated',
        payload: { ticket: { id: 't1' }, changed: ['status'] },
      },
    ]);
  });
});

describe('NoopSocketEmitter', () => {
  it('should be a safe no-op', () => {
    expect(() => new NoopSocketEmitter().emitToHotel('h', 'notification:new', {})).not.toThrow();
  });
});

describe('event helpers (§3 payloads)', () => {
  it('should build ticket:rerouted with snake_case ids', () => {
    const s = spy();
    emitTicketRerouted(s.port, 'h1', {
      ticketId: 't1',
      fromDepartmentId: 'd1',
      toDepartmentId: 'd2',
    });
    expect(s.calls[0]).toEqual({
      hotelId: 'h1',
      event: 'ticket:rerouted',
      payload: { ticket_id: 't1', from_department_id: 'd1', to_department_id: 'd2' },
    });
  });

  it('should build ticket:updated with the ticket + changed', () => {
    const s = spy();
    emitTicketUpdated(s.port, 'h1', { id: 't1' }, ['status', 'priority']);
    expect(s.calls[0]?.payload).toEqual({ ticket: { id: 't1' }, changed: ['status', 'priority'] });
  });

  it('should build verification:pending with hotel_id folded in', () => {
    const s = spy();
    emitVerificationPending(s.port, 'h1', { visitId: 'v1', guestId: 'g1' });
    expect(s.calls[0]?.payload).toEqual({ visit_id: 'v1', guest_id: 'g1', hotel_id: 'h1' });
  });

  it('should build verification:resolved', () => {
    const s = spy();
    emitVerificationResolved(s.port, 'h1', { visitId: 'v1', status: 'checked_in' });
    expect(s.calls[0]?.payload).toEqual({ visit_id: 'v1', status: 'checked_in' });
  });

  it('should build the builder-only events (created, escalated, failed_3x, notification:new)', () => {
    const s = spy();
    emitTicketCreated(s.port, 'h1', { id: 't1' });
    emitTicketEscalated(s.port, 'h1', { ticketId: 't1', toLevel: 'l2' });
    emitVerificationFailed3x(s.port, 'h1', { visitId: 'v1', attempts: 3 });
    emitNotificationNew(s.port, 'h1', { id: 'n1' });
    expect(s.calls.map((c) => c.event)).toEqual([
      'ticket:created',
      'ticket:escalated',
      'verification:failed_3x',
      'notification:new',
    ]);
    expect(s.calls[0]?.payload).toEqual({ ticket: { id: 't1' } });
    expect(s.calls[1]?.payload).toEqual({ ticket_id: 't1', to_level: 'l2' });
    expect(s.calls[2]?.payload).toEqual({ visit_id: 'v1', attempts: 3 });
    expect(s.calls[3]?.payload).toEqual({ notification: { id: 'n1' } });
  });
});
