import { describe, expect, it } from '@jest/globals';

import { ValidationError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { VisitsRepository } from '../visits.repository.js';
import { parseListQuery } from '../visits.schema.js';
import { serializeVisit } from '../visits.serializer.js';
import { buildVisitWhere, VisitsService } from '../visits.service.js';
import type { VisitRow } from '../visits.types.js';

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
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
