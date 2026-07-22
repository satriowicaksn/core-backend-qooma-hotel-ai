import { describe, expect, it, jest } from '@jest/globals';

import {
  AuthError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@core/errors/app-errors.js';

import type { UserDirectory } from '@modules/tickets/index.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import { OtpCrmService } from '../otp-crm.service.js';
import type { OtpRepository } from '../otp.repository.js';
import { parseMetricsQuery, parseOtpSettingsBody, parseReviewBody } from '../otp.schema.js';
import { computeRates, computeTeamAverage } from '../otp.serializer.js';
import type { OtpMetricsAggRow, OtpTicketRow, ReviewQueueRow } from '../otp.types.js';

const NOW = new Date('2026-07-22T09:00:00.000Z');

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: 'u-1',
    hotelId: 'hotel-1',
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function makeTicket(overrides: Partial<OtpTicketRow> = {}): OtpTicketRow {
  return {
    id: 'ticket-1',
    hotelId: 'hotel-1',
    ticketNumber: 'HSK-2607-001',
    guestId: 'guest-1',
    departmentId: 'dept-1',
    assignedUserId: 'user-7',
    createdBy: null,
    status: 'closed',
    priority: 'normal',
    complaintType: null,
    complaintDetail: null,
    subject: 'Handuk tambahan',
    body: null,
    isHighAlert: false,
    isOverdue: false,
    resolvedSatisfaction: null,
    slaDueAt: null,
    closedAt: NOW,
    requiresOtp: true,
    otpCode: null,
    otpDeliveredAt: new Date('2026-07-22T08:30:00.000Z'),
    telegramMessageId: null,
    otpGeneratedAt: new Date('2026-07-22T08:00:00.000Z'),
    otpVerified: false,
    otpVerifiedAt: null,
    otpAttempts: 0,
    otpResendCount: 0,
    otpSkipped: true,
    otpSkipFlagged: true,
    otpSkipReason: 'grace_timeout',
    reviewStatus: 'pending_supervisor',
    reviewOutcome: null,
    reviewedBy: null,
    reviewedAt: null,
    confirmedByGuest: null,
    confirmedAt: null,
    channel: 'wa',
    createdAt: new Date('2026-07-22T07:00:00.000Z'),
    updatedAt: NOW,
    ...overrides,
  };
}

function makeReviewRow(overrides: Partial<ReviewQueueRow> = {}): ReviewQueueRow {
  return {
    ...makeTicket(),
    guest: {
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
    },
    assignedUser: null,
    updates: [
      {
        id: 'up-1',
        hotelId: 'hotel-1',
        ticketId: 'ticket-1',
        actorUserId: null,
        type: 'system',
        fromStatus: 'done_pending',
        toStatus: 'closed',
        note: 'Selesai tanpa verifikasi OTP',
        metadata: { otp_event: 'grace_closed', reason: 'grace_timeout' },
        createdAt: new Date('2026-07-22T08:45:00.000Z'),
      },
      {
        id: 'up-2',
        hotelId: 'hotel-1',
        ticketId: 'ticket-1',
        actorUserId: null,
        type: 'system',
        fromStatus: null,
        toStatus: null,
        note: null,
        metadata: { otp_event: 'complaint_received', complaint_ticket_id: 'comp-1' },
        createdAt: new Date('2026-07-22T09:30:00.000Z'),
      },
    ],
    ...overrides,
  } as ReviewQueueRow;
}

function fakeRepo(overrides: Partial<Record<keyof OtpRepository, unknown>> = {}): OtpRepository {
  return {
    findTicketById: () => Promise.resolve(makeTicket()),
    findTicketWithRelations: () => Promise.resolve(null),
    findReviewQueue: () => Promise.resolve([makeReviewRow()]),
    findComplaintRefs: () =>
      Promise.resolve([
        {
          id: 'comp-1',
          ticketNumber: 'FO-2607-009',
          subject: 'Pesanan tidak sampai',
          createdAt: new Date('2026-07-22T09:30:00.000Z'),
        },
      ]),
    reviewTx: () => Promise.resolve(1),
    getSettings: () => Promise.resolve(null),
    upsertSettings: (
      _hotelId: string,
      data: { otpEnabled: boolean; otpGraceMinutes: number; otpComplaintWindow: number },
    ) => Promise.resolve(data),
    metricsAgg: () => Promise.resolve([]),
    ...overrides,
  } as unknown as OtpRepository;
}

describe('parseReviewBody', () => {
  it('should accept a valid outcome without note', () => {
    expect(parseReviewBody({ outcome: 'wrong_dept' })).toEqual({
      outcome: 'wrong_dept',
      note: null,
    });
  });

  it("should REQUIRE note when outcome is 'other'", () => {
    expect(() => parseReviewBody({ outcome: 'other' })).toThrow(ValidationError);
    expect(parseReviewBody({ outcome: 'other', note: 'lihat cctv' })).toEqual({
      outcome: 'other',
      note: 'lihat cctv',
    });
  });

  it('should reject unknown outcomes and unknown keys', () => {
    expect(() => parseReviewBody({ outcome: 'bogus' })).toThrow(ValidationError);
    expect(() => parseReviewBody({ outcome: 'staff_fault', extra: 1 })).toThrow(ValidationError);
  });
});

describe('OtpCrmService.review — transitions + 409s', () => {
  it('should set reviewed fields and resolve reviewer name from the directory', async () => {
    const reviewTx = jest
      .fn<(args: { reviewedBy: string; outcome: string }) => Promise<number>>()
      .mockResolvedValue(1);
    const service = new OtpCrmService(fakeRepo({ reviewTx }), {
      resolveUsers: (): Promise<UserDirectory> =>
        Promise.resolve(new Map([['u-1', { name: 'Ibu Sari', role: 'gm_admin' }]])),
    });
    const res = await service.review(ctx(), 'ticket-1', { outcome: 'staff_fault' });
    expect(res.data.review_status).toBe('reviewed');
    expect(res.data.review_outcome).toBe('staff_fault');
    expect(res.data.reviewed_by).toBe('Ibu Sari');
    expect(reviewTx.mock.calls[0]?.[0]).toMatchObject({
      outcome: 'staff_fault',
      reviewedBy: 'Ibu Sari',
    });
  });

  it('should 404 when the ticket is missing', async () => {
    const service = new OtpCrmService(fakeRepo({ findTicketById: () => Promise.resolve(null) }));
    await expect(service.review(ctx(), 't', { outcome: 'wrong_dept' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should 409 REVIEW_ALREADY_DONE when already reviewed', async () => {
    const service = new OtpCrmService(
      fakeRepo({
        findTicketById: () => Promise.resolve(makeTicket({ reviewStatus: 'reviewed' })),
      }),
    );
    await expect(service.review(ctx(), 't', { outcome: 'wrong_dept' })).rejects.toMatchObject({
      details: { reason: 'REVIEW_ALREADY_DONE' },
    });
  });

  it("should 409 NOT_PENDING_REVIEW when review_status is 'none'", async () => {
    const service = new OtpCrmService(
      fakeRepo({
        findTicketById: () => Promise.resolve(makeTicket({ reviewStatus: 'none' })),
      }),
    );
    await expect(service.review(ctx(), 't', { outcome: 'wrong_dept' })).rejects.toMatchObject({
      details: { reason: 'NOT_PENDING_REVIEW' },
    });
  });

  it('should mask a foreign-dept dept_head attempt as 404 (repo guard convention)', async () => {
    const service = new OtpCrmService(fakeRepo());
    await expect(
      service.review(ctx({ role: 'dept_head', deptId: 'dept-OTHER' }), 't', {
        outcome: 'wrong_dept',
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should 409 when the guarded update loses the race', async () => {
    const service = new OtpCrmService(fakeRepo({ reviewTx: () => Promise.resolve(0) }));
    await expect(service.review(ctx(), 't', { outcome: 'wrong_dept' })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });
});

describe('OtpCrmService.reviewQueue', () => {
  it('should return items with skip note, complaint link and ordered timeline', async () => {
    const service = new OtpCrmService(fakeRepo());
    const res = await service.reviewQueue(ctx(), {});
    expect(res.data).toHaveLength(1);
    const item = res.data[0];
    expect(item?.ticket.id).toBe('ticket-1');
    expect(item?.otp_skip_reason).toBe('grace_timeout');
    expect(item?.skip_note).toBe('Selesai tanpa verifikasi OTP');
    expect(item?.complaint).toEqual({
      ticket_id: 'comp-1',
      ticket_number: 'FO-2607-009',
      summary: 'Pesanan tidak sampai',
      created_at: '2026-07-22T09:30:00.000Z',
    });
    expect(item?.timeline.map((e) => e.event)).toEqual([
      'otp_generated',
      'otp_delivered',
      'grace_closed',
      'complaint_received',
    ]);
  });

  it('should force the dept arm for dept_head and throw without deptId', async () => {
    const findReviewQueue = jest
      .fn<(where: unknown, take: number) => Promise<ReviewQueueRow[]>>()
      .mockResolvedValue([]);
    const service = new OtpCrmService(fakeRepo({ findReviewQueue }));
    await service.reviewQueue(ctx({ role: 'dept_head', deptId: 'dept-9' }), {});
    expect(JSON.stringify(findReviewQueue.mock.calls[0]?.[0])).toContain('dept-9');
    await expect(service.reviewQueue(ctx({ role: 'dept_head' }), {})).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it('should paginate with a nextCursor when more rows exist', async () => {
    const rows = [
      makeReviewRow({ id: '11111111-1111-4111-8111-111111111111' }),
      makeReviewRow({ id: '22222222-2222-4222-8222-222222222222' }),
    ];
    const service = new OtpCrmService(fakeRepo({ findReviewQueue: () => Promise.resolve(rows) }));
    const res = await service.reviewQueue(ctx(), { limit: '1' });
    expect(res.data).toHaveLength(1);
    expect(res.pageInfo.hasMore).toBe(true);
    expect(res.pageInfo.nextCursor).not.toBeNull();
  });

  it('should never expose otp_code anywhere on the review-queue wire', async () => {
    const service = new OtpCrmService(fakeRepo());
    const res = await service.reviewQueue(ctx(), {});
    expect(JSON.stringify(res)).not.toContain('otp_code');
  });
});

describe('OtpCrmService settings', () => {
  it('should return defaults when no row exists', async () => {
    const service = new OtpCrmService(fakeRepo());
    expect((await service.getSettings(ctx())).data).toEqual({
      otp_enabled: true,
      otp_grace_minutes: 10,
      otp_complaint_window: 180,
    });
  });

  it('should upsert and echo the new settings', async () => {
    const service = new OtpCrmService(fakeRepo());
    const res = await service.putSettings(ctx(), {
      otp_enabled: false,
      otp_grace_minutes: 15,
      otp_complaint_window: 240,
    });
    expect(res.data).toEqual({
      otp_enabled: false,
      otp_grace_minutes: 15,
      otp_complaint_window: 240,
    });
  });

  it('should reject out-of-range values', () => {
    expect(() =>
      parseOtpSettingsBody({ otp_enabled: true, otp_grace_minutes: 0, otp_complaint_window: 180 }),
    ).toThrow(ValidationError);
    expect(() =>
      parseOtpSettingsBody({ otp_enabled: true, otp_grace_minutes: 61, otp_complaint_window: 180 }),
    ).toThrow(ValidationError);
    expect(() =>
      parseOtpSettingsBody({ otp_enabled: true, otp_grace_minutes: 10, otp_complaint_window: 29 }),
    ).toThrow(ValidationError);
    expect(() =>
      parseOtpSettingsBody({
        otp_enabled: true,
        otp_grace_minutes: 10,
        otp_complaint_window: 1441,
      }),
    ).toThrow(ValidationError);
  });
});

describe('otp metrics — aggregation math', () => {
  const row = (over: Partial<OtpMetricsAggRow> = {}): OtpMetricsAggRow => ({
    staffUserId: 'user-7',
    departmentId: 'dept-1',
    departmentName: 'Housekeeping',
    departmentCode: 'HSK',
    total: 10,
    verified: 6,
    skipped: 4,
    skipComplaint: 2,
    reviewed: 2,
    fault: 1,
    ...over,
  });

  it('should compute 0–1 fraction rates per staff', () => {
    expect(computeRates(row())).toEqual({
      otp_verified_rate: 0.6,
      otp_skip_rate: 0.4,
      skip_then_complaint_rate: 0.5,
      supervisor_confirmed_fault_rate: 0.5,
    });
  });

  it('should serialize zero denominators as 0 rates', () => {
    expect(
      computeRates(
        row({ total: 0, verified: 0, skipped: 0, skipComplaint: 0, reviewed: 0, fault: 0 }),
      ),
    ).toEqual({
      otp_verified_rate: 0,
      otp_skip_rate: 0,
      skip_then_complaint_rate: 0,
      supervisor_confirmed_fault_rate: 0,
    });
  });

  it('should weight the team average by counts, not average of averages', () => {
    const rows = [
      row(),
      row({
        staffUserId: 'user-8',
        total: 30,
        verified: 30,
        skipped: 0,
        skipComplaint: 0,
        reviewed: 0,
        fault: 0,
      }),
    ];
    // verified 36/40 = 0.9 (NOT (0.6 + 1.0)/2 = 0.8)
    expect(computeTeamAverage(rows).otp_verified_rate).toBe(0.9);
  });

  it('should parse ?month and default to the current month', () => {
    const q = parseMetricsQuery({ month: '2026-06' });
    expect(q.period).toBe('2026-06');
    expect(q.from.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(q.to.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(parseMetricsQuery({}, NOW).period).toBe('2026-07');
    expect(() => parseMetricsQuery({ month: '2026-13' })).toThrow(ValidationError);
  });

  it('should force own-dept scope for dept_head in the service', async () => {
    const metricsAgg = jest
      .fn<
        (
          hotelId: string,
          from: Date,
          to: Date,
          deptId: string | null,
        ) => Promise<OtpMetricsAggRow[]>
      >()
      .mockResolvedValue([row()]);
    const service = new OtpCrmService(fakeRepo({ metricsAgg }));
    const res = await service.metrics(ctx({ role: 'dept_head', deptId: 'dept-9' }), {
      month: '2026-07',
      department_id: '33333333-3333-4333-8333-333333333333',
    });
    expect(metricsAgg.mock.calls[0]?.[3]).toBe('dept-9');
    expect(res.staff[0]?.staff_key).toBe('user-7');
    expect(res.team_average.otp_verified_rate).toBe(0.6);
  });

  it('should return empty metrics for a hotel-less super_admin session', async () => {
    const service = new OtpCrmService(fakeRepo());
    const res = await service.metrics(
      ctx({ isSuperAdmin: true, role: 'super_admin', hotelId: '' }),
      {},
    );
    expect(res.staff).toEqual([]);
    expect(res.team_average.otp_verified_rate).toBe(0);
  });
});
