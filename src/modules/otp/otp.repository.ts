// Repository: Prisma direct (no interface — ADR-0001). All OTP state writes
// are guarded updateMany calls (optimistic concurrency, mirroring
// tickets.repository transitionStatusTx) so double-DONE / verify races and
// grace-timer overlaps resolve to exactly one winner. otp_code never leaves
// this layer except via findTicketById for the internal resend surface.

import { Prisma, type PrismaClient } from '@prisma/client';

import type {
  ComplaintRef,
  OtpMetricsAggRow,
  OtpSkipReason,
  OtpTicketListRow,
  OtpTicketRow,
  ReviewOutcome,
  ReviewQueueRow,
} from './otp.types.js';

const LIST_INCLUDE = {
  guest: true,
  assignedUser: true,
} satisfies Prisma.TicketInclude;

const REVIEW_INCLUDE = {
  guest: true,
  assignedUser: true,
  updates: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.TicketInclude;

const openStatusesGuard = (): { notIn: string[] } => ({ notIn: ['closed', 'cancelled'] });

interface RawMetricsRow {
  assigned_user_id: string | null;
  department_id: string;
  department_name: string;
  department_code: string;
  total: bigint;
  verified: bigint;
  skipped: bigint;
  skip_complaint: bigint;
  reviewed: bigint;
  fault: bigint;
}

export class OtpRepository {
  constructor(private readonly db: PrismaClient) {}

  async findTicketById(id: string): Promise<OtpTicketRow | null> {
    return this.db.ticket.findUnique({ where: { id } });
  }

  async findTicketWithRelations(id: string): Promise<OtpTicketListRow | null> {
    return this.db.ticket.findUnique({ where: { id }, include: LIST_INCLUDE });
  }

  async findByTelegramMessage(
    hotelId: string,
    telegramMessageId: bigint,
  ): Promise<{ id: string } | null> {
    return this.db.ticket.findFirst({
      where: { hotelId, telegramMessageId },
      select: { id: true },
    });
  }

  async setTelegramMessageId(id: string, telegramMessageId: bigint): Promise<void> {
    await this.db.ticket.update({ where: { id }, data: { telegramMessageId } });
  }

  async assignOtpCode(id: string, code: string, at: Date): Promise<number> {
    const res = await this.db.ticket.updateMany({
      where: { id, otpCode: null, otpVerified: false, status: openStatusesGuard() },
      data: { otpCode: code, otpGeneratedAt: at },
    });
    return res.count;
  }

  async stampDeliveredAt(id: string, at: Date): Promise<number> {
    const res = await this.db.ticket.updateMany({
      where: { id, otpDeliveredAt: null },
      data: { otpDeliveredAt: at },
    });
    return res.count;
  }

  async incrementAttempts(id: string): Promise<number> {
    const row = await this.db.ticket.update({
      where: { id },
      data: { otpAttempts: { increment: 1 } },
      select: { otpAttempts: true },
    });
    return row.otpAttempts;
  }

  async incrementResendCount(id: string, max: number): Promise<number> {
    const res = await this.db.ticket.updateMany({
      where: { id, otpResendCount: { lt: max } },
      data: { otpResendCount: { increment: 1 } },
    });
    return res.count;
  }

  async recordAudit(args: {
    hotelId: string;
    ticketId: string;
    note: string | null;
    metadata: Record<string, unknown>;
    fromStatus?: string;
    toStatus?: string;
  }): Promise<void> {
    await this.db.ticketUpdate.create({
      data: {
        hotelId: args.hotelId,
        ticketId: args.ticketId,
        type: 'system',
        note: args.note,
        metadata: args.metadata as Prisma.InputJsonObject,
        fromStatus: args.fromStatus ?? null,
        toStatus: args.toStatus ?? null,
      },
    });
  }

  // Correct code → CLOSED + verified flags in one atomic tx (§ADD-24.2).
  async verifyTx(args: { id: string; hotelId: string; from: string; now: Date }): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const res = await tx.ticket.updateMany({
        where: { id: args.id, otpVerified: false, status: openStatusesGuard() },
        data: {
          status: 'closed',
          closedAt: args.now,
          otpVerified: true,
          otpVerifiedAt: args.now,
          confirmedByGuest: true,
          confirmedAt: args.now,
          otpCode: null,
        },
      });
      if (res.count === 1) {
        await tx.ticketUpdate.create({
          data: {
            hotelId: args.hotelId,
            ticketId: args.id,
            type: 'system',
            fromStatus: args.from,
            toStatus: 'closed',
            note: 'Kode OTP terverifikasi oleh tamu',
            metadata: { otp_event: 'otp_verified' },
          },
        });
      }
      return res.count;
    });
  }

  // GRACE-CLOSE (§ADD-24.3): ticket CLOSED (never left hanging), flagged,
  // confirmed_by_guest stays NULL, code nulled. Guard makes it a no-op when
  // already verified/closed.
  async graceCloseTx(args: {
    id: string;
    hotelId: string;
    from: string;
    reason: OtpSkipReason;
    note: string;
    now: Date;
  }): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const res = await tx.ticket.updateMany({
        where: { id: args.id, otpVerified: false, otpSkipped: false, status: openStatusesGuard() },
        data: {
          status: 'closed',
          closedAt: args.now,
          otpSkipped: true,
          otpSkipFlagged: true,
          otpSkipReason: args.reason,
          otpCode: null,
        },
      });
      if (res.count === 1) {
        await tx.ticketUpdate.create({
          data: {
            hotelId: args.hotelId,
            ticketId: args.id,
            type: 'system',
            fromStatus: args.from,
            toStatus: 'closed',
            note: args.note,
            metadata: { otp_event: 'grace_closed', reason: args.reason },
          },
        });
      }
      return res.count;
    });
  }

  async findSkippedSince(
    hotelId: string,
    guestId: string,
    closedAfter: Date,
  ): Promise<Array<{ id: string; status: string }>> {
    return this.db.ticket.findMany({
      where: {
        hotelId,
        guestId,
        otpSkipped: true,
        reviewStatus: 'none',
        closedAt: { gte: closedAfter },
      },
      select: { id: true, status: true },
    });
  }

  async markPendingReviewTx(args: {
    hotelId: string;
    ticketIds: readonly string[];
    complaintTicketId: string;
    roomNumber: string | null;
  }): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.ticket.updateMany({
        where: { id: { in: [...args.ticketIds] }, reviewStatus: 'none' },
        data: { reviewStatus: 'pending_supervisor' },
      });
      await tx.ticketUpdate.createMany({
        data: args.ticketIds.map((ticketId) => ({
          hotelId: args.hotelId,
          ticketId,
          type: 'system',
          note: 'Komplain tamu masuk dalam jendela OTP skip — menunggu review supervisor',
          metadata: {
            otp_event: 'complaint_received',
            complaint_ticket_id: args.complaintTicketId,
            ...(args.roomNumber !== null ? { room_number: args.roomNumber } : {}),
          },
        })),
      });
    });
  }

  async findReviewQueue(where: Prisma.TicketWhereInput, take: number): Promise<ReviewQueueRow[]> {
    return this.db.ticket.findMany({
      where,
      include: REVIEW_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
  }

  async findComplaintRefs(ids: readonly string[]): Promise<ComplaintRef[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.ticket.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, ticketNumber: true, subject: true, createdAt: true },
    });
    return rows;
  }

  async reviewTx(args: {
    id: string;
    hotelId: string;
    outcome: ReviewOutcome;
    note: string | null;
    reviewedBy: string;
    now: Date;
  }): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const res = await tx.ticket.updateMany({
        where: { id: args.id, reviewStatus: 'pending_supervisor' },
        data: {
          reviewStatus: 'reviewed',
          reviewOutcome: args.outcome,
          reviewedBy: args.reviewedBy,
          reviewedAt: args.now,
        },
      });
      if (res.count === 1) {
        // 'staff_fault' is the ONLY outcome that may later impact a score —
        // recorded as a coaching-note audit entry, scores never mutated here.
        await tx.ticketUpdate.create({
          data: {
            hotelId: args.hotelId,
            ticketId: args.id,
            type: 'system',
            note:
              args.outcome === 'staff_fault' ? (args.note ?? 'Catat untuk coaching') : args.note,
            metadata: { otp_event: 'review', outcome: args.outcome },
          },
        });
      }
      return res.count;
    });
  }

  async getSettings(hotelId: string): Promise<{
    otpEnabled: boolean;
    otpGraceMinutes: number;
    otpComplaintWindow: number;
  } | null> {
    return this.db.hotelOtpSettings.findUnique({
      where: { hotelId },
      select: { otpEnabled: true, otpGraceMinutes: true, otpComplaintWindow: true },
    });
  }

  async upsertSettings(
    hotelId: string,
    data: { otpEnabled: boolean; otpGraceMinutes: number; otpComplaintWindow: number },
  ): Promise<{ otpEnabled: boolean; otpGraceMinutes: number; otpComplaintWindow: number }> {
    return this.db.hotelOtpSettings.upsert({
      where: { hotelId },
      create: { hotelId, ...data },
      update: data,
      select: { otpEnabled: true, otpGraceMinutes: true, otpComplaintWindow: true },
    });
  }

  // Base population: closed tickets with requires_otp=true in the month,
  // grouped per assigned staff + department (analytics $queryRaw pattern —
  // parameterized Prisma.sql, never string-interpolated).
  async metricsAgg(
    hotelId: string,
    from: Date,
    to: Date,
    departmentId: string | null,
  ): Promise<OtpMetricsAggRow[]> {
    const rows = await this.db.$queryRaw<RawMetricsRow[]>(Prisma.sql`
      SELECT
        t.assigned_user_id,
        t.department_id,
        d.name AS department_name,
        d.code AS department_code,
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE t.otp_verified)::bigint AS verified,
        COUNT(*) FILTER (WHERE t.otp_skipped)::bigint AS skipped,
        COUNT(*) FILTER (WHERE t.otp_skipped AND t.review_status <> 'none')::bigint
          AS skip_complaint,
        COUNT(*) FILTER (WHERE t.review_status = 'reviewed')::bigint AS reviewed,
        COUNT(*) FILTER (WHERE t.review_outcome = 'staff_fault')::bigint AS fault
      FROM tickets t
      JOIN departments d ON d.id = t.department_id
      WHERE t.hotel_id = ${hotelId}::uuid
        AND t.requires_otp = true
        AND t.status = 'closed'
        AND t.closed_at >= ${from}
        AND t.closed_at < ${to}
        AND (${departmentId}::uuid IS NULL OR t.department_id = ${departmentId}::uuid)
      GROUP BY t.assigned_user_id, t.department_id, d.name, d.code
      ORDER BY total DESC
    `);
    return rows.map((r) => ({
      staffUserId: r.assigned_user_id,
      departmentId: r.department_id,
      departmentName: r.department_name,
      departmentCode: r.department_code,
      total: Number(r.total),
      verified: Number(r.verified),
      skipped: Number(r.skipped),
      skipComplaint: Number(r.skip_complaint),
      reviewed: Number(r.reviewed),
      fault: Number(r.fault),
    }));
  }
}
