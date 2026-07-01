import { describe, expect, it } from '@jest/globals';
import type { Prisma } from '@prisma/client';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { isOverdue, notOverdueWhere, overdueWhere } from '../tickets.overdue.js';
import type { TicketsRepository } from '../tickets.repository.js';
import { serializeStats, serializeTicketListItem } from '../tickets.serializer.js';
import { buildOverdueWhere, buildScopeArms, TicketsService } from '../tickets.service.js';
import type { TicketListRow } from '../tickets.types.js';

const NOW = new Date('2026-06-11T12:00:00.000Z');

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return { hotelId: 'hotel-1', isSuperAdmin: false, role: 'gm_admin', ...overrides };
}

function makeRow(overrides: Partial<TicketListRow> = {}): TicketListRow {
  const guest: TicketListRow['guest'] = {
    id: 'guest-1',
    hotelId: 'hotel-1',
    name: 'Budi',
    waPhone: '+6281234567890',
    email: null,
    privacyMode: 'standard',
    isVip: false,
    vipLevel: null,
    totalStays: 0,
    createdAt: NOW,
    updatedAt: NOW,
  };
  return {
    id: 'ticket-1',
    hotelId: 'hotel-1',
    ticketNumber: 'HSK-2606-001',
    guestId: 'guest-1',
    departmentId: 'dept-1',
    assignedUserId: null,
    createdBy: null,
    status: 'in_progress',
    priority: 'normal',
    complaintType: null,
    complaintDetail: null,
    subject: 's',
    body: null,
    isHighAlert: false,
    isOverdue: false,
    resolvedSatisfaction: null,
    slaDueAt: null,
    closedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    guest,
    assignedUser: null,
    ...overrides,
  };
}

describe('isOverdue (single source of truth)', () => {
  const past = new Date('2026-06-11T11:00:00.000Z');
  const future = new Date('2026-06-11T13:00:00.000Z');

  it('should be true when sla_due_at is past and status is active', () => {
    expect(isOverdue({ slaDueAt: past, status: 'in_progress' }, NOW)).toBe(true);
  });

  it('should be false when sla_due_at is null', () => {
    expect(isOverdue({ slaDueAt: null, status: 'in_progress' }, NOW)).toBe(false);
  });

  it('should be false when sla_due_at is in the future', () => {
    expect(isOverdue({ slaDueAt: future, status: 'in_progress' }, NOW)).toBe(false);
  });

  it('should be false for a terminal status even when past sla', () => {
    expect(isOverdue({ slaDueAt: past, status: 'closed' }, NOW)).toBe(false);
    expect(isOverdue({ slaDueAt: past, status: 'cancelled' }, NOW)).toBe(false);
  });
});

describe('overdue WHERE builders', () => {
  it('should encode the same rule as isOverdue', () => {
    expect(overdueWhere(NOW)).toEqual({
      slaDueAt: { lt: NOW },
      status: { notIn: ['closed', 'cancelled'] },
    });
  });

  it('should negate via NOT for notOverdueWhere', () => {
    expect(notOverdueWhere(NOW)).toEqual({ NOT: overdueWhere(NOW) });
  });

  it('should compose scope arms with the overdue predicate', () => {
    const where = buildOverdueWhere(ctx({ role: 'dept_head', deptId: 'dept-9' }), NOW);
    expect(where).toEqual({
      AND: [{ hotelId: 'hotel-1' }, { departmentId: 'dept-9' }, overdueWhere(NOW)],
    });
  });
});

describe('buildScopeArms', () => {
  it('should be empty for super_admin', () => {
    expect(buildScopeArms(ctx({ isSuperAdmin: true, role: 'super_admin' }))).toEqual([]);
  });

  it('should include hotel scope for gm_admin', () => {
    expect(buildScopeArms(ctx())).toEqual([{ hotelId: 'hotel-1' }]);
  });
});

describe('serializeStats', () => {
  it('should zero-fill all 8 statuses and sum the total', () => {
    const wire = serializeStats(
      [
        { status: 'open', count: 3 },
        { status: 'closed', count: 5 },
      ],
      2,
      4,
    );
    expect(wire.by_status).toEqual({
      open: 3,
      in_progress: 0,
      awaiting_late_reason: 0,
      done_pending: 0,
      closed: 5,
      high_alert: 0,
      escalated: 0,
      cancelled: 0,
    });
    expect(wire.total).toBe(8);
    expect(wire.overdue).toBe(2);
    expect(wire.high_alert_count).toBe(4);
  });

  it('should ignore an unknown status label but still count it in the total', () => {
    const wire = serializeStats([{ status: 'bogus', count: 7 }], 0, 0);
    expect(wire.by_status.open).toBe(0);
    expect(wire.total).toBe(7);
  });
});

describe('serializeTicketListItem — computed is_overdue', () => {
  it('should compute is_overdue from sla_due_at + now, not the dormant column', () => {
    const row = makeRow({ isOverdue: false, slaDueAt: new Date('2026-06-11T11:00:00.000Z') });
    const wire = serializeTicketListItem(row, ctx(), new Map(), NOW);
    expect(wire.is_overdue).toBe(true);
  });
});

describe('TicketsService.stats + overdue (fake repo)', () => {
  function fakeRepo(overrides: Partial<TicketsRepository>): TicketsRepository {
    return {
      groupCountByStatus: () => Promise.resolve([]),
      countWhere: () => Promise.resolve(0),
      findOverdue: () => Promise.resolve([]),
      ...overrides,
    } as unknown as TicketsRepository;
  }

  it('should assemble the ratified stats shape from grouped + overdue + high-alert counts', async () => {
    const repo = fakeRepo({
      groupCountByStatus: () =>
        Promise.resolve([
          { status: 'open', count: 3 },
          { status: 'closed', count: 5 },
        ]),
      countWhere: (w: Prisma.TicketWhereInput) =>
        Promise.resolve(JSON.stringify(w).includes('slaDueAt') ? 2 : 4),
    });
    const service = new TicketsService(repo);
    const res = await service.stats(ctx(), NOW);
    expect(res.data.total).toBe(8);
    expect(res.data.overdue).toBe(2);
    expect(res.data.high_alert_count).toBe(4);
    expect(res.data.by_status.open).toBe(3);
  });

  it('should top-N paginate overdue and serialize is_overdue=true', async () => {
    const rows = [
      makeRow({ id: 't1', slaDueAt: new Date('2026-06-11T10:00:00.000Z') }),
      makeRow({ id: 't2', slaDueAt: new Date('2026-06-11T10:30:00.000Z') }),
      makeRow({ id: 't3', slaDueAt: new Date('2026-06-11T11:00:00.000Z') }),
    ];
    const repo = fakeRepo({
      findOverdue: (_w: Prisma.TicketWhereInput, take: number) =>
        Promise.resolve(rows.slice(0, take)),
    });
    const service = new TicketsService(repo);
    const res = await service.overdue(ctx(), { limit: '2' }, NOW);
    expect(res.data).toHaveLength(2);
    expect(res.pageInfo.hasMore).toBe(true);
    expect(res.pageInfo.nextCursor).toBeNull();
    expect(res.data[0]?.is_overdue).toBe(true);
  });
});
