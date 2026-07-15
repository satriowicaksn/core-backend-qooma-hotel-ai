// Service: AI-agents config list + patch with Min-3 rule enforcement.
// RBAC gate lives at the route layer (requireRole([gm_admin])).
//
// PM ACK T28 tightening #1: slice-1 enforces ONLY Min-3. Tier-cap is out of
// scope pending Q-T28-#1 PO decision (billing_extras.extra_agent may be the
// activation-cap mechanism, not a hard 422 gate).

import type { Prisma, PrismaClient } from '@prisma/client';

import { BusinessRuleError, NotFoundError } from '@core/errors/app-errors.js';

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

const MIN_ACTIVE_AGENTS = 3;

const DEFAULT_AGENT_DEFINITIONS = [
  { agentType: 'receptionist', name: 'Receptionist' },
  { agentType: 'request_complaint', name: 'Request & Complaint' },
  { agentType: 'engagement', name: 'Engagement' },
] as const;

// PM ACK tightening #3: Prisma throws PrismaClientKnownRequestError with
// code='P2034' for transaction serialization conflicts (Postgres SQLSTATE
// 40001). Belt-and-suspenders check on both.
function isSerializationFailure(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: unknown; meta?: { code?: unknown } };
  if (e.code === 'P2034') return true;
  if (e.meta && typeof e.meta === 'object' && (e.meta as { code?: unknown }).code === '40001') {
    return true;
  }
  return false;
}

async function withSerializableRetry<T>(fn: () => Promise<T>, jitterMs = 20): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isSerializationFailure(err)) {
      await new Promise((r) => setTimeout(r, Math.random() * jitterMs));
      return fn();
    }
    throw err;
  }
}

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
   * Min-3 rule (MVP §4.3): toggle-off that would drop active count below 3
   * → 422 `MIN_AGENTS_VIOLATION`. Read-then-write serialized inside a
   * Serializable transaction with retry-on-40001 (single retry with jitter).
   *
   * Idempotency: same-state toggle (already-desired `is_active`) skips the
   * transaction and returns the current row via a plain update (or no-op
   * when the effective delta is empty).
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

    // is_active toggle-off triggers Min-3 guard within a serializable
    // transaction. Toggle-on has no guard in slice-1 (tier-cap dropped
    // per PM ACK tightening #1).
    if (isActiveChange && desiredActive === false) {
      const updated = await withSerializableRetry(() =>
        this.db.$transaction(
          async (tx) => {
            const activeCount = await tx.aiAgentConfig.count({
              where: { hotelId: ctx.hotelId, isActive: true },
            });
            const activeAfter = activeCount - 1;
            if (activeAfter < MIN_ACTIVE_AGENTS) {
              throw new BusinessRuleError('Minimum 3 active agents required', {
                rule: 'MIN_AGENTS_VIOLATION',
                activeAfter,
                minRequired: MIN_ACTIVE_AGENTS,
              });
            }
            const data = buildUpdateData(input);
            return tx.aiAgentConfig.update({ where: { id }, data });
          },
          { isolationLevel: 'Serializable' },
        ),
      );
      return { data: serializeAgent(updated) };
    }

    // All other paths (toggle-on / capacity-only / config-only) — no race
    // concern; plain update outside a transaction.
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
