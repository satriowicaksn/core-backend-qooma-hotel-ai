import type { Prisma } from '@prisma/client';

export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'awaiting_late_reason'
  | 'done_pending'
  | 'closed'
  | 'high_alert'
  | 'escalated'
  | 'cancelled';

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ComplaintType = 'staff_attitude' | 'facility' | 'fnb' | 'general' | 'vvip';

export const TICKET_STATUSES: readonly TicketStatus[] = [
  'open',
  'in_progress',
  'awaiting_late_reason',
  'done_pending',
  'closed',
  'high_alert',
  'escalated',
  'cancelled',
] as const;

export const TICKET_PRIORITIES: readonly TicketPriority[] = [
  'low',
  'normal',
  'high',
  'urgent',
] as const;

export const COMPLAINT_TYPES: readonly ComplaintType[] = [
  'staff_attitude',
  'facility',
  'fnb',
  'general',
  'vvip',
] as const;

export interface UserDirectoryEntry {
  readonly name: string;
  readonly role: string;
}
export type UserDirectory = ReadonlyMap<string, UserDirectoryEntry>;

export type TicketRow = Prisma.TicketGetPayload<Record<string, never>>;
export type TicketListRow = Prisma.TicketGetPayload<{
  include: { guest: true; assignedUser: true };
}>;

// Validated mutation payloads (T12).
export interface StatusUpdate {
  readonly status: TicketStatus;
  readonly note: string | null;
}

export interface DepartmentUpdate {
  readonly departmentId: string;
  readonly note: string | null;
}

export type TicketDetailRow = Prisma.TicketGetPayload<{
  include: {
    guest: true;
    assignedUser: true;
    updates: { include: { actor: true } };
    messages: true;
  };
}>;

export interface TicketCursor {
  readonly createdAt: string;
  readonly id: string;
}

export interface TicketListFilters {
  readonly status?: readonly TicketStatus[];
  readonly departmentId?: string;
  readonly priority?: TicketPriority;
  readonly complaintType?: readonly ComplaintType[];
  readonly dateFrom?: Date;
  readonly dateTo?: Date;
  readonly q?: string;
  readonly isHighAlert?: boolean;
  readonly isOverdue?: boolean;
  readonly guestId?: string;
}

export interface TicketListQuery {
  readonly filters: TicketListFilters;
  readonly limit: number;
  readonly cursor?: TicketCursor;
}

export interface TicketListItemWire {
  readonly id: string;
  readonly ticket_number: string;
  readonly guest_id: string;
  readonly guest_name: string;
  readonly wa_phone_masked: string;
  readonly department_id: string;
  readonly assigned_user_id: string | null;
  readonly assigned_to: string | null;
  readonly status: string;
  readonly priority: string;
  readonly complaint_type: string | null;
  readonly subject: string;
  readonly is_high_alert: boolean;
  readonly is_overdue: boolean;
  readonly resolved_satisfaction: number | null;
  readonly sla_due_at: string | null;
  readonly closed_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface TicketUpdateWire {
  readonly id: string;
  readonly ticket_id: string;
  readonly type: string;
  readonly actor_user_id: string | null;
  readonly actor_name: string | null;
  readonly actor_role: string | null;
  readonly from_status: string | null;
  readonly to_status: string | null;
  readonly note: string | null;
  readonly created_at: string;
}

export interface TicketMessageWire {
  readonly id: string;
  readonly ticket_id: string;
  readonly sender: string;
  readonly sender_user_id: string | null;
  readonly body: string | null;
  readonly media: unknown;
  readonly conversation_id: string | null;
  readonly sent_at: string;
  readonly delivered_at: string | null;
  readonly read_at: string | null;
}

export interface TicketDetailWire extends TicketListItemWire {
  readonly guest_email: string | null;
  readonly complaint_detail: string | null;
  readonly body: string | null;
  readonly updates: readonly TicketUpdateWire[];
  readonly messages: readonly TicketMessageWire[];
}

export interface PageInfoWire {
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export interface TicketListResponse {
  readonly data: readonly TicketListItemWire[];
  readonly pageInfo: PageInfoWire;
}

export interface TicketDetailResponse {
  readonly data: TicketDetailWire;
}

export type TicketStatusCounts = Record<TicketStatus, number>;

export interface TicketStatsWire {
  readonly by_status: TicketStatusCounts;
  readonly total: number;
  readonly overdue: number;
  readonly high_alert_count: number;
}

export interface TicketStatsResponse {
  readonly data: TicketStatsWire;
}

export interface OverdueListResponse {
  readonly data: readonly TicketListItemWire[];
  readonly pageInfo: PageInfoWire;
}

export interface OverdueQuery {
  readonly limit: number;
}
