// Service: WA templates lifecycle. Tenant-scoped list (with global overlay);
// hotel-scoped mutations; state-machine guards; port-adapter for Integration
// relay. RBAC gate lives at the route layer.

import type { Prisma } from '@prisma/client';

import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '@core/errors/app-errors.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';

import type { IntegrationRelayPort } from './ports/integration-relay.port.js';
import type { WaTemplatesRepository } from './wa-templates.repository.js';
import type { CreateWaTemplateBody, UpdateWaTemplateBody } from './wa-templates.schema.js';
import { serializeWaTemplate } from './wa-templates.serializer.js';
import type {
  WaTemplateListFilters,
  WaTemplateListResponse,
  WaTemplateResponse,
  WaTemplateRow,
  WaTemplateStatus,
} from './wa-templates.types.js';

// Statuses that lock PATCH — spec §7 line 829 (`WA_TEMPLATE_LOCKED` 422 on
// approved; PM ACK extends to archived — locked semantics identical).
const LOCKED_STATUSES: readonly WaTemplateStatus[] = ['approved', 'archived'];

function isPrismaUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 'P2002';
}

function assertNotGlobalForWrite(row: WaTemplateRow): void {
  if (row.isGlobal) {
    // Q-T25-#1: 403 FORBIDDEN, not 422. Auth semantic — hotels cannot mutate
    // what Qooma team owns. Applied BEFORE state check (PM ACK coding note).
    throw new ForbiddenError('Global template read-only at hotel level', {
      reason: 'GLOBAL_TEMPLATE_READONLY',
      templateId: row.id,
    });
  }
}

function assertNotLocked(row: WaTemplateRow): void {
  if (LOCKED_STATUSES.includes(row.status as WaTemplateStatus)) {
    throw new BusinessRuleError('WA template locked', {
      rule: 'WA_TEMPLATE_LOCKED',
      currentStatus: row.status,
    });
  }
}

// Global visible to all hotels; hotel-specific scoped to ctx.hotelId.
// super_admin bypasses scoping (matches assertHotelOwnership convention).
export function buildWaTemplateWhere(
  ctx: TenantContext,
  filters: WaTemplateListFilters,
): Prisma.WaTemplateWhereInput {
  const base: Prisma.WaTemplateWhereInput = ctx.isSuperAdmin
    ? {}
    : { OR: [{ isGlobal: true }, { hotelId: ctx.hotelId }] };
  if (filters.status !== undefined) {
    return { AND: [base, { status: filters.status }] };
  }
  return base;
}

export class WaTemplatesService {
  constructor(
    private readonly repo: WaTemplatesRepository,
    private readonly integrationRelay: IntegrationRelayPort,
  ) {}

  async list(ctx: TenantContext, filters: WaTemplateListFilters): Promise<WaTemplateListResponse> {
    const where = buildWaTemplateWhere(ctx, filters);
    const rows = await this.repo.findMany(where);
    return { data: rows.map(serializeWaTemplate) };
  }

  /**
   * Create a hotel-scoped WA template. `is_global`, `status`, `hotel_id`,
   * `template_id_meta`, `rejection_reason`, and `approved_at` are ALWAYS
   * server-set — never accepted from client body. Zod `.strict()` rejects
   * unknown fields, and the code path here only reads the whitelisted
   * `CreateWaTemplateBody` shape.
   */
  async create(ctx: TenantContext, input: CreateWaTemplateBody): Promise<WaTemplateResponse> {
    // Q-T25-#5 pre-check — foundation UNIQUE constraint absent from T02
    // migration; app-layer pre-check protects UX. Race window ~50ms per
    // same-hotel same-name admin write is acceptable on this settings
    // surface. When Slot A ships the migration, the P2002 catch below
    // becomes the primary guard; pre-check remains idempotent-safe.
    const existing = await this.repo.countByHotelAndName(ctx.hotelId, input.name);
    if (existing > 0) {
      throw new ConflictError('WA template name already taken for this hotel', {
        reason: 'WA_TEMPLATE_NAME_TAKEN',
        name: input.name,
      });
    }

    const language = input.language ?? 'id';
    const variables = input.variables ?? [];

    const data: Prisma.WaTemplateUncheckedCreateInput = {
      hotelId: ctx.hotelId,
      name: input.name,
      body: input.body,
      variables: variables as unknown as Prisma.InputJsonValue,
      language,
      status: 'pending',
      isGlobal: false,
    };

    let created: WaTemplateRow;
    try {
      created = await this.repo.create(data);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictError('WA template name already taken for this hotel', {
          reason: 'WA_TEMPLATE_NAME_TAKEN',
          name: input.name,
        });
      }
      throw err;
    }

    await this.integrationRelay.relaySubmit({
      intent: 'create',
      templateId: created.id,
      hotelId: ctx.hotelId,
      name: created.name,
      body: created.body,
      language: created.language,
      variables,
    });

    return { data: serializeWaTemplate(created) };
  }

  async update(
    ctx: TenantContext,
    id: string,
    input: UpdateWaTemplateBody,
  ): Promise<WaTemplateResponse> {
    const row = await this.loadOwned(ctx, id);
    // Global-check BEFORE state-check per PM ACK.
    assertNotGlobalForWrite(row);
    assertNotLocked(row);

    // PATCH name change — Q-T25-#5 pre-check with excludeId to avoid
    // false-positive on the row being edited (PM ACK coding note).
    if (input.name !== undefined && input.name !== row.name) {
      const existing = await this.repo.countByHotelAndName(ctx.hotelId, input.name, id);
      if (existing > 0) {
        throw new ConflictError('WA template name already taken for this hotel', {
          reason: 'WA_TEMPLATE_NAME_TAKEN',
          name: input.name,
        });
      }
    }

    const data: Prisma.WaTemplateUncheckedUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.body !== undefined) data.body = input.body;
    if (input.variables !== undefined) {
      data.variables = input.variables as unknown as Prisma.InputJsonValue;
    }
    if (input.language !== undefined) data.language = input.language;

    let updated: WaTemplateRow;
    try {
      updated = await this.repo.update(id, data);
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        throw new ConflictError('WA template name already taken for this hotel', {
          reason: 'WA_TEMPLATE_NAME_TAKEN',
          ...(input.name !== undefined ? { name: input.name } : {}),
        });
      }
      throw err;
    }
    return { data: serializeWaTemplate(updated) };
  }

  /**
   * DELETE state-branch:
   *   pending  → hard delete (204 at route layer)
   *   approved | rejected → archive (200 with archived row at route layer)
   *   archived → 409 WA_TEMPLATE_ALREADY_ARCHIVED (Q-T25-#3 lean)
   * Global rows: 403 (auth) before any state check.
   */
  async remove(ctx: TenantContext, id: string): Promise<WaTemplateResponse | null> {
    const row = await this.loadOwned(ctx, id);
    assertNotGlobalForWrite(row);

    const status = row.status as WaTemplateStatus;
    if (status === 'pending') {
      await this.repo.delete(id);
      return null;
    }
    if (status === 'approved' || status === 'rejected') {
      const archived = await this.repo.update(id, { status: 'archived' });
      return { data: serializeWaTemplate(archived) };
    }
    // status === 'archived'
    throw new ConflictError('WA template already archived', {
      reason: 'WA_TEMPLATE_ALREADY_ARCHIVED',
      currentStatus: 'archived',
    });
  }

  async resubmit(ctx: TenantContext, id: string): Promise<WaTemplateResponse> {
    const row = await this.loadOwned(ctx, id);
    assertNotGlobalForWrite(row);
    if (row.status !== 'rejected') {
      throw new BusinessRuleError('WA template must be rejected to resubmit', {
        rule: 'WA_TEMPLATE_NOT_REJECTED',
        currentStatus: row.status,
      });
    }
    // Explicit null (not just omission) — Prisma won't null a field otherwise.
    const updated = await this.repo.update(id, {
      status: 'pending',
      rejectionReason: null,
    });
    const variables: string[] = Array.isArray(updated.variables)
      ? updated.variables.filter((v): v is string => typeof v === 'string')
      : [];
    await this.integrationRelay.relaySubmit({
      intent: 'resubmit',
      templateId: updated.id,
      hotelId: ctx.hotelId,
      name: updated.name,
      body: updated.body,
      language: updated.language,
      variables,
    });
    return { data: serializeWaTemplate(updated) };
  }

  private async loadOwned(ctx: TenantContext, id: string): Promise<WaTemplateRow> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundError('WaTemplate', id);
    }
    // Global rows visible to all hotels — assertHotelOwnership only fires
    // on hotel-scoped rows. Cross-tenant 404 preserved (leak-safe per §7).
    if (!row.isGlobal) {
      assertHotelOwnership(ctx, row.hotelId ?? '', 'WaTemplate');
    }
    return row;
  }
}
