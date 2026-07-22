import { serializeTicketListItem, type UserDirectory } from '@modules/tickets/index.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import type {
  ComplaintRef,
  OtpMetricsAggRow,
  OtpMetricsRatesWire,
  OtpSettings,
  OtpSettingsWire,
  OtpStaffMetricsWire,
  ReviewQueueItemWire,
  ReviewQueueRow,
  ReviewResultWire,
  ReviewTimelineEventWire,
} from './otp.types.js';

export function serializeOtpSettings(settings: OtpSettings): OtpSettingsWire {
  return {
    otp_enabled: settings.otpEnabled,
    otp_grace_minutes: settings.otpGraceMinutes,
    otp_complaint_window: settings.otpComplaintWindow,
  };
}

function metadataOf(update: ReviewQueueRow['updates'][number]): Record<string, unknown> {
  const meta = update.metadata;
  return typeof meta === 'object' && meta !== null && !Array.isArray(meta)
    ? (meta as Record<string, unknown>)
    : {};
}

function findOtpEvent(
  row: ReviewQueueRow,
  event: string,
): ReviewQueueRow['updates'][number] | undefined {
  return row.updates.find((u) => metadataOf(u).otp_event === event);
}

export function complaintTicketIdOf(row: ReviewQueueRow): string | null {
  const update = findOtpEvent(row, 'complaint_received');
  if (!update) return null;
  const id = metadataOf(update).complaint_ticket_id;
  return typeof id === 'string' ? id : null;
}

// Timeline per ADD-24 review queue: otp timestamps + audit-row events +
// linked complaint, ascending.
export function buildTimeline(row: ReviewQueueRow): ReviewTimelineEventWire[] {
  const events: Array<{ at: Date; event: string }> = [];
  if (row.otpGeneratedAt) events.push({ at: row.otpGeneratedAt, event: 'otp_generated' });
  if (row.otpDeliveredAt) events.push({ at: row.otpDeliveredAt, event: 'otp_delivered' });
  const marked = findOtpEvent(row, 'otp_marked_delivered');
  if (marked) events.push({ at: marked.createdAt, event: 'marked_delivered' });
  if (row.otpSkipped && row.closedAt) events.push({ at: row.closedAt, event: 'grace_closed' });
  const complaint = findOtpEvent(row, 'complaint_received');
  if (complaint) events.push({ at: complaint.createdAt, event: 'complaint_received' });
  return events
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .map((e) => ({ at: e.at.toISOString(), event: e.event }));
}

export function serializeReviewQueueItem(
  row: ReviewQueueRow,
  ctx: TenantContext,
  dir: UserDirectory,
  complaints: ReadonlyMap<string, ComplaintRef>,
  now: Date,
): ReviewQueueItemWire {
  const complaintId = complaintTicketIdOf(row);
  const complaint = complaintId ? (complaints.get(complaintId) ?? null) : null;
  const skipUpdate = findOtpEvent(row, 'grace_closed');
  return {
    ticket: serializeTicketListItem(row, ctx, dir, now),
    staff: {
      assigned_to: row.assignedUserId,
      name: row.assignedUserId ? (dir.get(row.assignedUserId)?.name ?? null) : null,
    },
    otp_skip_reason: row.otpSkipReason,
    skip_note: skipUpdate?.note ?? null,
    complaint: complaint
      ? {
          ticket_id: complaint.id,
          ticket_number: complaint.ticketNumber,
          summary: complaint.subject,
          created_at: complaint.createdAt.toISOString(),
        }
      : null,
    timeline: buildTimeline(row),
  };
}

export function serializeReviewResult(row: {
  id: string;
  reviewStatus: string;
  reviewOutcome: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}): ReviewResultWire {
  return {
    id: row.id,
    review_status: row.reviewStatus,
    review_outcome: row.reviewOutcome,
    reviewed_by: row.reviewedBy,
    reviewed_at: row.reviewedAt ? row.reviewedAt.toISOString() : null,
  };
}

// --- metrics (rates as 0–1 fractions; zero denominators serialize as 0) ---

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

interface MetricCounts {
  readonly total: number;
  readonly verified: number;
  readonly skipped: number;
  readonly skipComplaint: number;
  readonly reviewed: number;
  readonly fault: number;
}

export function computeRates(counts: MetricCounts): OtpMetricsRatesWire {
  return {
    otp_verified_rate: ratio(counts.verified, counts.total),
    otp_skip_rate: ratio(counts.skipped, counts.total),
    skip_then_complaint_rate: ratio(counts.skipComplaint, counts.skipped),
    supervisor_confirmed_fault_rate: ratio(counts.fault, counts.reviewed),
  };
}

export function serializeStaffMetrics(
  row: OtpMetricsAggRow,
  dir: UserDirectory,
): OtpStaffMetricsWire {
  return {
    staff_key: row.staffUserId ?? 'unassigned',
    name: row.staffUserId ? (dir.get(row.staffUserId)?.name ?? null) : null,
    department: { id: row.departmentId, name: row.departmentName, code: row.departmentCode },
    total_otp_tickets: row.total,
    ...computeRates(row),
  };
}

// Team average is weighted (summed counts), not an average of averages.
export function computeTeamAverage(rows: readonly OtpMetricsAggRow[]): OtpMetricsRatesWire {
  const sum = rows.reduce<MetricCounts>(
    (acc, r) => ({
      total: acc.total + r.total,
      verified: acc.verified + r.verified,
      skipped: acc.skipped + r.skipped,
      skipComplaint: acc.skipComplaint + r.skipComplaint,
      reviewed: acc.reviewed + r.reviewed,
      fault: acc.fault + r.fault,
    }),
    { total: 0, verified: 0, skipped: 0, skipComplaint: 0, reviewed: 0, fault: 0 },
  );
  return computeRates(sum);
}
