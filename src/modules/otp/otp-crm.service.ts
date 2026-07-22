// CRM-facing ADD-24 surfaces: supervisor review queue + review verdict,
// per-hotel OTP settings, per-staff monthly OTP metrics. Tenant + dept scope
// mirror tickets.service (dept_head own-dept FORCED, super_admin cross-hotel,
// cross-tenant masked as 404 by the shared guards).

import type { Prisma } from '@prisma/client';

import { AuthError, ConflictError, NotFoundError } from '@core/errors/app-errors.js';

import { serializeTicketListItem, type UserDirectory } from '@modules/tickets/index.js';
import {
  assertDeptOwnership,
  assertHotelOwnership,
  type TenantContext,
} from '@plugins/tenant-guard.js';
import {
  emitTicketUpdated,
  NoopSocketEmitter,
  type SocketEmitterPort,
} from '@shared/socket/index.js';

import type { OtpRepository } from './otp.repository.js';
import {
  encodeReviewCursor,
  parseMetricsQuery,
  parseOtpSettingsBody,
  parseReviewBody,
  parseReviewQueueQuery,
} from './otp.schema.js';
import {
  complaintTicketIdOf,
  computeTeamAverage,
  serializeOtpSettings,
  serializeReviewQueueItem,
  serializeReviewResult,
  serializeStaffMetrics,
} from './otp.serializer.js';
import {
  DEFAULT_OTP_SETTINGS,
  type ComplaintRef,
  type OtpMetricsResponse,
  type OtpSettingsResponse,
  type ReviewQueueResponse,
  type ReviewResponse,
} from './otp.types.js';

const EMPTY_DIRECTORY: UserDirectory = new Map();

export interface OtpCrmServiceDeps {
  readonly resolveUsers?: (userIds: readonly string[]) => Promise<UserDirectory>;
  readonly emitter?: SocketEmitterPort;
}

function scopeArms(ctx: TenantContext): Prisma.TicketWhereInput[] {
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

export class OtpCrmService {
  private readonly emitter: SocketEmitterPort;

  constructor(
    private readonly repo: OtpRepository,
    private readonly deps: OtpCrmServiceDeps = {},
  ) {
    this.emitter = deps.emitter ?? new NoopSocketEmitter();
  }

  async getSettings(ctx: TenantContext): Promise<OtpSettingsResponse> {
    const row = await this.repo.getSettings(ctx.hotelId);
    return { data: serializeOtpSettings(row ?? DEFAULT_OTP_SETTINGS) };
  }

  async putSettings(ctx: TenantContext, rawBody: unknown): Promise<OtpSettingsResponse> {
    const body = parseOtpSettingsBody(rawBody);
    const row = await this.repo.upsertSettings(ctx.hotelId, {
      otpEnabled: body.otp_enabled,
      otpGraceMinutes: body.otp_grace_minutes,
      otpComplaintWindow: body.otp_complaint_window,
    });
    return { data: serializeOtpSettings(row) };
  }

  async reviewQueue(ctx: TenantContext, rawQuery: unknown): Promise<ReviewQueueResponse> {
    const now = new Date();
    const query = parseReviewQueueQuery(rawQuery);
    const and: Prisma.TicketWhereInput[] = [
      ...scopeArms(ctx),
      { reviewStatus: 'pending_supervisor' },
    ];
    if (query.cursor) {
      const createdAt = new Date(query.cursor.createdAt);
      and.push({
        OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: query.cursor.id } }],
      });
    }

    const rows = await this.repo.findReviewQueue({ AND: and }, query.limit + 1);
    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeReviewCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null;

    const complaintIds = page
      .map((r) => complaintTicketIdOf(r))
      .filter((id): id is string => id !== null);
    const complaintRefs = await this.repo.findComplaintRefs([...new Set(complaintIds)]);
    const complaints = new Map<string, ComplaintRef>(complaintRefs.map((c) => [c.id, c]));

    const dir = await this.resolveDirectory(page.map((r) => r.assignedUserId));
    const data = page.map((r) => serializeReviewQueueItem(r, ctx, dir, complaints, now));
    return { data, pageInfo: { nextCursor, hasMore } };
  }

  async review(ctx: TenantContext, id: string, rawBody: unknown): Promise<ReviewResponse> {
    const body = parseReviewBody(rawBody);
    const row = await this.repo.findTicketById(id);
    if (!row) {
      throw new NotFoundError('Ticket', id);
    }
    assertHotelOwnership(ctx, row.hotelId, 'Ticket');
    assertDeptOwnership(ctx, row.departmentId, 'Ticket');
    if (row.reviewStatus === 'reviewed') {
      throw new ConflictError('Ticket has already been reviewed', {
        reason: 'REVIEW_ALREADY_DONE',
      });
    }
    if (row.reviewStatus !== 'pending_supervisor') {
      throw new ConflictError('Ticket is not pending supervisor review', {
        reason: 'NOT_PENDING_REVIEW',
      });
    }

    const now = new Date();
    const dir = await this.resolveDirectory([ctx.userId]);
    const reviewedBy = dir.get(ctx.userId)?.name ?? ctx.userId;
    const won = await this.repo.reviewTx({
      id,
      hotelId: row.hotelId,
      outcome: body.outcome,
      note: body.note,
      reviewedBy,
      now,
    });
    if (won === 0) {
      throw new ConflictError('Ticket has already been reviewed', {
        reason: 'REVIEW_ALREADY_DONE',
      });
    }
    await this.emitReviewUpdated(row.hotelId, id, ctx);
    return {
      data: serializeReviewResult({
        id,
        reviewStatus: 'reviewed',
        reviewOutcome: body.outcome,
        reviewedBy,
        reviewedAt: now,
      }),
    };
  }

  async metrics(ctx: TenantContext, rawQuery: unknown): Promise<OtpMetricsResponse> {
    const query = parseMetricsQuery(rawQuery);
    let departmentId = query.departmentId ?? null;
    if (ctx.role === 'dept_head') {
      if (!ctx.deptId) {
        throw new AuthError('dept_head session is missing department scope');
      }
      departmentId = ctx.deptId;
    }
    // No hotel scope (e.g. super_admin, hotelId null) → empty metrics
    // (analytics module precedent).
    if (!ctx.hotelId) {
      return { period: query.period, team_average: computeTeamAverage([]), staff: [] };
    }
    const rows = await this.repo.metricsAgg(ctx.hotelId, query.from, query.to, departmentId);
    const dir = await this.resolveDirectory(rows.map((r) => r.staffUserId));
    return {
      period: query.period,
      team_average: computeTeamAverage(rows),
      staff: rows.map((r) => serializeStaffMetrics(r, dir)),
    };
  }

  private async emitReviewUpdated(
    hotelId: string,
    ticketId: string,
    ctx: TenantContext,
  ): Promise<void> {
    const row = await this.repo.findTicketWithRelations(ticketId);
    if (!row) return;
    const wire = serializeTicketListItem(row, ctx, EMPTY_DIRECTORY);
    emitTicketUpdated(this.emitter, hotelId, wire, ['review_status']);
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
