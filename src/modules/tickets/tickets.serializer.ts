import type { TenantContext } from '@plugins/tenant-guard.js';
import { maskEmail, maskWaPhone } from '@shared/utils/masking.js';

import type {
  TicketDetailRow,
  TicketDetailWire,
  TicketListItemWire,
  TicketListRow,
  TicketMessageWire,
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
    is_overdue: row.isOverdue,
    resolved_satisfaction: row.resolvedSatisfaction,
    sla_due_at: iso(row.slaDueAt),
    closed_at: iso(row.closedAt),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function serializeTicketListItem(
  row: TicketListRow,
  ctx: TenantContext,
  dir: UserDirectory,
): TicketListItemWire {
  return baseTicketWire(row, ctx, dir);
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

export function serializeTicketDetail(
  row: TicketDetailRow,
  ctx: TenantContext,
  dir: UserDirectory,
): TicketDetailWire {
  const mask = shouldMaskPii(row.guest, ctx);
  return {
    ...baseTicketWire(row, ctx, dir),
    guest_email: row.guest.email ? (mask ? maskEmail(row.guest.email) : row.guest.email) : null,
    complaint_detail: row.complaintDetail,
    body: row.body,
    updates: row.updates.map((u) => serializeUpdate(u, dir)),
    messages: row.messages.map((m) => serializeMessage(m)),
  };
}
