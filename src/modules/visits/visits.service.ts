// Service: tenant scope + status filter assembly + offset paging + serialization.
// Consumes T03's TenantContext seam; Prisma access via the repository.
//
// verify-manual (V2–V5) is intentionally NOT implemented here yet — it is blocked
// on GAP T16-#4 (no 422 BusinessRuleError class in core/errors). Added once PM
// rules on the class owner + wire shape.

import type { Prisma } from '@prisma/client';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { VisitsRepository } from './visits.repository.js';
import { parseListQuery } from './visits.schema.js';
import { serializeVisit } from './visits.serializer.js';
import type { VisitListFilters, VisitListResponse } from './visits.types.js';

// Tenant scope arm. Visits are not department-scoped (no departmentId column;
// gm_admin-only surface), so the only arm is hotelId — dropped for super_admin
// via an explicit branch (never trust hotel_id from URL/body).
export function buildScopeArms(ctx: TenantContext): Prisma.VisitWhereInput[] {
  const arms: Prisma.VisitWhereInput[] = [];
  if (!ctx.isSuperAdmin) {
    arms.push({ hotelId: ctx.hotelId });
  }
  return arms;
}

// Pure WHERE builder — unit-tested without a DB.
export function buildVisitWhere(
  ctx: TenantContext,
  filters: VisitListFilters,
): Prisma.VisitWhereInput {
  const and: Prisma.VisitWhereInput[] = buildScopeArms(ctx);

  if (filters.status) {
    and.push({ status: { in: [...filters.status] } });
  }

  return and.length > 0 ? { AND: and } : {};
}

export class VisitsService {
  constructor(private readonly repo: VisitsRepository) {}

  async list(ctx: TenantContext, rawQuery: unknown): Promise<VisitListResponse> {
    const query = parseListQuery(rawQuery);
    const where = buildVisitWhere(ctx, query.filters);
    const skip = (query.page - 1) * query.pageSize;

    const [total, rows] = await Promise.all([
      this.repo.countWhere(where),
      this.repo.findManyPaged(where, skip, query.pageSize),
    ]);

    const data = rows.map(serializeVisit);
    const hasMore = query.page * query.pageSize < total;
    return {
      data,
      pageInfo: { page: query.page, pageSize: query.pageSize, total, hasMore },
    };
  }
}
