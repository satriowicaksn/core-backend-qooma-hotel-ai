// Service: tenant scope + status filter assembly + offset paging + verify-manual
// (approve/reject). Consumes T03's TenantContext seam; Prisma access via the repo.

import type { Prisma } from '@prisma/client';

import { BusinessRuleError, NotFoundError } from '@core/errors/app-errors.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';

import { deriveCheckout } from './visits.checkout.js';
import type { VisitsRepository } from './visits.repository.js';
import { parseListQuery, parseVerifyManual } from './visits.schema.js';
import { serializeVisit } from './visits.serializer.js';
import type {
  VerifyManualInput,
  VisitDetailResponse,
  VisitListFilters,
  VisitListResponse,
  VisitStatus,
} from './visits.types.js';

const PENDING: VisitStatus = 'pending_verification';

// verify-manual only acts on a pending_verification visit. failed_verification
// (approve-manual) is T17; every other current status is an invalid transition.
// Visits own their status set — no shared state-machine import (per PM NUDGE).
function assertPendingVerification(from: string, to: VisitStatus): void {
  if (from !== PENDING) {
    throw new BusinessRuleError(`Visit cannot transition ${from} → ${to} via verify-manual`, {
      rule: 'INVALID_VISIT_TRANSITION',
      from,
      to,
    });
  }
}

export interface VisitsServiceDeps {
  // IANA timezone for checkout derivation (GAP T16-#3). Wiring passes config.TZ;
  // defaults to UTC. No per-hotel TZ is modelled (Hotel is id-only).
  readonly timezone?: string;
  // Audit no-op seam (GAP T16-#1 / Q-B-09): a visit audit row would be written on
  // a resolved verify-manual once an audit table lands. Isolated to one call site.
  readonly recordVisitAudit?: (event: {
    visitId: string;
    from: string;
    to: VisitStatus;
    actorUserId: string;
  }) => void;
  // Socket emit seam (V2/T20): `verification:resolved` is wired by T20, not here.
  readonly onVerificationResolved?: (event: { visitId: string; status: VisitStatus }) => void;
}

const DEFAULT_TZ = 'UTC';

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
  constructor(
    private readonly repo: VisitsRepository,
    private readonly deps: VisitsServiceDeps = {},
  ) {}

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

  async verifyManual(
    ctx: TenantContext,
    id: string,
    rawBody: unknown,
  ): Promise<VisitDetailResponse> {
    const input = parseVerifyManual(rawBody);
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundError('Visit', id);
    }
    // Scope by the VISIT's hotel; cross-tenant masks as 404 (anti-enumeration).
    assertHotelOwnership(ctx, row.hotelId, 'Visit');

    const to = input.mode === 'approve' ? 'checked_in' : 'rejected';
    assertPendingVerification(row.status, to);

    const data = this.buildTransitionData(input, row.checkIn, to);
    const count = await this.repo.verifyManualTx({ id, hotelId: row.hotelId, from: PENDING, data });
    if (count === 0) {
      // Optimistic-concurrency loss: the guarded update matched 0 rows.
      const fresh = await this.repo.findById(id);
      if (!fresh) {
        throw new NotFoundError('Visit', id);
      }
      throw new BusinessRuleError('Visit status changed concurrently', {
        rule: 'INVALID_VISIT_TRANSITION',
        from: fresh.status,
        to,
      });
    }

    this.deps.recordVisitAudit?.({ visitId: id, from: PENDING, to, actorUserId: ctx.userId });
    this.deps.onVerificationResolved?.({ visitId: id, status: to });

    const updated = await this.repo.findById(id);
    if (!updated) {
      throw new NotFoundError('Visit', id);
    }
    return { data: serializeVisit(updated) };
  }

  private buildTransitionData(
    input: VerifyManualInput,
    checkIn: Date,
    to: VisitStatus,
  ): Prisma.VisitUpdateManyMutationInput {
    if (input.mode === 'reject') {
      return { status: to };
    }
    return {
      status: to,
      roomNumber: input.roomNumber,
      nights: input.nights,
      checkOut: deriveCheckout(checkIn, input.nights, this.deps.timezone ?? DEFAULT_TZ),
    };
  }
}
