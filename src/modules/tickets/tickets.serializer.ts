import type { TenantContext } from '@plugins/tenant-guard.js';
import { maskEmail, maskWaPhone } from '@shared/utils/masking.js';

import { isOverdue } from './tickets.overdue.js';
import { TICKET_STATUSES } from './tickets.types.js';
import type {
  TicketDetailRow,
  TicketDetailWire,
  TicketListItemWire,
  TicketListRow,
  TicketMessageWire,
  TicketStatsWire,
  TicketStatus,
  TicketStatusCounts,
  TicketUpdateWire,
  UserDirectory,
} from './tickets.types.js';

type GuestFields = Pick<TicketListRow['guest'], 'name' | 'waPhone' | 'email' | 'privacyMode'>;

function shouldMaskPii(guest: GuestFields, ctx: TenantContext): boolean {
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

function resolveUserName(userId: string | null, dir: UserDirectory): string | null {
  if (!userId) return null;
  return dir.get(userId)?.name ?? null;
}

function baseTicketWire(
  row: TicketListRow,
  ctx: TenantContext,
  dir: UserDirectory,
  now: Date,
): TicketListItemWire {
  const mask = shouldMaskPii(row.guest, ctx);
  return {
    id: row.id,
    ticket_number: row.ticketNumber,
    guest_id: row.guestId,
    guest_name: mask ? maskName(row.guest.name) : row.guest.name,
    wa_phone_masked: maskWaPhone(row.guest.waPhone),
    department_id: row.departmentId,
    assigned_user_id: row.assignedUserId,
    assigned_to: resolveUserName(row.assignedUserId, dir),
    status: row.status,
    priority: row.priority,
    complaint_type: row.complaintType,
    subject: row.subject,
    is_high_alert: row.isHighAlert,
    is_overdue: isOverdue(row, now),
    resolved_satisfaction: row.resolvedSatisfaction,
    sla_due_at: iso(row.slaDueAt),
    closed_at: iso(row.closedAt),
    requires_otp: row.requiresOtp,
    channel: row.channel,
    otp_verified: row.otpVerified,
    otp_verified_at: iso(row.otpVerifiedAt),
    otp_delivered_at: iso(row.otpDeliveredAt),
    otp_generated_at: iso(row.otpGeneratedAt),
    otp_attempts: row.otpAttempts,
    otp_resend_count: row.otpResendCount,
    otp_skipped: row.otpSkipped,
    otp_skip_flagged: row.otpSkipFlagged,
    otp_skip_reason: row.otpSkipReason,
    review_status: row.reviewStatus,
    review_outcome: row.reviewOutcome,
    reviewed_by: row.reviewedBy,
    reviewed_at: iso(row.reviewedAt),
    confirmed_by_guest: row.confirmedByGuest,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function serializeTicketListItem(
  row: TicketListRow,
  ctx: TenantContext,
  dir: UserDirectory,
  now: Date = new Date(),
): TicketListItemWire {
  return baseTicketWire(row, ctx, dir, now);
}

function serializeUpdate(
  update: TicketDetailRow['updates'][number],
  dir: UserDirectory,
): TicketUpdateWire {
  const entry = update.actorUserId ? dir.get(update.actorUserId) : undefined;
  return {
    id: update.id,
    ticket_id: update.ticketId,
    type: update.type,
    actor_user_id: update.actorUserId,
    actor_name: entry?.name ?? null,
    actor_role: entry?.role ?? null,
    from_status: update.fromStatus,
    to_status: update.toStatus,
    note: update.note,
    created_at: update.createdAt.toISOString(),
  };
}

function serializeMessage(message: TicketDetailRow['messages'][number]): TicketMessageWire {
  return {
    id: message.id,
    ticket_id: message.ticketId,
    sender: message.sender,
    sender_user_id: message.senderUserId,
    body: message.body,
    media: message.media ?? null,
    conversation_id: message.conversationId,
    sent_at: message.sentAt.toISOString(),
    delivered_at: iso(message.deliveredAt),
    read_at: iso(message.readAt),
  };
}

function zeroFilledStatusCounts(): TicketStatusCounts {
  const counts = {} as Record<TicketStatus, number>;
  for (const status of TICKET_STATUSES) {
    counts[status] = 0;
  }
  return counts;
}

export function serializeStats(
  statusCounts: ReadonlyArray<{ status: string; count: number }>,
  overdue: number,
  highAlertCount: number,
): TicketStatsWire {
  const byStatus = zeroFilledStatusCounts();
  let total = 0;
  for (const { status, count } of statusCounts) {
    if (status in byStatus) {
      byStatus[status as TicketStatus] = count;
    }
    total += count;
  }
  return { by_status: byStatus, total, overdue, high_alert_count: highAlertCount };
}

export function serializeTicketDetail(
  row: TicketDetailRow,
  ctx: TenantContext,
  dir: UserDirectory,
  now: Date = new Date(),
): TicketDetailWire {
  const mask = shouldMaskPii(row.guest, ctx);
  return {
    ...baseTicketWire(row, ctx, dir, now),
    guest_email: row.guest.email ? (mask ? maskEmail(row.guest.email) : row.guest.email) : null,
    complaint_detail: row.complaintDetail,
    body: row.body,
    updates: row.updates.map((u) => serializeUpdate(u, dir)),
    messages: row.messages.map((m) => serializeMessage(m)),
  };
}
