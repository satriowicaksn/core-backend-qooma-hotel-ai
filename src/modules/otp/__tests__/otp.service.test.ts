import { describe, expect, it, jest } from '@jest/globals';

import { ConflictError, NotFoundError } from '@core/errors/app-errors.js';

import type { SocketEmitterPort, SocketEvent } from '@shared/socket/index.js';

import type { OtpRepository } from '../otp.repository.js';
import { evaluateRequiresOtp, OtpService } from '../otp.service.js';
import { DEFAULT_OTP_SETTINGS, type OtpTicketRow } from '../otp.types.js';
import type { GraceScheduleInput, GraceSchedulerPort } from '../ports/grace-scheduler.port.js';

const NOW = new Date('2026-07-22T09:00:00.000Z');

function makeTicket(overrides: Partial<OtpTicketRow> = {}): OtpTicketRow {
  return {
    id: 'ticket-1',
    hotelId: 'hotel-1',
    ticketNumber: 'HSK-2607-001',
    guestId: 'guest-1',
    departmentId: 'dept-1',
    assignedUserId: 'user-7',
    createdBy: null,
    status: 'in_progress',
    priority: 'normal',
    complaintType: null,
    complaintDetail: null,
    subject: 'Handuk tambahan',
    body: null,
    isHighAlert: false,
    isOverdue: false,
    resolvedSatisfaction: null,
    slaDueAt: null,
    closedAt: null,
    requiresOtp: true,
    otpCode: '42',
    otpDeliveredAt: null,
    telegramMessageId: null,
    otpGeneratedAt: NOW,
    otpVerified: false,
    otpVerifiedAt: null,
    otpAttempts: 0,
    otpResendCount: 0,
    otpSkipped: false,
    otpSkipFlagged: false,
    otpSkipReason: null,
    reviewStatus: 'none',
    reviewOutcome: null,
    reviewedBy: null,
    reviewedAt: null,
    confirmedByGuest: null,
    confirmedAt: null,
    channel: 'wa',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

interface EmitCall {
  hotelId: string;
  event: SocketEvent;
  payload: unknown;
}
function spyEmitter(): { port: SocketEmitterPort; calls: EmitCall[] } {
  const calls: EmitCall[] = [];
  return {
    calls,
    port: { emitToHotel: (hotelId, event, payload) => calls.push({ hotelId, event, payload }) },
  };
}

function spyScheduler(): { port: GraceSchedulerPort; calls: GraceScheduleInput[] } {
  const calls: GraceScheduleInput[] = [];
  return {
    calls,
    port: {
      schedule: (input: GraceScheduleInput): Promise<void> => {
        calls.push(input);
        return Promise.resolve();
      },
    },
  };
}

function fakeRepo(overrides: Partial<Record<keyof OtpRepository, unknown>> = {}): OtpRepository {
  return {
    findTicketById: () => Promise.resolve(makeTicket()),
    findTicketWithRelations: () => Promise.resolve(null),
    getSettings: () => Promise.resolve(null),
    assignOtpCode: () => Promise.resolve(1),
    stampDeliveredAt: () => Promise.resolve(1),
    incrementAttempts: () => Promise.resolve(1),
    incrementResendCount: () => Promise.resolve(1),
    recordAudit: () => Promise.resolve(),
    verifyTx: () => Promise.resolve(1),
    graceCloseTx: () => Promise.resolve(1),
    findSkippedSince: () => Promise.resolve([]),
    markPendingReviewTx: () => Promise.resolve(),
    findByTelegramMessage: () => Promise.resolve(null),
    setTelegramMessageId: () => Promise.resolve(),
    ...overrides,
  } as unknown as OtpRepository;
}

function makeService(
  repo: OtpRepository,
  scheduler: GraceSchedulerPort = spyScheduler().port,
  emitter?: SocketEmitterPort,
): OtpService {
  return new OtpService(repo, scheduler, emitter ? { emitter } : {});
}

describe('evaluateRequiresOtp — ADD-24.1 truth table', () => {
  const base = {
    category: 'room_request',
    guestPresent: true,
    guestCheckedIn: true,
    hotelOtpEnabled: true,
  };

  it.each(['room_request', 'menu_order', 'ordering'])(
    'should require otp for %s with a present checked-in guest',
    (category) => {
      expect(evaluateRequiresOtp({ ...base, category })).toBe(true);
    },
  );

  it.each(['complaint_escalation', 'late_checkout', 'administrative', 'internal_maintenance'])(
    'should NOT require otp for category %s (keeps §6.3 / HIGH ALERT path)',
    (category) => {
      expect(evaluateRequiresOtp({ ...base, category })).toBe(false);
    },
  );

  it('should not require otp when guest is not present (empty-room housekeeping)', () => {
    expect(evaluateRequiresOtp({ ...base, guestPresent: false })).toBe(false);
  });

  it('should not require otp when the visit is not checked_in', () => {
    expect(evaluateRequiresOtp({ ...base, guestCheckedIn: false })).toBe(false);
  });

  it('should not require otp when the hotel disabled the feature', () => {
    expect(evaluateRequiresOtp({ ...base, hotelOtpEnabled: false })).toBe(false);
  });
});

describe('OtpService.generateOtpForTicket — idempotent generation', () => {
  it('should assign a zero-padded 2-digit code when none exists', async () => {
    const assign = jest.fn<() => Promise<number>>().mockResolvedValue(1);
    const repo = fakeRepo({
      findTicketById: () => Promise.resolve(makeTicket({ otpCode: null, otpGeneratedAt: null })),
      assignOtpCode: assign,
    });
    await makeService(repo).generateOtpForTicket('ticket-1', NOW);
    expect(assign).toHaveBeenCalledTimes(1);
    const args = assign.mock.calls[0] as unknown as [string, string, Date];
    expect(args[1]).toMatch(/^\d{2}$/);
  });

  it('should NOT regenerate when a code already exists (double-DONE race safe)', async () => {
    const assign = jest.fn<() => Promise<number>>().mockResolvedValue(1);
    const repo = fakeRepo({ assignOtpCode: assign });
    await makeService(repo).generateOtpForTicket('ticket-1', NOW);
    expect(assign).not.toHaveBeenCalled();
  });

  it('should be a no-op when requires_otp is false', async () => {
    const assign = jest.fn<() => Promise<number>>().mockResolvedValue(1);
    const repo = fakeRepo({
      findTicketById: () => Promise.resolve(makeTicket({ requiresOtp: false, otpCode: null })),
      assignOtpCode: assign,
    });
    await makeService(repo).generateOtpForTicket('ticket-1', NOW);
    expect(assign).not.toHaveBeenCalled();
  });

  it('should be a no-op when the hotel disabled otp', async () => {
    const assign = jest.fn<() => Promise<number>>().mockResolvedValue(1);
    const repo = fakeRepo({
      findTicketById: () => Promise.resolve(makeTicket({ otpCode: null })),
      getSettings: () =>
        Promise.resolve({ otpEnabled: false, otpGraceMinutes: 10, otpComplaintWindow: 180 }),
      assignOtpCode: assign,
    });
    await makeService(repo).generateOtpForTicket('ticket-1', NOW);
    expect(assign).not.toHaveBeenCalled();
  });

  it('should 404 when the ticket does not exist', async () => {
    const repo = fakeRepo({ findTicketById: () => Promise.resolve(null) });
    await expect(makeService(repo).generateOtpForTicket('nope')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('OtpService.verifyCode', () => {
  it('should close the ticket and emit on the correct code', async () => {
    const verifyTx = jest.fn<() => Promise<number>>().mockResolvedValue(1);
    const emitter = spyEmitter();
    const repo = fakeRepo({
      verifyTx,
      findTicketWithRelations: () =>
        Promise.resolve({ ...makeTicket(), guest: guestRow(), assignedUser: null }),
    });
    const service = makeService(repo, spyScheduler().port, emitter.port);
    const res = await service.verifyCode('ticket-1', '42', null, NOW);
    expect(res).toEqual({ result: 'verified' });
    expect(verifyTx).toHaveBeenCalledTimes(1);
    expect(emitter.calls[0]?.event).toBe('ticket:updated');
  });

  it('should return wrong_code with attempts_left on a mismatch', async () => {
    const repo = fakeRepo({ incrementAttempts: () => Promise.resolve(1) });
    const res = await makeService(repo).verifyCode('ticket-1', '10', null, NOW);
    expect(res).toEqual({ result: 'wrong_code', attemptsLeft: 2 });
  });

  it('should lock and grace-close with wrong_code_3x on the 3rd wrong attempt', async () => {
    const graceCloseTx = jest
      .fn<(args: { reason: string; note: string }) => Promise<number>>()
      .mockResolvedValue(1);
    const repo = fakeRepo({
      incrementAttempts: () => Promise.resolve(3),
      graceCloseTx,
    });
    const res = await makeService(repo).verifyCode('ticket-1', '10', null, NOW);
    expect(res).toEqual({ result: 'locked', attemptsLeft: 0 });
    expect(graceCloseTx).toHaveBeenCalledTimes(1);
    const args = graceCloseTx.mock.calls[0]?.[0];
    expect(args?.reason).toBe('wrong_code_3x');
    expect(args?.note).toBe('3x kode salah');
  });

  it('should report already_closed for a verified or terminal ticket', async () => {
    const verified = fakeRepo({
      findTicketById: () => Promise.resolve(makeTicket({ otpVerified: true, otpCode: null })),
    });
    expect((await makeService(verified).verifyCode('t', '42')).result).toBe('already_closed');

    const closed = fakeRepo({
      findTicketById: () => Promise.resolve(makeTicket({ status: 'closed' })),
    });
    expect((await makeService(closed).verifyCode('t', '42')).result).toBe('already_closed');
  });

  it('should report not_required when requires_otp is false', async () => {
    const repo = fakeRepo({
      findTicketById: () => Promise.resolve(makeTicket({ requiresOtp: false, otpCode: null })),
    });
    expect((await makeService(repo).verifyCode('t', '42')).result).toBe('not_required');
  });

  it('should report already_closed when the tx lost the race', async () => {
    const repo = fakeRepo({ verifyTx: () => Promise.resolve(0) });
    expect((await makeService(repo).verifyCode('t', '42')).result).toBe('already_closed');
  });
});

describe('OtpService.markDelivered — grace timer starts at DONE click', () => {
  it('should schedule the bull job with the hotel grace minutes and return the deadline', async () => {
    const scheduler = spyScheduler();
    const repo = fakeRepo();
    const service = makeService(repo, scheduler.port);
    const { graceDeadline } = await service.markDelivered('ticket-1', 'tg-9', NOW);
    expect(graceDeadline.toISOString()).toBe('2026-07-22T09:10:00.000Z');
    expect(scheduler.calls).toHaveLength(1);
    expect(scheduler.calls[0]?.delayMs).toBe(DEFAULT_OTP_SETTINGS.otpGraceMinutes * 60 * 1000);
  });

  it('should 409 OTP_NOT_REQUIRED for a non-otp ticket', async () => {
    const repo = fakeRepo({
      findTicketById: () => Promise.resolve(makeTicket({ requiresOtp: false })),
    });
    await expect(makeService(repo).markDelivered('t', null, NOW)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});

describe('OtpService.graceClose / skip', () => {
  it('should be a silent no-op when the code was already verified', async () => {
    const graceCloseTx = jest.fn<() => Promise<number>>().mockResolvedValue(1);
    const repo = fakeRepo({
      findTicketById: () => Promise.resolve(makeTicket({ otpVerified: true })),
      graceCloseTx,
    });
    await makeService(repo).graceClose('ticket-1', 'grace_timeout', NOW);
    expect(graceCloseTx).not.toHaveBeenCalled();
  });

  it('should be a silent no-op when the ticket vanished or is already closed', async () => {
    const graceCloseTx = jest.fn<() => Promise<number>>().mockResolvedValue(1);
    const gone = fakeRepo({ findTicketById: () => Promise.resolve(null), graceCloseTx });
    await makeService(gone).graceClose('ticket-1', 'grace_timeout', NOW);
    const closed = fakeRepo({
      findTicketById: () => Promise.resolve(makeTicket({ status: 'closed' })),
      graceCloseTx,
    });
    await makeService(closed).graceClose('ticket-1', 'grace_timeout', NOW);
    expect(graceCloseTx).not.toHaveBeenCalled();
  });

  it('should grace-close with the standard note on grace_timeout', async () => {
    const graceCloseTx = jest
      .fn<(args: { reason: string; note: string }) => Promise<number>>()
      .mockResolvedValue(1);
    const repo = fakeRepo({ graceCloseTx });
    await makeService(repo).graceClose('ticket-1', 'grace_timeout', NOW);
    expect(graceCloseTx.mock.calls[0]?.[0]).toMatchObject({
      reason: 'grace_timeout',
      note: 'Selesai tanpa verifikasi OTP',
    });
  });

  it('should pass guest_declined and other skip reasons through with an optional note', async () => {
    const graceCloseTx = jest
      .fn<(args: { reason: string; note: string }) => Promise<number>>()
      .mockResolvedValue(1);
    const repo = fakeRepo({ graceCloseTx });
    const service = makeService(repo);
    await service.skip('ticket-1', 'guest_declined', null, NOW);
    await service.skip('ticket-1', 'other', 'Tamu sedang tidur', NOW);
    expect(graceCloseTx.mock.calls[0]?.[0]).toMatchObject({ reason: 'guest_declined' });
    expect(graceCloseTx.mock.calls[1]?.[0]).toMatchObject({
      reason: 'other',
      note: 'Tamu sedang tidur',
    });
  });
});

describe('OtpService.resend — max 2, internal-only code return', () => {
  it('should return the code while under the limit', async () => {
    const res = await makeService(fakeRepo()).resend('ticket-1');
    expect(res).toEqual({ otpCode: '42' });
  });

  it('should 409 OTP_RESEND_LIMIT when the guarded increment loses', async () => {
    const repo = fakeRepo({ incrementResendCount: () => Promise.resolve(0) });
    await expect(makeService(repo).resend('ticket-1')).rejects.toMatchObject({
      details: { reason: 'OTP_RESEND_LIMIT' },
    });
  });

  it('should 409 OTP_RESEND_NOT_APPLICABLE when there is no live code', async () => {
    const repo = fakeRepo({
      findTicketById: () => Promise.resolve(makeTicket({ otpCode: null })),
    });
    await expect(makeService(repo).resend('ticket-1')).rejects.toMatchObject({
      details: { reason: 'OTP_RESEND_NOT_APPLICABLE' },
    });
  });
});

describe('OtpService.linkComplaintToSkippedTickets — ADD-24.4 window', () => {
  it('should flag skipped tickets closed inside the complaint window', async () => {
    const findSkippedSince = jest
      .fn<
        (
          hotelId: string,
          guestId: string,
          closedAfter: Date,
        ) => Promise<Array<{ id: string; status: string }>>
      >()
      .mockResolvedValue([{ id: 'skip-1', status: 'closed' }]);
    const markPendingReviewTx = jest.fn<() => Promise<void>>().mockResolvedValue();
    const repo = fakeRepo({ findSkippedSince, markPendingReviewTx });
    const res = await makeService(repo).linkComplaintToSkippedTickets(
      { hotelId: 'hotel-1', guestId: 'guest-1', complaintTicketId: 'comp-1' },
      NOW,
    );
    expect(res).toEqual({ linked: 1 });
    // default window 180 min → closedAfter = NOW - 3h
    expect(findSkippedSince.mock.calls[0]?.[2].toISOString()).toBe('2026-07-22T06:00:00.000Z');
    expect(markPendingReviewTx).toHaveBeenCalledTimes(1);
  });

  it('should link nothing when no skipped ticket falls inside the window', async () => {
    const markPendingReviewTx = jest.fn<() => Promise<void>>().mockResolvedValue();
    const repo = fakeRepo({ markPendingReviewTx });
    const res = await makeService(repo).linkComplaintToSkippedTickets(
      { hotelId: 'hotel-1', guestId: 'guest-1', complaintTicketId: 'comp-1' },
      NOW,
    );
    expect(res).toEqual({ linked: 0 });
    expect(markPendingReviewTx).not.toHaveBeenCalled();
  });
});

describe('OtpService telegram mapping', () => {
  it('should resolve a telegram message id to a ticket id', async () => {
    const repo = fakeRepo({
      findByTelegramMessage: () => Promise.resolve({ id: 'ticket-1' }),
    });
    expect(await makeService(repo).resolveTelegram('hotel-1', 123n)).toEqual({
      ticketId: 'ticket-1',
    });
  });

  it('should 404 when no ticket maps to the telegram message', async () => {
    await expect(makeService(fakeRepo()).resolveTelegram('hotel-1', 123n)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

function guestRow(): {
  id: string;
  hotelId: string;
  name: string;
  waPhone: string;
  email: string | null;
  privacyMode: string;
  isVip: boolean;
  vipLevel: string | null;
  totalStays: number;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    id: 'guest-1',
    hotelId: 'hotel-1',
    name: 'Budi Santoso',
    waPhone: '+6281234567890',
    email: null,
    privacyMode: 'standard',
    isVip: false,
    vipLevel: null,
    totalStays: 0,
    createdAt: NOW,
    updatedAt: NOW,
  };
}
