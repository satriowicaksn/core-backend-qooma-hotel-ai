// Service: tenant-scoped Departments CRUD with delete-conflict + code-unique
// translation. Consumes TenantContext from @plugins/tenant-guard.js — the
// `assertHotelOwnership` helper provides the super_admin cross-hotel bypass.
// RBAC gate lives at the route layer (requireRole([super_admin, gm_admin])).

import type { Prisma } from '@prisma/client';

import { ConflictError, NotFoundError } from '@core/errors/app-errors.js';
import type { Logger } from '@core/logger/logger.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';

import type { DepartmentsRepository } from './departments.repository.js';
import type { CreateDepartmentBody, UpdateDepartmentBody } from './departments.schema.js';
import { serializeDepartment } from './departments.serializer.js';
import type {
  DepartmentListFilters,
  DepartmentListResponse,
  DepartmentResponse,
  DepartmentRow,
} from './departments.types.js';

// Prisma P2002 unique-violation guard (structural; runtime code check).
function isPrismaUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

export interface DepartmentsServiceOptions {
  readonly skipCrossDbChecks: boolean;
  readonly nodeEnv: string;
  readonly logger?: Logger;
}

// Build a Prisma WhereInput scoped to the current tenant + optional is_active
// filter. super_admin bypasses hotel scope (matches assertHotelOwnership).
export function buildDepartmentWhere(
  ctx: TenantContext,
  filters: DepartmentListFilters,
): Prisma.DepartmentWhereInput {
  const where: Prisma.DepartmentWhereInput = ctx.isSuperAdmin ? {} : { hotelId: ctx.hotelId };
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  return where;
}

export class DepartmentsService {
  private readonly skipCrossDbChecks: boolean;

  constructor(
    private readonly repo: DepartmentsRepository,
    opts: DepartmentsServiceOptions,
  ) {
    this.skipCrossDbChecks = opts.skipCrossDbChecks;
    // Q-C-02 observability: warn on prod-with-flag-true so silent skips
    // don't ship. Fires once at construction (per hot start).
    if (this.skipCrossDbChecks && opts.nodeEnv === 'production' && opts.logger) {
      opts.logger.warn({
        module: 'departments',
        event: 'cross_db_check_skip',
        env: opts.nodeEnv,
        msg: 'users.department_id delete-conflict check skipped (Opsi C)',
      });
    }
  }

  async list(ctx: TenantContext, filters: DepartmentListFilters): Promise<DepartmentListResponse> {
    const where = buildDepartmentWhere(ctx, filters);
    const rows = await this.repo.findMany(where);
    return { data: rows.map(serializeDepartment) };
  }

  async detail(ctx: TenantContext, id: string): Promise<DepartmentResponse> {
    const row = await this.loadOwned(ctx, id);
    return { data: serializeDepartment(row) };
  }

  async create(ctx: TenantContext, input: CreateDepartmentBody): Promise<DepartmentResponse> {
    // hotel_id ALWAYS sourced from tenant — never body (spec §6 + PM notes).
    // super_admin creating without a target hotel is nonsensical; use ctx.hotelId
    // (super_admin still carries a session hotelId per SessionUser contract).
    const data: Prisma.DepartmentUncheckedCreateInput = {
      hotelId: ctx.hotelId,
      name: input.name,
      code: input.code,
      ...(input.operating_hours !== undefined
        ? { operatingHours: input.operating_hours as unknown as Prisma.InputJsonValue }
        : {}),
      ...(input.escalation_chain !== undefined
        ? { escalationChain: input.escalation_chain as unknown as Prisma.InputJsonValue }
        : {}),
      ...(input.telegram_chat_id !== undefined ? { telegramChatId: input.telegram_chat_id } : {}),
      ...(input.supervisor_telegram_id !== undefined
        ? { supervisorTelegramId: input.supervisor_telegram_id }
        : {}),
      ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
    };

    let created: DepartmentRow;
    try {
      created = await this.repo.create(data);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictError('Department code already taken for this hotel', {
          reason: 'DEPARTMENT_CODE_TAKEN',
          code: input.code,
        });
      }
      throw err;
    }
    return { data: serializeDepartment(created) };
  }

  async update(
    ctx: TenantContext,
    id: string,
    input: UpdateDepartmentBody,
  ): Promise<DepartmentResponse> {
    await this.loadOwned(ctx, id);

    const data: Prisma.DepartmentUncheckedUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.code !== undefined) data.code = input.code;
    if (input.operating_hours !== undefined) {
      data.operatingHours = input.operating_hours as unknown as Prisma.InputJsonValue;
    }
    if (input.escalation_chain !== undefined) {
      data.escalationChain = input.escalation_chain as unknown as Prisma.InputJsonValue;
    }
    if (input.telegram_chat_id !== undefined) data.telegramChatId = input.telegram_chat_id;
    if (input.supervisor_telegram_id !== undefined) {
      data.supervisorTelegramId = input.supervisor_telegram_id;
    }
    if (input.is_active !== undefined) data.isActive = input.is_active;

    let updated: DepartmentRow;
    try {
      updated = await this.repo.update(id, data);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictError('Department code already taken for this hotel', {
          reason: 'DEPARTMENT_CODE_TAKEN',
          ...(input.code !== undefined ? { code: input.code } : {}),
        });
      }
      throw err;
    }
    return { data: serializeDepartment(updated) };
  }

  async remove(ctx: TenantContext, id: string): Promise<void> {
    await this.loadOwned(ctx, id);

    // Delete-conflict check. Under Opsi C the users.department_id join is
    // cross-DB — gated by SKIP_CROSS_DB_CHECKS (Q-C-02). Tickets check always
    // runs (local DB). Root fix = PARENT §4 Opsi A / multi-schema.
    const openTickets = await this.repo.countOpenTickets(id);
    if (openTickets > 0) {
      throw new ConflictError('Department still has open tickets', {
        reason: 'DEPARTMENT_HAS_OPEN_TICKETS',
        openTickets,
      });
    }
    // When SKIP_CROSS_DB_CHECKS=false lands (post Opsi A migration), add a
    // repo.countAssignedUsers(id) call here and throw ConflictError with
    // reason='DEPARTMENT_HAS_USERS'. Deliberately absent now — the users
    // table stub does not carry a departmentId column under Opsi C.

    await this.repo.delete(id);
  }

  private async loadOwned(ctx: TenantContext, id: string): Promise<DepartmentRow> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundError('Department', id);
    }
    // Cross-tenant 404 (leak-safe per spec §7); super_admin bypasses.
    assertHotelOwnership(ctx, row.hotelId, 'Department');
    return row;
  }
}
