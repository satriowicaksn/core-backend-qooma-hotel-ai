import { describe, expect, it } from '@jest/globals';

import { NotFoundError, ValidationError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { GuestsRepository } from '../guests.repository.js';
import { parseGuestListQuery, parseGuestUpdate, parsePreferenceInput } from '../guests.schema.js';
import { serializeGuest, serializeVisit } from '../guests.serializer.js';
import { buildGuestListWhere, GuestsService } from '../guests.service.js';
import type { GuestDetailRow, GuestRow, VisitRow } from '../guests.types.js';

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return { hotelId: 'hotel-1', isSuperAdmin: false, role: 'gm_admin', ...overrides };
}

function makeGuest(overrides: Partial<GuestRow> = {}): GuestRow {
  return {
    id: 'guest-1',
    hotelId: 'hotel-1',
    name: 'Budi Santoso',
    waPhone: '+6281234567890',
    email: 'budi@example.com',
    privacyMode: 'standard',
    isVip: false,
    vipLevel: null,
    totalStays: 0,
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<GuestsRepository>): GuestsRepository {
  return {
    findManyAndCount: () => Promise.resolve({ rows: [], total: 0 }),
    findDetailById: () => Promise.resolve(null),
    findById: () => Promise.resolve(null),
    updateGuest: () => Promise.reject(new Error('not stubbed')),
    upsertPreferenceAndList: () => Promise.resolve([]),
    ...overrides,
  } as unknown as GuestsRepository;
}

describe('buildGuestListWhere', () => {
  it('should scope by hotelId for gm_admin', () => {
    expect(buildGuestListWhere(ctx(), { page: 1, pageSize: 20 })).toEqual({
      AND: [{ hotelId: 'hotel-1' }],
    });
  });

  it('should not scope by hotelId for super_admin', () => {
    expect(
      buildGuestListWhere(ctx({ isSuperAdmin: true, role: 'super_admin' }), {
        page: 1,
        pageSize: 20,
      }),
    ).toEqual({});
  });

  it('should search name and wa_phone in a single OR arm', () => {
    const where = buildGuestListWhere(ctx(), { q: 'budi', page: 1, pageSize: 20 });
    expect(where.AND).toContainEqual({
      OR: [
        { name: { contains: 'budi', mode: 'insensitive' } },
        { waPhone: { contains: 'budi', mode: 'insensitive' } },
      ],
    });
  });
});

describe('parseGuestListQuery', () => {
  it('should default page to 1 and pageSize to 20', () => {
    expect(parseGuestListQuery({})).toEqual({ page: 1, pageSize: 20 });
  });

  it('should clamp pageSize to 100', () => {
    expect(parseGuestListQuery({ pageSize: '500' }).pageSize).toBe(100);
  });

  it('should carry the q term through', () => {
    expect(parseGuestListQuery({ q: 'budi', page: '2' })).toEqual({
      q: 'budi',
      page: 2,
      pageSize: 20,
    });
  });
});

describe('parseGuestUpdate', () => {
  it('should map snake_case fields to the domain shape', () => {
    expect(parseGuestUpdate({ privacy_mode: 'vvip', is_vip: true, vip_level: 'gold' })).toEqual({
      privacyMode: 'vvip',
      isVip: true,
      vipLevel: 'gold',
    });
  });

  it('should reject wa_phone as an unknown/immutable field', () => {
    expect(() => parseGuestUpdate({ wa_phone: '+62811' })).toThrow(ValidationError);
  });

  it('should reject an invalid privacy_mode', () => {
    expect(() => parseGuestUpdate({ privacy_mode: 'secret' })).toThrow(ValidationError);
  });

  it('should allow email to be set to null', () => {
    expect(parseGuestUpdate({ email: null })).toEqual({ email: null });
  });
});

describe('parsePreferenceInput', () => {
  it('should map preference fields', () => {
    expect(parsePreferenceInput({ preference_type: 'pillow', preference_value: 'soft' })).toEqual({
      preferenceType: 'pillow',
      preferenceValue: 'soft',
    });
  });

  it('should reject a missing preference_value', () => {
    expect(() => parsePreferenceInput({ preference_type: 'pillow' })).toThrow(ValidationError);
  });
});

describe('serializeGuest — PII masking (§4.5)', () => {
  it('should not mask a standard guest', () => {
    const wire = serializeGuest(makeGuest(), ctx());
    expect(wire.name).toBe('Budi Santoso');
    expect(wire.wa_phone).toBe('+6281234567890');
    expect(wire.email).toBe('budi@example.com');
  });

  it('should not mask a vvip guest for gm_admin (all-access)', () => {
    const wire = serializeGuest(makeGuest({ privacyMode: 'vvip' }), ctx({ role: 'gm_admin' }));
    expect(wire.name).toBe('Budi Santoso');
    expect(wire.wa_phone).toBe('+6281234567890');
  });

  it('should mask a vvip guest for a non-gm viewer', () => {
    const wire = serializeGuest(
      makeGuest({ privacyMode: 'vvip' }),
      ctx({ role: 'dept_head', deptId: 'd1' }),
    );
    expect(wire.name).toBe('B***');
    expect(wire.wa_phone).toBe('+628******7890');
    expect(wire.email).toBe('b***@example.com');
  });
});

describe('serializeVisit', () => {
  it('should produce the ratified Q-B-05 wire shape', () => {
    const visit: VisitRow = {
      id: 'visit-1',
      hotelId: 'hotel-1',
      guestId: 'guest-1',
      checkIn: new Date('2026-06-10T06:00:00.000Z'),
      checkOut: null,
      nights: 2,
      roomNumber: '1204',
      status: 'pending_verification',
      bookingSource: 'direct',
      verificationAttempts: 0,
      specialRequest: null,
      satisfactionScore: null,
      createdAt: new Date('2026-06-10T06:00:00.000Z'),
      updatedAt: new Date('2026-06-10T06:00:00.000Z'),
    };
    expect(serializeVisit(visit)).toEqual({
      id: 'visit-1',
      guest_id: 'guest-1',
      check_in: '2026-06-10T06:00:00.000Z',
      check_out: null,
      nights: 2,
      room_number: '1204',
      status: 'pending_verification',
      booking_source: 'direct',
      verification_attempts: 0,
      special_request: null,
      satisfaction_score: null,
      created_at: '2026-06-10T06:00:00.000Z',
      updated_at: '2026-06-10T06:00:00.000Z',
    });
  });
});

describe('GuestsService', () => {
  it('should compute offset pageInfo with hasMore when more pages remain', async () => {
    const rows = [makeGuest({ id: 'g1' }), makeGuest({ id: 'g2' })];
    const service = new GuestsService(
      fakeRepo({ findManyAndCount: () => Promise.resolve({ rows, total: 25 }) }),
    );
    const res = await service.list(ctx(), { page: '1', pageSize: '2' });
    expect(res.data).toHaveLength(2);
    expect(res.pageInfo).toEqual({ page: 1, pageSize: 2, total: 25, hasMore: true });
  });

  it('should report hasMore false on the last page', async () => {
    const service = new GuestsService(
      fakeRepo({ findManyAndCount: () => Promise.resolve({ rows: [makeGuest()], total: 21 }) }),
    );
    const res = await service.list(ctx(), { page: '11', pageSize: '2' });
    expect(res.pageInfo.hasMore).toBe(false);
  });

  it('should 404 on detail when the guest is missing', async () => {
    const service = new GuestsService(fakeRepo({ findDetailById: () => Promise.resolve(null) }));
    await expect(service.detail(ctx(), 'guest-x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should 404 on update when the guest is missing', async () => {
    const service = new GuestsService(fakeRepo({ findById: () => Promise.resolve(null) }));
    await expect(service.update(ctx(), 'guest-x', { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should mask cross-tenant detail as NotFoundError', async () => {
    const detailRow = {
      ...makeGuest({ hotelId: 'other-hotel' }),
      preferences: [],
      visits: [],
    } as unknown as GuestDetailRow;
    const service = new GuestsService(
      fakeRepo({ findDetailById: () => Promise.resolve(detailRow) }),
    );
    await expect(service.detail(ctx(), 'guest-1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should upsert a preference and return the serialized list', async () => {
    const service = new GuestsService(
      fakeRepo({
        findById: () => Promise.resolve(makeGuest()),
        upsertPreferenceAndList: () =>
          Promise.resolve([
            {
              id: 'p1',
              hotelId: 'hotel-1',
              guestId: 'guest-1',
              preferenceType: 'pillow',
              preferenceValue: 'soft',
              createdAt: new Date('2026-06-01T00:00:00.000Z'),
              updatedAt: new Date('2026-06-01T00:00:00.000Z'),
            },
          ]),
      }),
    );
    const res = await service.addPreference(ctx(), 'guest-1', {
      preference_type: 'pillow',
      preference_value: 'soft',
    });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.preference_type).toBe('pillow');
  });
});
