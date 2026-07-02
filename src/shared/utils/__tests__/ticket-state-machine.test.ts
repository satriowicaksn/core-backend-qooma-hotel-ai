import { describe, expect, it } from '@jest/globals';

import { BusinessRuleError } from '@core/errors/app-errors.js';

import {
  assertValidTicketTransition,
  isValidTicketTransition,
  TICKET_TRANSITIONS,
  type TicketStatus,
} from '../ticket-state-machine.js';

const VALID_TRANSITIONS: ReadonlyArray<[TicketStatus, TicketStatus]> = [
  ['open', 'in_progress'],
  ['open', 'cancelled'],
  ['in_progress', 'awaiting_late_reason'],
  ['in_progress', 'done_pending'],
  ['in_progress', 'escalated'],
  ['in_progress', 'cancelled'],
  ['awaiting_late_reason', 'done_pending'],
  ['done_pending', 'closed'],
  ['done_pending', 'high_alert'],
  ['done_pending', 'cancelled'],
  ['high_alert', 'in_progress'],
  ['escalated', 'in_progress'],
  ['escalated', 'cancelled'],
];

const TERMINAL_OUTBOUND_ATTEMPTS: ReadonlyArray<[TicketStatus, TicketStatus]> = [
  ['closed', 'open'],
  ['closed', 'in_progress'],
  ['closed', 'awaiting_late_reason'],
  ['closed', 'done_pending'],
  ['closed', 'high_alert'],
  ['closed', 'escalated'],
  ['closed', 'cancelled'],
  ['closed', 'closed'],
  ['cancelled', 'open'],
  ['cancelled', 'in_progress'],
  ['cancelled', 'awaiting_late_reason'],
  ['cancelled', 'done_pending'],
  ['cancelled', 'high_alert'],
  ['cancelled', 'escalated'],
  ['cancelled', 'closed'],
  ['cancelled', 'cancelled'],
];

describe('TICKET_TRANSITIONS terminal states', () => {
  it('should encode closed as terminal (no outbound)', () => {
    expect(TICKET_TRANSITIONS.closed).toEqual([]);
  });

  it('should encode cancelled as terminal (no outbound)', () => {
    expect(TICKET_TRANSITIONS.cancelled).toEqual([]);
  });
});

describe('isValidTicketTransition', () => {
  it.each(VALID_TRANSITIONS)(
    'should return true for spec-defined transition %s → %s',
    (from, to) => {
      expect(isValidTicketTransition(from, to)).toBe(true);
    },
  );

  it.each(TERMINAL_OUTBOUND_ATTEMPTS)(
    'should return false for terminal-outbound attempt %s → %s',
    (from, to) => {
      expect(isValidTicketTransition(from, to)).toBe(false);
    },
  );

  it('should return false for illegal double-jump (open → done_pending)', () => {
    expect(isValidTicketTransition('open', 'done_pending')).toBe(false);
  });

  it('should return false for wrong-direction transition (in_progress → open)', () => {
    expect(isValidTicketTransition('in_progress', 'open')).toBe(false);
  });

  it('should return false for self-loop (open → open)', () => {
    expect(isValidTicketTransition('open', 'open')).toBe(false);
  });

  it('should return false when from is an unknown state cast as TicketStatus', () => {
    expect(isValidTicketTransition('bogus_state' as TicketStatus, 'open')).toBe(false);
  });
});

describe('assertValidTicketTransition', () => {
  it('should not throw on a spec-defined valid transition (open → in_progress)', () => {
    expect(() => assertValidTicketTransition('open', 'in_progress')).not.toThrow();
  });

  it('should throw BusinessRuleError with exact envelope shape on invalid transition (open → closed)', () => {
    let caught: unknown;
    try {
      assertValidTicketTransition('open', 'closed');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BusinessRuleError);
    const err = caught as BusinessRuleError;
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('BUSINESS_RULE');
    expect(err.message).toBe('Invalid ticket transition: open → closed');
    expect(err.details).toEqual({
      rule: 'INVALID_TICKET_TRANSITION',
      from: 'open',
      to: 'closed',
    });
  });

  it('should throw BusinessRuleError on terminal-outbound attempt (closed → open)', () => {
    expect(() => assertValidTicketTransition('closed', 'open')).toThrow(BusinessRuleError);
  });

  it('should throw BusinessRuleError on illegal double-jump (open → done_pending)', () => {
    expect(() => assertValidTicketTransition('open', 'done_pending')).toThrow(BusinessRuleError);
  });

  it('should throw BusinessRuleError (not TypeError) when from is an unknown state', () => {
    let caught: unknown;
    try {
      assertValidTicketTransition('bogus_state' as TicketStatus, 'open');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BusinessRuleError);
    expect(caught).not.toBeInstanceOf(TypeError);
    const err = caught as BusinessRuleError;
    expect(err.details).toEqual({
      rule: 'INVALID_TICKET_TRANSITION',
      from: 'bogus_state',
      to: 'open',
    });
  });
});
