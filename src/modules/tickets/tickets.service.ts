// Service: scope resolution + filter/cursor assembly + serialization orchestration.
// Consumes T03's TenantContext seam; Prisma access via the repository.

import type { Prisma } from '@prisma/client';

import {
  AuthError,
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from '@core/errors/app-errors.js';

import {
  assertDeptOwnership,
  assertHotelOwnership,
  type TenantContext,
} from '@plugins/tenant-guard.js';
import {
  assertValidTicketTransition,
  type TicketStatus,
} from '@shared/utils/ticket-state-machine.js';

import { notOverdueWhere, overdueWhere } from './tickets.overdue.js';
import type { TicketsRepository } from './tickets.repository.js';
import {
  encodeCursor,
  parseDepartmentUpdate,
  parseListQuery,
  parseOverdueQuery,
  parseStatusUpdate,
} from './tickets.schema.js';
import {
  serializeStats,
  serializeTicketDetail,
  serializeTicketListItem,
} from './tickets.serializer.js';
import type {
  OverdueListResponse,
  TicketCursor,
  TicketDetailResponse,
  TicketListFilters,
  TicketListResponse,
  TicketStatsResponse,
  UserDirectory,
} from './tickets.types.js';

const EMPTY_DIRECTORY: UserDirectory = new Map();

export interface TicketsServiceDeps {
  // Resolves Auth-owned user ids → { name, role }. Absent in dev (GAP T11-#2) →
  // assigned_to / actor_name / actor_role serialize as null.
  readonly resolveUsers?: (userIds: readonly string[]) => Promise<UserDirectory>;
  // Socket emit seams — T20 wires the real gateway; default no-op (TT6).
  readonly onTicketUpdated?: (evt: { ticketId: string; changed: readonly string[] }) => void;
  readonly onTicketRerouted?: (evt: {
    ticketId: string;
    fromDepartmentId: string;
    toDepartmentId: string;
  }) => void;
}

// Tenant + dept scope arms — the single scope implementation reused by the list,
// stats, and overdue builders (E3). Explicit super_admin bypass; N2: a dept_head
// with no deptId must not silently drop the filter (tenant leak) → AuthError.
export function buildScopeArms(ctx: TenantContext): Prisma.TicketWhereInput[] {
  const arms: Prisma.TicketWhereInput[] = [];
  if (!ctx.isSuperAdmin) {
    arms.push({ hotelId: ctx.hotelId });
  }
  if (ctx.role === 'dept_head') {
    if (!ctx.deptId) {
      throw new AuthError('dept_head session is missing department scope');
    }
    arms.push({ departmentId: ctx.deptId });
  }
  return arms;
}

function scopeWhere(ctx: TenantContext): Prisma.TicketWhereInput {
  const arms = buildScopeArms(ctx);
  return arms.length > 0 ? { AND: arms } : {};
}

// Overdue is COMPUTED (tickets.overdue.ts is the single source of truth), never
// read from the dormant is_overdue column.
export function buildOverdueWhere(ctx: TenantContext, now: Date): Prisma.TicketWhereInput {
  return { AND: [...buildScopeArms(ctx), overdueWhere(now)] };
}

// Pure WHERE builder — unit-tested without a DB. N1: the q-search OR and the
// cursor keyset OR each live in their own AND arm so they never collapse together.
export function buildTicketWhere(
  ctx: TenantContext,
  filters: TicketListFilters,
  cursor?: TicketCursor,
  now: Date = new Date(),
): Prisma.TicketWhereInput {
  const and: Prisma.TicketWhereInput[] = buildScopeArms(ctx);

  if (filters.status) {
    and.push({ status: { in: [...filters.status] } });
  }
  if (filters.priority) {
    and.push({ priority: filters.priority });
  }
  if (filters.complaintType) {
    and.push({ complaintType: { in: [...filters.complaintType] } });
  }
  if (filters.departmentId) {
    and.push({ departmentId: filters.departmentId });
  }
  if (filters.guestId) {
    and.push({ guestId: filters.guestId });
  }
  if (filters.isHighAlert !== undefined) {
    and.push({ isHighAlert: filters.isHighAlert });
  }
  if (filters.isOverdue !== undefined) {
    and.push(filters.isOverdue ? overdueWhere(now) : notOverdueWhere(now));
  }
  if (filters.dateFrom || filters.dateTo) {
    and.push({
      createdAt: {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      },
    });
  }

  if (filters.q) {
    and.push({
      OR: [
        { ticketNumber: { contains: filters.q, mode: 'insensitive' } },
        { body: { contains: filters.q, mode: 'insensitive' } },
        { guest: { is: { name: { contains: filters.q, mode: 'insensitive' } } } },
      ],
    });
  }

  if (cursor) {
    const createdAt = new Date(cursor.createdAt);
    and.push({
      OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: cursor.id } }],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly deps: TicketsServiceDeps = {},
  ) {}

  async list(ctx: TenantContext, rawQuery: unknown): Promise<TicketListResponse> {
    const now = new Date();
    const query = parseListQuery(rawQuery);
    const where = buildTicketWhere(ctx, query.filters, query.cursor, now);
    const rows = await this.repo.findMany(where, query.limit + 1);

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    const dir = await this.resolveDirectory(page.map((r) => r.assignedUserId));
    const data = page.map((r) => serializeTicketListItem(r, ctx, dir, now));
    return { data, pageInfo: { nextCursor, hasMore } };
  }

  async detail(ctx: TenantContext, id: string): Promise<TicketDetailResponse> {
    const now = new Date();
    const row = await this.repo.findDetailById(id);
    if (!row) {
      throw new NotFoundError('Ticket', id);
    }
    assertHotelOwnership(ctx, row.hotelId, 'Ticket');
    assertDeptOwnership(ctx, row.departmentId, 'Ticket');

    const dir = await this.resolveDirectory([
      row.assignedUserId,
      ...row.updates.map((u) => u.actorUserId),
    ]);
    return { data: serializeTicketDetail(row, ctx, dir, now) };
  }

  async stats(ctx: TenantContext, now: Date = new Date()): Promise<TicketStatsResponse> {
    const scope = scopeWhere(ctx);
    const [byStatus, overdue, highAlert] = await Promise.all([
      this.repo.groupCountByStatus(scope),
      this.repo.countWhere(buildOverdueWhere(ctx, now)),
      this.repo.countWhere({ AND: [scope, { isHighAlert: true }] }),
    ]);
    return { data: serializeStats(byStatus, overdue, highAlert) };
  }

  async overdue(
    ctx: TenantContext,
    rawQuery: unknown,
    now: Date = new Date(),
  ): Promise<OverdueListResponse> {
    const { limit } = parseOverdueQuery(rawQuery);
    const where = buildOverdueWhere(ctx, now);
    const rows = await this.repo.findOverdue(where, limit + 1);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const dir = await this.resolveDirectory(page.map((r) => r.assignedUserId));
    const data = page.map((r) => serializeTicketListItem(r, ctx, dir, now));
    return { data, pageInfo: { nextCursor: null, hasMore } };
  }

  async updateStatus(
    ctx: TenantContext,
    id: string,
    rawBody: unknown,
  ): Promise<TicketDetailResponse> {
    const { status: to, note } = parseStatusUpdate(rawBody);
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundError('Ticket', id);
    }
    // Scope by the TICKET's hotel (super_admin acts cross-hotel); dept_head own-dept only.
    assertHotelOwnership(ctx, row.hotelId, 'Ticket');
    assertDeptOwnership(ctx, row.departmentId, 'Ticket');
    // Consume the merged state machine (no reimplement, §4.2) → 422 on invalid.
    assertValidTicketTransition(row.status as TicketStatus, to);

    const count = await this.repo.transitionStatusTx({
      id,
      hotelId: row.hotelId,
      from: row.status,
      to,
      note,
      actorUserId: ctx.userId,
    });
    if (count === 0) {
      // Optimistic-concurrency loss: the guarded update matched 0 rows.
      const fresh = await this.repo.findById(id);
      if (!fresh) {
        throw new NotFoundError('Ticket', id);
      }
      throw new BusinessRuleError('Ticket status changed concurrently', {
        rule: 'INVALID_TICKET_TRANSITION',
        from: fresh.status,
        to,
      });
    }
    this.deps.onTicketUpdated?.({ ticketId: id, changed: ['status'] });
    return this.detail(ctx, id);
  }

  async reroute(ctx: TenantContext, id: string, rawBody: unknown): Promise<TicketDetailResponse> {
    const { departmentId: toDeptId, note } = parseDepartmentUpdate(rawBody);
    // Reroute is gm_admin-only (MVP §5 AC) — role gate precedes resource lookup.
    if (ctx.role === 'dept_head') {
      throw new ForbiddenError('Reroute is restricted to gm_admin');
    }
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundError('Ticket', id);
    }
    assertHotelOwnership(ctx, row.hotelId, 'Ticket');

    const dept = await this.repo.findDepartmentById(toDeptId);
    if (!dept || dept.hotelId !== row.hotelId) {
      throw new NotFoundError('Department', toDeptId);
    }
    if (dept.id !== row.departmentId) {
      await this.repo.rerouteTx({
        id,
        hotelId: row.hotelId,
        fromDeptId: row.departmentId,
        toDeptId,
        note,
        actorUserId: ctx.userId,
      });
      this.deps.onTicketRerouted?.({
        ticketId: id,
        fromDepartmentId: row.departmentId,
        toDepartmentId: toDeptId,
      });
    }
    return this.detail(ctx, id);
  }

  private async resolveDirectory(ids: readonly (string | null)[]): Promise<UserDirectory> {
    const { resolveUsers } = this.deps;
    if (!resolveUsers) {
      return EMPTY_DIRECTORY;
    }
    const unique = [...new Set(ids.filter((v): v is string => v !== null))];
    if (unique.length === 0) {
      return EMPTY_DIRECTORY;
    }
    return resolveUsers(unique);
  }
}
