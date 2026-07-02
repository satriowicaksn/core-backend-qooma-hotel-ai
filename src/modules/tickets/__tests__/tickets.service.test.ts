import { describe, expect, it } from '@jest/globals';

import {
  AuthError,
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { TicketsRepository } from '../tickets.repository.js';
import {
  decodeCursor,
  encodeCursor,
  parseDepartmentUpdate,
  parseListQuery,
  parseStatusUpdate,
} from '../tickets.schema.js';
import { serializeTicketListItem } from '../tickets.serializer.js';
import { buildTicketWhere, TicketsService } from '../tickets.service.js';
import type { TicketDetailRow, TicketListRow, UserDirectory } from '../tickets.types.js';

const EMPTY_DIR: UserDirectory = new Map();

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: 'u-1',
    hotelId: 'hotel-1',
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function makeRow(overrides: Partial<TicketListRow> = {}): TicketListRow {
  const guest: TicketListRow['guest'] = {
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
    ...(overrides.guest ?? {}),
  };
  return {
    id: 'ticket-1',
    hotelId: 'hotel-1',
    ticketNumber: 'HSK-2606-048',
    guestId: 'guest-1',
    departmentId: 'dept-1',
    assignedUserId: null,
    createdBy: null,
    status: 'open',
    priority: 'normal',
    complaintType: null,
    complaintDetail: null,
    subject: 'Handuk tambahan',
    body: 'Kamar 1204 butuh handuk',
    isHighAlert: false,
    isOverdue: false,
    resolvedSatisfaction: null,
    slaDueAt: null,
    closedAt: null,
    createdAt: new Date('2026-06-11T07:32:14.000Z'),
    updatedAt: new Date('2026-06-11T07:32:14.000Z'),
    guest,
    assignedUser: null,
    ...overrides,
  };
}

describe('buildTicketWhere', () => {
  it('should scope by hotelId when role is gm_admin', () => {
    const where = buildTicketWhere(ctx(), {});
    expect(where).toEqual({ AND: [{ hotelId: 'hotel-1' }] });
  });

  it('should not scope by hotelId when caller is super_admin', () => {
    const where = buildTicketWhere(ctx({ isSuperAdmin: true, role: 'super_admin' }), {});
    expect(where).toEqual({});
  });

  it('should force department filter when role is dept_head', () => {
    const where = buildTicketWhere(ctx({ role: 'dept_head', deptId: 'dept-9' }), {});
    expect(where).toEqual({ AND: [{ hotelId: 'hotel-1' }, { departmentId: 'dept-9' }] });
  });

  it('should throw AuthError when dept_head has no deptId', () => {
    expect(() => buildTicketWhere(ctx({ role: 'dept_head' }), {})).toThrow(AuthError);
  });

  it('should map status and complaint_type CSV filters to IN clauses', () => {
    const where = buildTicketWhere(ctx(), {
      status: ['open', 'in_progress'],
      complaintType: ['facility', 'fnb'],
    });
    expect(where.AND).toContainEqual({ status: { in: ['open', 'in_progress'] } });
    expect(where.AND).toContainEqual({ complaintType: { in: ['facility', 'fnb'] } });
  });

  it('should build the q-search OR in its own AND arm', () => {
    const where = buildTicketWhere(ctx(), { q: 'handuk' });
    const arms = where.AND as Array<Record<string, unknown>>;
    const qArm = arms.find((a) => 'OR' in a);
    expect(qArm).toEqual({
      OR: [
        { ticketNumber: { contains: 'handuk', mode: 'insensitive' } },
        { body: { contains: 'handuk', mode: 'insensitive' } },
        { guest: { is: { name: { contains: 'handuk', mode: 'insensitive' } } } },
      ],
    });
  });

  it('should keep the cursor keyset OR separate from the q-search OR', () => {
    const where = buildTicketWhere(
      ctx(),
      { q: 'handuk' },
      {
        createdAt: '2026-06-11T07:32:14.000Z',
        id: 'ticket-1',
      },
    );
    const arms = where.AND as Array<Record<string, unknown>>;
    const orArms = arms.filter((a) => 'OR' in a);
    expect(orArms).toHaveLength(2);
    const cursorArm = orArms.find(
      (a) => Array.isArray(a.OR) && (a.OR as unknown[]).some((c) => 'id' in (c as object)),
    );
    expect(cursorArm).toEqual({
      OR: [
        { createdAt: { lt: new Date('2026-06-11T07:32:14.000Z') } },
        { createdAt: new Date('2026-06-11T07:32:14.000Z'), id: { lt: 'ticket-1' } },
      ],
    });
  });

  it('should combine date_from and date_to into a single createdAt range', () => {
    const where = buildTicketWhere(ctx(), {
      dateFrom: new Date('2026-06-01T00:00:00.000Z'),
      dateTo: new Date('2026-06-30T00:00:00.000Z'),
    });
    expect(where.AND).toContainEqual({
      createdAt: {
        gte: new Date('2026-06-01T00:00:00.000Z'),
        lte: new Date('2026-06-30T00:00:00.000Z'),
      },
    });
  });
});

describe('cursor codec', () => {
  it('should round-trip a cursor through encode and decode', () => {
    const cursor = {
      createdAt: '2026-06-11T07:32:14.000Z',
      id: '11111111-1111-4111-8111-111111111111',
    };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('should throw ValidationError when the cursor is not valid base64 json', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(ValidationError);
  });

  it('should throw ValidationError when the cursor payload shape is wrong', () => {
    const bad = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf8').toString('base64url');
    expect(() => decodeCursor(bad)).toThrow(ValidationError);
  });
});

describe('parseListQuery', () => {
  it('should default limit to 20 when omitted', () => {
    expect(parseListQuery({}).limit).toBe(20);
  });

  it('should clamp limit to 100 when the request exceeds the max', () => {
    expect(parseListQuery({ limit: '500' }).limit).toBe(100);
  });

  it('should parse a status CSV into a typed array', () => {
    expect(parseListQuery({ status: 'open,closed' }).filters.status).toEqual(['open', 'closed']);
  });

  it('should throw ValidationError when a status value is invalid', () => {
    expect(() => parseListQuery({ status: 'open,bogus' })).toThrow(ValidationError);
  });

  it('should throw ValidationError when guest_id is not a uuid', () => {
    expect(() => parseListQuery({ guest_id: 'nope' })).toThrow(ValidationError);
  });

  it('should decode a supplied cursor into the normalized query', () => {
    const cursor = encodeCursor({
      createdAt: '2026-06-11T07:32:14.000Z',
      id: '11111111-1111-4111-8111-111111111111',
    });
    expect(parseListQuery({ cursor }).cursor).toEqual({
      createdAt: '2026-06-11T07:32:14.000Z',
      id: '11111111-1111-4111-8111-111111111111',
    });
  });
});

describe('serializeTicketListItem — PII masking (§4.5)', () => {
  it('should always mask wa_phone as wa_phone_masked', () => {
    const wire = serializeTicketListItem(makeRow(), ctx(), EMPTY_DIR);
    expect(wire.wa_phone_masked).toBe('+628******7890');
  });

  it('should not mask guest name for gm_admin even when guest is vvip', () => {
    const row = makeRow({ guest: { ...makeRow().guest, privacyMode: 'vvip' } });
    const wire = serializeTicketListItem(row, ctx({ role: 'gm_admin' }), EMPTY_DIR);
    expect(wire.guest_name).toBe('Budi Santoso');
  });

  it('should mask guest name for dept_head when guest is vvip', () => {
    const row = makeRow({ guest: { ...makeRow().guest, privacyMode: 'vvip' } });
    const wire = serializeTicketListItem(
      row,
      ctx({ role: 'dept_head', deptId: 'dept-1' }),
      EMPTY_DIR,
    );
    expect(wire.guest_name).toBe('B***');
  });

  it('should not mask guest name when guest is not vvip', () => {
    const row = makeRow({ guest: { ...makeRow().guest, privacyMode: 'standard' } });
    const wire = serializeTicketListItem(
      row,
      ctx({ role: 'dept_head', deptId: 'dept-1' }),
      EMPTY_DIR,
    );
    expect(wire.guest_name).toBe('Budi Santoso');
  });

  it('should resolve assigned_to from the user directory when present', () => {
    const row = makeRow({ assignedUserId: 'user-7' });
    const dir: UserDirectory = new Map([['user-7', { name: 'Sari', role: 'dept_head' }]]);
    const wire = serializeTicketListItem(row, ctx(), dir);
    expect(wire.assigned_to).toBe('Sari');
  });

  it('should serialize assigned_to as null when the user is absent from the directory', () => {
    const wire = serializeTicketListItem(makeRow({ assignedUserId: 'user-7' }), ctx(), EMPTY_DIR);
    expect(wire.assigned_to).toBeNull();
  });
});

describe('buildTicketWhere — scalar filters', () => {
  it('should push a discrete AND arm for each scalar filter', () => {
    const where = buildTicketWhere(ctx(), {
      priority: 'urgent',
      departmentId: 'dept-3',
      guestId: 'guest-3',
      isHighAlert: true,
    });
    expect(where.AND).toContainEqual({ priority: 'urgent' });
    expect(where.AND).toContainEqual({ departmentId: 'dept-3' });
    expect(where.AND).toContainEqual({ guestId: 'guest-3' });
    expect(where.AND).toContainEqual({ isHighAlert: true });
  });

  it('should route is_overdue=true through the computed overdue predicate, not the column', () => {
    const now = new Date('2026-06-11T09:00:00.000Z');
    const where = buildTicketWhere(ctx(), { isOverdue: true }, undefined, now);
    expect(where.AND).toContainEqual({
      slaDueAt: { lt: now },
      status: { notIn: ['closed', 'cancelled'] },
    });
    expect(JSON.stringify(where.AND)).not.toContain('isOverdue');
  });

  it('should route is_overdue=false through the negated overdue predicate', () => {
    const now = new Date('2026-06-11T09:00:00.000Z');
    const where = buildTicketWhere(ctx(), { isOverdue: false }, undefined, now);
    expect(where.AND).toContainEqual({
      NOT: { slaDueAt: { lt: now }, status: { notIn: ['closed', 'cancelled'] } },
    });
  });

  it('should build an open createdAt lower bound when only date_from is set', () => {
    const where = buildTicketWhere(ctx(), { dateFrom: new Date('2026-06-01T00:00:00.000Z') });
    expect(where.AND).toContainEqual({
      createdAt: { gte: new Date('2026-06-01T00:00:00.000Z') },
    });
  });
});

describe('TicketsService.list — pagination + directory (fake repo)', () => {
  function fakeRepo(rows: TicketListRow[]): TicketsRepository {
    return {
      findMany: (_where: unknown, take: number): Promise<TicketListRow[]> =>
        Promise.resolve(rows.slice(0, take)),
      findDetailById: (): Promise<null> => Promise.resolve(null),
    } as unknown as TicketsRepository;
  }

  it('should emit a nextCursor and resolve assigned_to when there is another page', async () => {
    const rows = [
      makeRow({ id: 'ticket-1', assignedUserId: 'user-7' }),
      makeRow({ id: 'ticket-2', assignedUserId: 'user-7' }),
    ];
    const service = new TicketsService(fakeRepo(rows), {
      resolveUsers: (): Promise<UserDirectory> =>
        Promise.resolve(new Map([['user-7', { name: 'Sari', role: 'dept_head' }]])),
    });

    const res = await service.list(ctx(), { limit: '1' });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.assigned_to).toBe('Sari');
    expect(res.pageInfo.hasMore).toBe(true);
    expect(res.pageInfo.nextCursor).not.toBeNull();
  });
});

function makeDetailRow(overrides: Partial<TicketListRow> = {}): TicketDetailRow {
  return { ...makeRow(overrides), updates: [], messages: [] } as unknown as TicketDetailRow;
}

describe('parseStatusUpdate / parseDepartmentUpdate', () => {
  it('should accept a valid status with optional note', () => {
    expect(parseStatusUpdate({ status: 'in_progress', note: 'picked up' })).toEqual({
      status: 'in_progress',
      note: 'picked up',
    });
    expect(parseStatusUpdate({ status: 'cancelled' })).toEqual({ status: 'cancelled', note: null });
  });

  it('should reject an unknown status and unknown keys', () => {
    expect(() => parseStatusUpdate({ status: 'bogus' })).toThrow(ValidationError);
    expect(() => parseStatusUpdate({ status: 'open', extra: 1 })).toThrow(ValidationError);
  });

  it('should require a uuid department_id', () => {
    expect(
      parseDepartmentUpdate({ department_id: '11111111-1111-4111-8111-111111111111' }),
    ).toEqual({
      departmentId: '11111111-1111-4111-8111-111111111111',
      note: null,
    });
    expect(() => parseDepartmentUpdate({ department_id: 'nope' })).toThrow(ValidationError);
  });
});

describe('TicketsService.updateStatus', () => {
  function repo(overrides: Partial<TicketsRepository>): TicketsRepository {
    return {
      findById: () => Promise.resolve(makeRow({ status: 'open' })),
      findDetailById: () => Promise.resolve(makeDetailRow({ status: 'in_progress' })),
      transitionStatusTx: () => Promise.resolve(1),
      ...overrides,
    } as unknown as TicketsRepository;
  }

  it('should 404 when the ticket is missing', async () => {
    const service = new TicketsService(repo({ findById: () => Promise.resolve(null) }));
    await expect(
      service.updateStatus(ctx(), 't1', { status: 'in_progress' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should reject an invalid transition with BusinessRuleError (422) before writing', async () => {
    let wrote = false;
    const service = new TicketsService(
      repo({
        findById: () => Promise.resolve(makeRow({ status: 'open' })),
        transitionStatusTx: () => {
          wrote = true;
          return Promise.resolve(1);
        },
      }),
    );
    // open → closed is not a valid transition
    await expect(service.updateStatus(ctx(), 't1', { status: 'closed' })).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
    expect(wrote).toBe(false);
  });

  it('should commit a valid transition and fire the socket seam', async () => {
    const events: Array<{ ticketId: string; changed: readonly string[] }> = [];
    const service = new TicketsService(repo({}), {
      onTicketUpdated: (e) => events.push(e),
    });
    const res = await service.updateStatus(ctx(), 't1', { status: 'in_progress' });
    expect(res.data.status).toBe('in_progress');
    expect(events).toEqual([{ ticketId: 't1', changed: ['status'] }]);
  });

  it('should surface a concurrency loss (count 0) as BusinessRuleError', async () => {
    const service = new TicketsService(
      repo({
        findById: () => Promise.resolve(makeRow({ status: 'open' })),
        transitionStatusTx: () => Promise.resolve(0),
      }),
    );
    await expect(
      service.updateStatus(ctx(), 't1', { status: 'in_progress' }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });
});

describe('TicketsService.reroute', () => {
  function repo(overrides: Partial<TicketsRepository>): TicketsRepository {
    return {
      findById: () => Promise.resolve(makeRow({ departmentId: 'dept-1' })),
      findDepartmentById: () => Promise.resolve({ id: 'dept-2', hotelId: 'hotel-1' }),
      findDetailById: () => Promise.resolve(makeDetailRow({ departmentId: 'dept-2' })),
      rerouteTx: () => Promise.resolve(undefined),
      ...overrides,
    } as unknown as TicketsRepository;
  }

  it('should 403 when a dept_head attempts a reroute', async () => {
    const service = new TicketsService(repo({}));
    await expect(
      service.reroute(ctx({ role: 'dept_head', deptId: 'dept-1' }), 't1', {
        department_id: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('should 404 when the target department is missing or cross-hotel', async () => {
    const service = new TicketsService(
      repo({ findDepartmentById: () => Promise.resolve({ id: 'dept-2', hotelId: 'other' }) }),
    );
    await expect(
      service.reroute(ctx(), 't1', { department_id: '22222222-2222-4222-8222-222222222222' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('should reroute and fire the socket seam', async () => {
    const events: Array<{ ticketId: string; fromDepartmentId: string; toDepartmentId: string }> =
      [];
    const service = new TicketsService(repo({}), { onTicketRerouted: (e) => events.push(e) });
    const res = await service.reroute(ctx(), 't1', {
      department_id: '22222222-2222-4222-8222-222222222222',
    });
    expect(res.data.department_id).toBe('dept-2');
    expect(events[0]?.fromDepartmentId).toBe('dept-1');
  });
});
