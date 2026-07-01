// Service: scope resolution + filter/cursor assembly + serialization orchestration.
// Consumes T03's TenantContext seam; Prisma access via the repository.

import type { Prisma } from '@prisma/client';

import { AuthError, NotFoundError } from '@core/errors/app-errors.js';

import {
  assertDeptOwnership,
  assertHotelOwnership,
  type TenantContext,
} from '@plugins/tenant-guard.js';

import type { TicketsRepository } from './tickets.repository.js';
import { encodeCursor, parseListQuery } from './tickets.schema.js';
import { serializeTicketDetail, serializeTicketListItem } from './tickets.serializer.js';
import type {
  TicketCursor,
  TicketDetailResponse,
  TicketListFilters,
  TicketListResponse,
  UserDirectory,
} from './tickets.types.js';

const EMPTY_DIRECTORY: UserDirectory = new Map();

export interface TicketsServiceDeps {
  // Resolves Auth-owned user ids → { name, role }. Absent in dev (GAP T11-#2) →
  // assigned_to / actor_name / actor_role serialize as null.
  readonly resolveUsers?: (userIds: readonly string[]) => Promise<UserDirectory>;
}

// Pure WHERE builder — unit-tested without a DB. N1: the q-search OR and the
// cursor keyset OR each live in their own AND arm so they never collapse together.
export function buildTicketWhere(
  ctx: TenantContext,
  filters: TicketListFilters,
  cursor?: TicketCursor,
): Prisma.TicketWhereInput {
  const and: Prisma.TicketWhereInput[] = [];

  if (!ctx.isSuperAdmin) {
    and.push({ hotelId: ctx.hotelId });
  }

  if (ctx.role === 'dept_head') {
    if (!ctx.deptId) {
      throw new AuthError('dept_head session is missing department scope');
    }
    and.push({ departmentId: ctx.deptId });
  }

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
    and.push({ isOverdue: filters.isOverdue });
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
    const query = parseListQuery(rawQuery);
    const where = buildTicketWhere(ctx, query.filters, query.cursor);
    const rows = await this.repo.findMany(where, query.limit + 1);

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    const dir = await this.resolveDirectory(page.map((r) => r.assignedUserId));
    const data = page.map((r) => serializeTicketListItem(r, ctx, dir));
    return { data, pageInfo: { nextCursor, hasMore } };
  }

  async detail(ctx: TenantContext, id: string): Promise<TicketDetailResponse> {
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
    return { data: serializeTicketDetail(row, ctx, dir) };
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
