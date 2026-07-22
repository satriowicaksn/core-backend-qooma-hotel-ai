// OTP lifecycle service (ADD-24). OTP = proof the task reached the guest,
// NOT staff attendance. The code is generated at ticket creation, travels to
// the guest inside the WA acknowledgment (integration's job), and comes back
// via the dept Telegram group → integration → internal RPC → here.
// ANTI-CHEAT: otp_code never appears on any public wire or log line; the
// compare is server-side only and the internal `resend` RPC is the single
// surface that returns the code.

import { randomInt, timingSafeEqual } from 'node:crypto';

import { ConflictError, NotFoundError } from '@core/errors/app-errors.js';

import { serializeTicketListItem, type UserDirectory } from '@modules/tickets/index.js';
import type { TenantContext } from '@plugins/tenant-guard.js';
import {
  emitTicketUpdated,
  NoopSocketEmitter,
  type SocketEmitterPort,
} from '@shared/socket/index.js';

import type { OtpRepository } from './otp.repository.js';
import {
  DEFAULT_OTP_SETTINGS,
  OTP_CATEGORIES,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_RESENDS,
  type ManualSkipReason,
  type OtpSettings,
  type OtpSkipReason,
  type OtpTicketRow,
  type OtpVerifyResult,
} from './otp.types.js';
import type { GraceSchedulerPort } from './ports/grace-scheduler.port.js';

const GRACE_CLOSE_NOTE = 'Selesai tanpa verifikasi OTP';
const EMPTY_DIRECTORY: UserDirectory = new Map();

// §ADD-24.1 truth table: guest-present hand-over categories only; empty-room
// housekeeping / internal / administrative / complaint_escalation stay on the
// old §6.3 passive flow (and complaints keep the HIGH ALERT path).
export function evaluateRequiresOtp(input: {
  category: string;
  guestPresent: boolean;
  guestCheckedIn: boolean;
  hotelOtpEnabled: boolean;
}): boolean {
  return (
    input.hotelOtpEnabled &&
    input.guestPresent &&
    input.guestCheckedIn &&
    (OTP_CATEGORIES as readonly string[]).includes(input.category)
  );
}

function codesMatch(expected: string, presented: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(presented, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function isTerminal(row: OtpTicketRow): boolean {
  return row.status === 'closed' || row.status === 'cancelled';
}

// Socket payloads reuse the canonical ticket list wire, serialized under a
// masked pseudo-context so VVIP PII never rides a broadcast originating from
// an actor-less internal RPC.
const maskedCtx = (hotelId: string): TenantContext => ({
  userId: 'system',
  hotelId,
  isSuperAdmin: false,
  role: 'dept_head',
});

export interface OtpServiceDeps {
  readonly emitter?: SocketEmitterPort;
}

export class OtpService {
  private readonly emitter: SocketEmitterPort;

  constructor(
    private readonly repo: OtpRepository,
    private readonly scheduler: GraceSchedulerPort,
    deps: OtpServiceDeps = {},
  ) {
    this.emitter = deps.emitter ?? new NoopSocketEmitter();
  }

  async getEffectiveSettings(hotelId: string): Promise<OtpSettings> {
    const row = await this.repo.getSettings(hotelId);
    return row ?? DEFAULT_OTP_SETTINGS;
  }

  // Idempotent (double-DONE / race safe): an existing code is never
  // regenerated; reassignment keeps the OTP valid. One OTP per ticket.
  async generateOtpForTicket(ticketId: string, now: Date = new Date()): Promise<void> {
    const row = await this.requireTicket(ticketId);
    if (!row.requiresOtp || row.otpCode !== null || isTerminal(row) || row.otpVerified) {
      return;
    }
    const settings = await this.getEffectiveSettings(row.hotelId);
    if (!settings.otpEnabled) {
      return;
    }
    const code = String(randomInt(0, 100)).padStart(2, '0');
    const won = await this.repo.assignOtpCode(ticketId, code, now);
    if (won === 1) {
      await this.repo.recordAudit({
        hotelId: row.hotelId,
        ticketId,
        note: null,
        metadata: { otp_event: 'otp_generated' },
      });
    }
  }

  // Integration stamps this when the WA acknowledgment carrying the code
  // reached the guest (or TTS spoke it — channel-agnostic).
  async ackDelivered(ticketId: string, now: Date = new Date()): Promise<void> {
    const row = await this.requireTicket(ticketId);
    const stamped = await this.repo.stampDeliveredAt(ticketId, now);
    if (stamped === 1) {
      await this.emitUpdated(row.hotelId, ticketId, ['otp_delivered_at']);
    }
  }

  // Staff pressed [Sudah diantar/DONE] → grace timer starts NOW (not at
  // order intake). Deterministic jobId in the adapter makes re-clicks safe.
  async markDelivered(
    ticketId: string,
    actorTelegramId: string | null,
    now: Date = new Date(),
  ): Promise<{ graceDeadline: Date }> {
    const row = await this.requireTicket(ticketId);
    if (!row.requiresOtp) {
      throw new ConflictError('OTP not required for this ticket', {
        reason: 'OTP_NOT_REQUIRED',
      });
    }
    if (isTerminal(row) || row.otpVerified) {
      throw new ConflictError('Ticket already closed', { reason: 'TICKET_ALREADY_CLOSED' });
    }
    const settings = await this.getEffectiveSettings(row.hotelId);
    const delayMs = settings.otpGraceMinutes * 60 * 1000;
    const graceDeadline = new Date(now.getTime() + delayMs);
    await this.scheduler.schedule({ ticketId, delayMs, scheduledFor: graceDeadline });
    await this.repo.recordAudit({
      hotelId: row.hotelId,
      ticketId,
      note: null,
      metadata: {
        otp_event: 'otp_marked_delivered',
        grace_deadline: graceDeadline.toISOString(),
        ...(actorTelegramId !== null ? { actor_telegram_id: actorTelegramId } : {}),
      },
    });
    await this.emitUpdated(row.hotelId, ticketId, ['otp_marked_delivered']);
    return { graceDeadline };
  }

  async verifyCode(
    ticketId: string,
    code: string,
    _actorTelegramId: string | null = null,
    now: Date = new Date(),
  ): Promise<{ result: OtpVerifyResult; attemptsLeft?: number }> {
    const row = await this.requireTicket(ticketId);
    if (!row.requiresOtp || row.otpCode === null) {
      if (row.otpVerified || isTerminal(row)) {
        return { result: 'already_closed' };
      }
      return { result: 'not_required' };
    }
    if (row.otpVerified || isTerminal(row)) {
      return { result: 'already_closed' };
    }
    if (codesMatch(row.otpCode, code)) {
      const won = await this.repo.verifyTx({
        id: ticketId,
        hotelId: row.hotelId,
        from: row.status,
        now,
      });
      if (won === 0) {
        return { result: 'already_closed' };
      }
      await this.emitUpdated(row.hotelId, ticketId, ['status', 'otp_verified']);
      return { result: 'verified' };
    }
    const attempts = await this.repo.incrementAttempts(ticketId);
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await this.graceCloseRow(row, 'wrong_code_3x', '3x kode salah', now);
      return { result: 'locked', attemptsLeft: 0 };
    }
    return { result: 'wrong_code', attemptsLeft: OTP_MAX_ATTEMPTS - attempts };
  }

  // Staff pressed [Selesai tanpa kode] or the guest declined the code —
  // immediate grace-close, no penalty, NOT high alert.
  async skip(
    ticketId: string,
    reason: ManualSkipReason,
    note: string | null,
    now: Date = new Date(),
  ): Promise<void> {
    const row = await this.requireTicket(ticketId);
    await this.graceCloseRow(row, reason, note ?? GRACE_CLOSE_NOTE, now);
  }

  // Shared grace-close — never throws when already closed/verified (no-op),
  // which is exactly what the Bull `otp.check_grace` processor needs.
  async graceClose(ticketId: string, reason: OtpSkipReason, now: Date = new Date()): Promise<void> {
    const row = await this.repo.findTicketById(ticketId);
    if (!row || !row.requiresOtp || row.otpVerified || isTerminal(row)) {
      return;
    }
    await this.graceCloseRow(row, reason, GRACE_CLOSE_NOTE, now);
  }

  // Max 2 resends; the returned code is for INTERNAL callers only so
  // integration can dispatch it to the guest's WA.
  async resend(ticketId: string): Promise<{ otpCode: string }> {
    const row = await this.requireTicket(ticketId);
    if (!row.requiresOtp || row.otpCode === null || row.otpVerified || isTerminal(row)) {
      throw new ConflictError('OTP resend not applicable', {
        reason: 'OTP_RESEND_NOT_APPLICABLE',
      });
    }
    const won = await this.repo.incrementResendCount(ticketId, OTP_MAX_RESENDS);
    if (won === 0) {
      throw new ConflictError('OTP resend limit reached', { reason: 'OTP_RESEND_LIMIT' });
    }
    return { otpCode: row.otpCode };
  }

  // ADD-24.4: complaint within otp_complaint_window referencing the same
  // guest → flag the skipped ticket(s) for supervisor review. Scores are
  // NEVER touched automatically.
  async linkComplaintToSkippedTickets(
    args: {
      hotelId: string;
      guestId: string;
      roomNumber?: string;
      complaintTicketId: string;
    },
    now: Date = new Date(),
  ): Promise<{ linked: number }> {
    const settings = await this.getEffectiveSettings(args.hotelId);
    const closedAfter = new Date(now.getTime() - settings.otpComplaintWindow * 60 * 1000);
    const skipped = await this.repo.findSkippedSince(args.hotelId, args.guestId, closedAfter);
    if (skipped.length === 0) {
      return { linked: 0 };
    }
    await this.repo.markPendingReviewTx({
      hotelId: args.hotelId,
      ticketIds: skipped.map((t) => t.id),
      complaintTicketId: args.complaintTicketId,
      roomNumber: args.roomNumber ?? null,
    });
    for (const t of skipped) {
      await this.emitUpdated(args.hotelId, t.id, ['review_status']);
    }
    return { linked: skipped.length };
  }

  async resolveTelegram(hotelId: string, telegramMessageId: bigint): Promise<{ ticketId: string }> {
    const found = await this.repo.findByTelegramMessage(hotelId, telegramMessageId);
    if (!found) {
      throw new NotFoundError('Ticket');
    }
    return { ticketId: found.id };
  }

  async setTelegramMessage(ticketId: string, telegramMessageId: bigint): Promise<void> {
    await this.requireTicket(ticketId);
    await this.repo.setTelegramMessageId(ticketId, telegramMessageId);
  }

  private async requireTicket(ticketId: string): Promise<OtpTicketRow> {
    const row = await this.repo.findTicketById(ticketId);
    if (!row) {
      throw new NotFoundError('Ticket', ticketId);
    }
    return row;
  }

  private async graceCloseRow(
    row: OtpTicketRow,
    reason: OtpSkipReason,
    note: string,
    now: Date,
  ): Promise<void> {
    const won = await this.repo.graceCloseTx({
      id: row.id,
      hotelId: row.hotelId,
      from: row.status,
      reason,
      note,
      now,
    });
    if (won === 1) {
      await this.emitUpdated(row.hotelId, row.id, ['status', 'otp_skipped']);
    }
  }

  private async emitUpdated(
    hotelId: string,
    ticketId: string,
    changed: readonly string[],
  ): Promise<void> {
    const row = await this.repo.findTicketWithRelations(ticketId);
    if (!row) return;
    const wire = serializeTicketListItem(row, maskedCtx(hotelId), EMPTY_DIRECTORY);
    emitTicketUpdated(this.emitter, hotelId, wire, changed);
  }
}
