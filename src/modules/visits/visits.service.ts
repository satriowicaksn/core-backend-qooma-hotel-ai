// Service: tenant scope + status filter assembly + offset paging + verify-manual
// (approve/reject). Consumes T03's TenantContext seam; Prisma access via the repo.

import type { Prisma } from '@prisma/client';

import { BusinessRuleError, NotFoundError } from '@core/errors/app-errors.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';

import { deriveCheckout } from './visits.checkout.js';
import type { VisitsRepository } from './visits.repository.js';
import {
  parseApproveManual,
  parseCreateVisit,
  parseListQuery,
  parseVerifyManual,
} from './visits.schema.js';
import { serializeVisit } from './visits.serializer.js';
import type {
  VerifyManualInput,
  VisitDetailResponse,
  VisitListFilters,
  VisitListResponse,
  VisitStatus,
} from './visits.types.js';

const PENDING: VisitStatus = 'pending_verification';
const FAILED: VisitStatus = 'failed_verification';

// Module-local manual-verification transition map (R3, single source). Covers ONLY
// the manual (GM-driven) transitions — checkin/checkout/cancel are system-driven and
// out of scope. Visits own their status set — no shared state-machine import.
const VISIT_TRANSITIONS: Readonly<Record<string, readonly VisitStatus[]>> = {
  pending_verification: ['checked_in', 'rejected'],
  failed_verification: ['checked_in'],
};

// Pre-tx guard: a truly-invalid target throws BEFORE any write. Per-endpoint source
// is additionally enforced by the fixed `from` passed to verifyManualTx (a map-valid
// but wrong-source transition → count===0 → re-resolve → 422).
export function assertVisitTransition(from: string, to: VisitStatus): void {
  if (!(VISIT_TRANSITIONS[from] ?? []).includes(to)) {
    throw new BusinessRuleError(`Visit cannot transition ${from} → ${to}`, {
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
  // Socket emit seam (T18/T20): `verification:pending` on manual visit create.
  readonly onVerificationPending?: (event: { visitId: string; guestId: string }) => void;
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

  // Manual visit create (T18). hotelId from session (never body); status defaults to
  // pending_verification (DB default). Guest must exist + belong to the tenant.
  async create(ctx: TenantContext, rawBody: unknown): Promise<VisitDetailResponse> {
    const input = parseCreateVisit(rawBody);
    const guest = await this.repo.findGuestById(input.guestId);
    if (!guest) {
      throw new NotFoundError('Guest', input.guestId);
    }
    // Cross-tenant guest masked as 404 (anti-enumeration); super_admin bypasses.
    assertHotelOwnership(ctx, guest.hotelId, 'Guest');

    const created = await this.repo.createVisit({
      hotelId: ctx.hotelId,
      guestId: input.guestId,
      checkIn: input.checkIn,
      ...(input.nights !== undefined ? { nights: input.nights } : {}),
      ...(input.roomNumber !== undefined ? { roomNumber: input.roomNumber } : {}),
      ...(input.bookingSource !== undefined ? { bookingSource: input.bookingSource } : {}),
      ...(input.specialRequest !== undefined ? { specialRequest: input.specialRequest } : {}),
    });

    this.deps.onVerificationPending?.({ visitId: created.id, guestId: created.guestId });
    return { data: serializeVisit(created) };
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
    assertVisitTransition(row.status, to);

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

  // Dedicated reject: pending_verification → rejected (Q-CONTRACT-15 coexists with
  // verify-manual's { action: 'reject' }). No body — no persistable reason column
  // yet (Q-B-09/Q-B-12); the request body is ignored.
  async reject(ctx: TenantContext, id: string): Promise<VisitDetailResponse> {
    return this.transition(ctx, id, PENDING, 'rejected', { status: 'rejected' });
  }

  // failed_3x override: failed_verification → checked_in. nights optional (Q-B-12);
  // if present, derive checkout. guest_name validate-only (no cross-write to guests).
  async approveManual(
    ctx: TenantContext,
    id: string,
    rawBody: unknown,
  ): Promise<VisitDetailResponse> {
    const input = parseApproveManual(rawBody);
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundError('Visit', id);
    }
    assertHotelOwnership(ctx, row.hotelId, 'Visit');
    assertVisitTransition(row.status, 'checked_in');

    const data: Prisma.VisitUpdateManyMutationInput = {
      status: 'checked_in',
      roomNumber: input.roomNumber,
      ...(input.nights !== undefined
        ? {
            nights: input.nights,
            checkOut: deriveCheckout(row.checkIn, input.nights, this.deps.timezone ?? DEFAULT_TZ),
          }
        : {}),
    };
    return this.runTransition(ctx, id, row.hotelId, FAILED, 'checked_in', data);
  }

  // Shared transition path for the no-derivation cases (reject). Loads + guards, then
  // delegates to runTransition. Kept separate so approve-manual can build derived data.
  private async transition(
    ctx: TenantContext,
    id: string,
    expectedFrom: VisitStatus,
    to: VisitStatus,
    data: Prisma.VisitUpdateManyMutationInput,
  ): Promise<VisitDetailResponse> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundError('Visit', id);
    }
    assertHotelOwnership(ctx, row.hotelId, 'Visit');
    assertVisitTransition(row.status, to);
    return this.runTransition(ctx, id, row.hotelId, expectedFrom, to, data);
  }

  // Executes the status-guarded tx + count===0 re-resolve + seams + reload. The
  // fixed `expectedFrom` is the per-endpoint source guard (reused across V2/T17).
  private async runTransition(
    ctx: TenantContext,
    id: string,
    hotelId: string,
    expectedFrom: VisitStatus,
    to: VisitStatus,
    data: Prisma.VisitUpdateManyMutationInput,
  ): Promise<VisitDetailResponse> {
    const count = await this.repo.verifyManualTx({ id, hotelId, from: expectedFrom, data });
    if (count === 0) {
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
    this.deps.recordVisitAudit?.({ visitId: id, from: expectedFrom, to, actorUserId: ctx.userId });
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
