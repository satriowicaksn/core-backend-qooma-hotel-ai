/**
 * Ticket state-machine helper.
 *
 * Encodes the ticket status transition matrix per `docs/spec/02-hotel-core.md §5`
 * (server-enforced per techspec §6.2). Consumer today: T12 (status transition +
 * reroute); may also feed T13 (stats KPI computation).
 *
 * Terminal states (no outbound): `closed`, `cancelled`.
 *
 * Wire behavior on invalid transition — `BusinessRuleError` (HTTP 422) with
 * `code = 'BUSINESS_RULE'` at envelope + `details.rule = 'INVALID_TICKET_TRANSITION'`
 * (spec §5 line 74, PM B ratified envelope via T07-slice-1 DEP-6 resolution).
 *
 * Runtime defense (boundary): nullish coalesce guards against `as TicketStatus`
 * casts / DB drift returning a raw string not in the compile-time union. Unknown
 * `from` → empty allowed set → `false` from `isValidTicketTransition` →
 * `BusinessRuleError` from `assertValidTicketTransition` (never a raw `TypeError`).
 * `tsconfig.json noUncheckedIndexedAccess: true` also makes the `?? []` mandatory
 * at compile time — `Record<K,V>` indexed access is typed `V | undefined`.
 *
 * Consumer usage:
 *   import { assertValidTicketTransition } from '@shared/utils/ticket-state-machine.js';
 *   assertValidTicketTransition(ticket.status, 'done_pending'); // throws or returns
 */

import { BusinessRuleError } from '@core/errors/app-errors.js';

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'awaiting_late_reason'
  | 'done_pending'
  | 'closed'
  | 'high_alert'
  | 'escalated'
  | 'cancelled';

export const TICKET_TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['awaiting_late_reason', 'done_pending', 'escalated', 'cancelled'],
  awaiting_late_reason: ['done_pending'],
  done_pending: ['closed', 'high_alert', 'cancelled'],
  high_alert: ['in_progress'],
  escalated: ['in_progress', 'cancelled'],
  closed: [],
  cancelled: [],
} as const;

export function isValidTicketTransition(from: TicketStatus, to: TicketStatus): boolean {
  return (TICKET_TRANSITIONS[from] ?? []).includes(to);
}

export function assertValidTicketTransition(from: TicketStatus, to: TicketStatus): void {
  if (!isValidTicketTransition(from, to)) {
    throw new BusinessRuleError(`Invalid ticket transition: ${from} → ${to}`, {
      rule: 'INVALID_TICKET_TRANSITION',
      from,
      to,
    });
  }
}
