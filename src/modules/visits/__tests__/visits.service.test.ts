import { describe, expect, it } from '@jest/globals';

import { BusinessRuleError, NotFoundError, ValidationError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { deriveCheckout } from '../visits.checkout.js';
import type { VisitsRepository } from '../visits.repository.js';
import { parseApproveManual, parseListQuery, parseVerifyManual } from '../visits.schema.js';
import { serializeVisit } from '../visits.serializer.js';
import {
  assertVisitTransition,
  buildVisitWhere,
  VisitsService,
  type VisitsServiceDeps,
} from '../visits.service.js';
import type { VisitRow } from '../visits.types.js';

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: 'user-1',
    hotelId: 'hotel-1',
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function makeRow(overrides: Partial<VisitRow> = {}): VisitRow {
  return {
    id: 'visit-1',
    hotelId: 'hotel-1',
    guestId: 'guest-1',
    checkIn: new Date('2026-06-11T06:00:00.000Z'),
    checkOut: null,
    nights: null,
    roomNumber: null,
    status: 'pending_verification',
    bookingSource: null,
    verificationAttempts: 0,
    specialRequest: null,
    satisfactionScore: null,
    createdAt: new Date('2026-06-11T05:00:00.000Z'),
    updatedAt: new Date('2026-06-11T05:00:00.000Z'),
    ...overrides,
  };
}

describe('buildVisitWhere', () => {
  it('should scope by hotelId when role is gm_admin', () => {
    expect(buildVisitWhere(ctx(), {})).toEqual({ AND: [{ hotelId: 'hotel-1' }] });
  });

  it('should not scope by hotelId when caller is super_admin', () => {
    expect(buildVisitWhere(ctx({ isSuperAdmin: true, role: 'super_admin' }), {})).toEqual({});
  });

  it('should map a status filter to an IN clause in its own AND arm', () => {
    const where = buildVisitWhere(ctx(), {
      status: ['pending_verification', 'failed_verification'],
    });
    expect(where.AND).toContainEqual({
      status: { in: ['pending_verification', 'failed_verification'] },
    });
    expect(where.AND).toContainEqual({ hotelId: 'hotel-1' });
  });
});

describe('parseListQuery', () => {
  it('should default page to 1 and pageSize to 20 when omitted', () => {
    const q = parseListQuery({});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(20);
  });

  it('should clamp pageSize to 100 when the request exceeds the max', () => {
    expect(parseListQuery({ pageSize: '500' }).pageSize).toBe(100);
  });

  it('should parse a status CSV into a typed array', () => {
    expect(parseListQuery({ status: 'pending_verification,checked_in' }).filters.status).toEqual([
      'pending_verification',
      'checked_in',
    ]);
  });

  it('should throw ValidationError when a status value is invalid', () => {
    expect(() => parseListQuery({ status: 'pending_verification,bogus' })).toThrow(ValidationError);
  });

  it('should fall back to page 1 when page is below the minimum', () => {
    expect(parseListQuery({ page: '0' }).page).toBe(1);
  });
});

describe('serializeVisit', () => {
  it('should emit the 13 canonical fields with ISO timestamps', () => {
    const wire = serializeVisit(
      makeRow({
        checkOut: new Date('2026-06-13T04:00:00.000Z'),
        nights: 2,
        roomNumber: '1204',
        status: 'checked_in',
        bookingSource: 'direct',
        verificationAttempts: 1,
        specialRequest: 'late checkout',
        satisfactionScore: 5,
      }),
    );
    expect(wire).toEqual({
      id: 'visit-1',
      guest_id: 'guest-1',
      check_in: '2026-06-11T06:00:00.000Z',
      check_out: '2026-06-13T04:00:00.000Z',
      nights: 2,
      room_number: '1204',
      status: 'checked_in',
      booking_source: 'direct',
      verification_attempts: 1,
      special_request: 'late checkout',
      satisfaction_score: 5,
      created_at: '2026-06-11T05:00:00.000Z',
      updated_at: '2026-06-11T05:00:00.000Z',
    });
  });

  it('should serialize nullable columns as null', () => {
    const wire = serializeVisit(makeRow());
    expect(wire.check_out).toBeNull();
    expect(wire.nights).toBeNull();
    expect(wire.room_number).toBeNull();
    expect(wire.booking_source).toBeNull();
    expect(wire.satisfaction_score).toBeNull();
  });
});

describe('VisitsService.list', () => {
  function fakeRepo(rows: VisitRow[], total: number): VisitsRepository {
    return {
      findManyPaged: () => Promise.resolve(rows),
      countWhere: () => Promise.resolve(total),
    } as unknown as VisitsRepository;
  }

  it('should return the offset envelope with hasMore=true when more pages remain', async () => {
    const service = new VisitsService(fakeRepo([makeRow()], 25));
    const res = await service.list(ctx(), { page: '1', pageSize: '20' });
    expect(res.pageInfo).toEqual({ page: 1, pageSize: 20, total: 25, hasMore: true });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.id).toBe('visit-1');
  });

  it('should set hasMore=false on the last page', async () => {
    const service = new VisitsService(fakeRepo([makeRow()], 20));
    const res = await service.list(ctx(), { page: '1', pageSize: '20' });
    expect(res.pageInfo.hasMore).toBe(false);
  });

  it('should compute skip from page and pageSize', async () => {
    let observedSkip = -1;
    const repo = {
      findManyPaged: (_where: unknown, skip: number) => {
        observedSkip = skip;
        return Promise.resolve([]);
      },
      countWhere: () => Promise.resolve(0),
    } as unknown as VisitsRepository;
    const service = new VisitsService(repo);
    await service.list(ctx(), { page: '3', pageSize: '10' });
    expect(observedSkip).toBe(20);
  });
});

describe('parseVerifyManual', () => {
  it('should parse a reject body', () => {
    expect(parseVerifyManual({ action: 'reject' })).toEqual({ mode: 'reject' });
  });

  it('should reject an unknown action value', () => {
    expect(() => parseVerifyManual({ action: 'nope' })).toThrow(ValidationError);
  });

  it('should parse an approve body with the guest_name/room_number/nights trio', () => {
    expect(parseVerifyManual({ guest_name: 'Budi', room_number: '1204', nights: 2 })).toEqual({
      mode: 'approve',
      guestName: 'Budi',
      roomNumber: '1204',
      nights: 2,
    });
  });

  it('should throw ValidationError when nights is out of the 1..7 range', () => {
    expect(() => parseVerifyManual({ guest_name: 'Budi', room_number: '1204', nights: 8 })).toThrow(
      ValidationError,
    );
  });

  it('should throw ValidationError when an approve field is missing', () => {
    expect(() => parseVerifyManual({ guest_name: 'Budi', nights: 2 })).toThrow(ValidationError);
  });
});

describe('deriveCheckout', () => {
  it('should derive checkout at 11:00 UTC on check-in date + nights', () => {
    const checkIn = new Date('2026-06-11T13:00:00.000Z');
    expect(deriveCheckout(checkIn, 2, 'UTC').toISOString()).toBe('2026-06-13T11:00:00.000Z');
  });

  it('should derive checkout in a non-UTC timezone (Asia/Jakarta, UTC+7)', () => {
    // check-in 2026-06-11T13:00 WIB → +2 days, 11:00 WIB = 04:00 UTC on Jun 13.
    const checkIn = new Date('2026-06-11T06:00:00.000Z'); // 13:00 WIB
    expect(deriveCheckout(checkIn, 2, 'Asia/Jakarta').toISOString()).toBe(
      '2026-06-13T04:00:00.000Z',
    );
  });
});

describe('VisitsService.verifyManual', () => {
  function repoWith(row: VisitRow | null, count = 1, afterRow?: VisitRow): VisitsRepository {
    let calls = 0;
    return {
      findById: () => {
        calls += 1;
        // first call = pre-transition row; subsequent = post-transition row.
        return Promise.resolve(calls === 1 ? row : (afterRow ?? row));
      },
      verifyManualTx: () => Promise.resolve(count),
    } as unknown as VisitsRepository;
  }

  it('should approve a pending visit → checked_in with derived checkout', async () => {
    const pending = makeRow({ status: 'pending_verification' });
    const approved = makeRow({
      status: 'checked_in',
      roomNumber: '1204',
      nights: 2,
      checkOut: new Date('2026-06-13T11:00:00.000Z'),
    });
    const service = new VisitsService(repoWith(pending, 1, approved), { timezone: 'UTC' });
    const res = await service.verifyManual(ctx(), 'visit-1', {
      guest_name: 'Budi',
      room_number: '1204',
      nights: 2,
    });
    expect(res.data.status).toBe('checked_in');
    expect(res.data.room_number).toBe('1204');
    expect(res.data.check_out).toBe('2026-06-13T11:00:00.000Z');
  });

  it('should reject a pending visit → rejected', async () => {
    const pending = makeRow({ status: 'pending_verification' });
    const rejected = makeRow({ status: 'rejected' });
    const service = new VisitsService(repoWith(pending, 1, rejected));
    const res = await service.verifyManual(ctx(), 'visit-1', { action: 'reject' });
    expect(res.data.status).toBe('rejected');
  });

  it('should raise NotFoundError when the visit does not exist', async () => {
    const service = new VisitsService(repoWith(null));
    await expect(
      service.verifyManual(ctx(), 'visit-1', { action: 'reject' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should reject a non-pending visit with BusinessRuleError (422) before writing', async () => {
    const service = new VisitsService(repoWith(makeRow({ status: 'checked_in' })));
    await expect(
      service.verifyManual(ctx(), 'visit-1', { action: 'reject' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('should tag the invalid-transition error with rule=INVALID_VISIT_TRANSITION', async () => {
    const service = new VisitsService(repoWith(makeRow({ status: 'cancelled' })));
    await expect(
      service.verifyManual(ctx(), 'visit-1', { action: 'reject' }),
    ).rejects.toMatchObject({
      code: 'BUSINESS_RULE',
      statusCode: 422,
      details: { rule: 'INVALID_VISIT_TRANSITION', from: 'cancelled', to: 'rejected' },
    });
  });

  it('should surface a concurrency loss (tx count 0) as BusinessRuleError', async () => {
    // pre-check passes (pending), but the guarded update matched 0 rows.
    const service = new VisitsService(repoWith(makeRow({ status: 'pending_verification' }), 0));
    await expect(
      service.verifyManual(ctx(), 'visit-1', { action: 'reject' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('should mask a cross-tenant visit as NotFoundError (404, anti-enumeration)', async () => {
    const service = new VisitsService(repoWith(makeRow({ hotelId: 'other-hotel' })));
    await expect(
      service.verifyManual(ctx({ hotelId: 'hotel-1' }), 'visit-1', { action: 'reject' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should fire the audit + socket no-op seams with ctx.userId on a resolved transition', async () => {
    const audit: unknown[] = [];
    const socket: unknown[] = [];
    const deps: VisitsServiceDeps = {
      recordVisitAudit: (e) => audit.push(e),
      onVerificationResolved: (e) => socket.push(e),
    };
    const service = new VisitsService(
      repoWith(makeRow({ status: 'pending_verification' }), 1, makeRow({ status: 'rejected' })),
      deps,
    );
    await service.verifyManual(ctx({ userId: 'user-9' }), 'visit-1', { action: 'reject' });
    expect(audit).toEqual([
      { visitId: 'visit-1', from: 'pending_verification', to: 'rejected', actorUserId: 'user-9' },
    ]);
    expect(socket).toEqual([{ visitId: 'visit-1', status: 'rejected' }]);
  });
});

describe('assertVisitTransition (R3 map)', () => {
  it('should allow pending_verification → checked_in and → rejected', () => {
    expect(() => assertVisitTransition('pending_verification', 'checked_in')).not.toThrow();
    expect(() => assertVisitTransition('pending_verification', 'rejected')).not.toThrow();
  });

  it('should allow failed_verification → checked_in', () => {
    expect(() => assertVisitTransition('failed_verification', 'checked_in')).not.toThrow();
  });

  it('should reject an out-of-map source with rule=INVALID_VISIT_TRANSITION', () => {
    expect(() => assertVisitTransition('checked_out', 'rejected')).toThrow(BusinessRuleError);
    try {
      assertVisitTransition('cancelled', 'checked_in');
    } catch (e) {
      expect(e).toMatchObject({
        code: 'BUSINESS_RULE',
        statusCode: 422,
        details: { rule: 'INVALID_VISIT_TRANSITION', from: 'cancelled', to: 'checked_in' },
      });
    }
  });
});

describe('parseApproveManual', () => {
  it('should accept guest_name + room_number with optional nights', () => {
    expect(parseApproveManual({ guest_name: 'Budi', room_number: '1204', nights: 3 })).toEqual({
      guestName: 'Budi',
      roomNumber: '1204',
      nights: 3,
    });
    expect(parseApproveManual({ guest_name: 'Budi', room_number: '1204' })).toEqual({
      guestName: 'Budi',
      roomNumber: '1204',
    });
  });

  it('should reject missing required fields and out-of-range nights', () => {
    expect(() => parseApproveManual({ room_number: '1204' })).toThrow(ValidationError);
    expect(() =>
      parseApproveManual({ guest_name: 'Budi', room_number: '1204', nights: 8 }),
    ).toThrow(ValidationError);
  });
});

describe('VisitsService.reject + approveManual', () => {
  function repoWith(row: VisitRow | null, count = 1, afterRow?: VisitRow): VisitsRepository {
    let calls = 0;
    return {
      findById: () => {
        calls += 1;
        return Promise.resolve(calls === 1 ? row : (afterRow ?? row));
      },
      verifyManualTx: () => Promise.resolve(count),
    } as unknown as VisitsRepository;
  }

  it('should reject a pending_verification visit → rejected', async () => {
    const service = new VisitsService(
      repoWith(makeRow({ status: 'pending_verification' }), 1, makeRow({ status: 'rejected' })),
    );
    const res = await service.reject(ctx(), 'visit-1');
    expect(res.data.status).toBe('rejected');
  });

  it('should 422 rejecting a non-pending visit before writing', async () => {
    const service = new VisitsService(repoWith(makeRow({ status: 'checked_in' })));
    await expect(service.reject(ctx(), 'visit-1')).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('should approve-manual a failed_verification visit → checked_in with derived checkout', async () => {
    const failed = makeRow({ status: 'failed_verification' });
    const approved = makeRow({
      status: 'checked_in',
      roomNumber: '1210',
      nights: 2,
      checkOut: new Date('2026-06-13T11:00:00.000Z'),
    });
    const service = new VisitsService(repoWith(failed, 1, approved), { timezone: 'UTC' });
    const res = await service.approveManual(ctx(), 'visit-1', {
      guest_name: 'Rahmat',
      room_number: '1210',
      nights: 2,
    });
    expect(res.data.status).toBe('checked_in');
    expect(res.data.check_out).toBe('2026-06-13T11:00:00.000Z');
  });

  it('should approve-manual without nights (checkout stays null)', async () => {
    const failed = makeRow({ status: 'failed_verification' });
    const approved = makeRow({ status: 'checked_in', roomNumber: '1210' });
    const service = new VisitsService(repoWith(failed, 1, approved));
    const res = await service.approveManual(ctx(), 'visit-1', {
      guest_name: 'Rahmat',
      room_number: '1210',
    });
    expect(res.data.status).toBe('checked_in');
    expect(res.data.check_out).toBeNull();
  });

  it('should 422 approve-manual on a non-failed source before writing', async () => {
    const service = new VisitsService(repoWith(makeRow({ status: 'checked_out' })));
    await expect(
      service.approveManual(ctx(), 'visit-1', { guest_name: 'R', room_number: '1' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('should 404 a cross-tenant reject (anti-enumeration)', async () => {
    const service = new VisitsService(repoWith(makeRow({ hotelId: 'other-hotel' })));
    await expect(service.reject(ctx({ hotelId: 'hotel-1' }), 'visit-1')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
