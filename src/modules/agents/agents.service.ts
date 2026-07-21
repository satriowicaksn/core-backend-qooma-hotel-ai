// Service: AI-agents config list + patch. RBAC gate lives at the route layer
// (requireRole([gm_admin])).
//
// ADD-25: the minimum-agent gate (block toggle-off below 3) is REVOKED. Agents
// may be deactivated freely; the only valid rule is the per-tier UPPER cap
// (agents ≤ package + add-on, extra agents billed as a +Agent add-on), which is
// handled at the billing/activation layer, not here.

import type { Prisma, PrismaClient } from '@prisma/client';

import { NotFoundError } from '@core/errors/app-errors.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';

import type { AgentsRepository } from './agents.repository.js';
import type { UpdateAgentBody } from './agents.schema.js';
import { serializeAgent } from './agents.serializer.js';
import type {
  AgentListFilters,
  AgentListResponse,
  AgentResponse,
  AgentRow,
} from './agents.types.js';

const DEFAULT_AGENT_DEFINITIONS = [
  { agentType: 'receptionist', name: 'Receptionist' },
  { agentType: 'request_complaint', name: 'Request & Complaint' },
  { agentType: 'engagement', name: 'Engagement' },
] as const;

export function buildAgentWhere(
  ctx: TenantContext,
  filters: AgentListFilters,
): Prisma.AiAgentConfigWhereInput {
  const where: Prisma.AiAgentConfigWhereInput = ctx.isSuperAdmin ? {} : { hotelId: ctx.hotelId };
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  return where;
}

export class AgentsService {
  constructor(
    private readonly repo: AgentsRepository,
    private readonly db: PrismaClient,
  ) {}

  async list(ctx: TenantContext, filters: AgentListFilters): Promise<AgentListResponse> {
    const where = buildAgentWhere(ctx, filters);
    const rows = await this.repo.findMany(where);
    if (rows.length === 0 && !ctx.isSuperAdmin && ctx.hotelId) {
      const seeded = await this.provisionDefaults(ctx.hotelId);
      const filtered =
        filters.isActive !== undefined
          ? seeded.filter((r) => r.isActive === filters.isActive)
          : seeded;
      return { data: filtered.map(serializeAgent) };
    }
    return { data: rows.map(serializeAgent) };
  }

  private async provisionDefaults(hotelId: string): Promise<AgentRow[]> {
    await this.db.aiAgentConfig.createMany({
      data: DEFAULT_AGENT_DEFINITIONS.map((a) => ({ hotelId, ...a })),
      skipDuplicates: true,
    });
    return this.repo.findMany({ hotelId });
  }

  /**
   * Update an agent config. Immutable fields (`agent_type`, `name`, `hotel_id`,
   * timestamps) are enforced at the zod boundary via `.strict()`. Only
   * `is_active`, `capacity`, `config` reach this method.
   *
   * ADD-25: no lower-bound (minimum-agent) guard — toggle-off is always allowed.
   * Idempotency: a same-state toggle with no other change is an effective no-op
   * and returns the current row.
   */
  async update(ctx: TenantContext, id: string, input: UpdateAgentBody): Promise<AgentResponse> {
    const row = await this.loadOwned(ctx, id);

    const desiredActive = input.is_active;
    const capacityChange = input.capacity !== undefined && input.capacity !== row.capacity;
    const configChange = input.config !== undefined;
    const isActiveChange = desiredActive !== undefined && desiredActive !== row.isActive;

    // Effective no-op: all fields resolve to current state → return current row.
    if (!isActiveChange && !capacityChange && !configChange) {
      return { data: serializeAgent(row) };
    }

    const updated = await this.repo.update(id, buildUpdateData(input));
    return { data: serializeAgent(updated) };
  }

  private async loadOwned(ctx: TenantContext, id: string): Promise<AgentRow> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundError('Agent', id);
    }
    // Cross-tenant 404 (leak-safe per spec §7); super_admin bypasses.
    assertHotelOwnership(ctx, row.hotelId, 'Agent');
    return row;
  }
}

function buildUpdateData(input: UpdateAgentBody): Prisma.AiAgentConfigUncheckedUpdateInput {
  const data: Prisma.AiAgentConfigUncheckedUpdateInput = {};
  if (input.is_active !== undefined) data.isActive = input.is_active;
  if (input.capacity !== undefined) data.capacity = input.capacity;
  if (input.config !== undefined) {
    data.config = input.config as unknown as Prisma.InputJsonValue;
  }
  return data;
}
