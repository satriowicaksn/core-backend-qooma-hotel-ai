// Service: Knowledge entries CRUD. No UNIQUE + no CHECK constraints at DB
// → no P2002/P2003 catches needed. Simplest business rules in Slot C.
// RBAC gate lives at the route layer (requireRole([gm_admin])).

import type { Prisma } from '@prisma/client';

import { NotFoundError } from '@core/errors/app-errors.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';

import type { KnowledgeRepository } from './knowledge.repository.js';
import type { CreateEntryBody, UpdateEntryBody } from './knowledge.schema.js';
import { serializeKnowledgeEntry } from './knowledge.serializer.js';
import type {
  KnowledgeEntryResponse,
  KnowledgeEntryRow,
  KnowledgeListFilters,
  KnowledgeListResponse,
} from './knowledge.types.js';

export function buildKnowledgeWhere(
  ctx: TenantContext,
  filters: KnowledgeListFilters,
): Prisma.KnowledgeEntryWhereInput {
  const where: Prisma.KnowledgeEntryWhereInput = ctx.isSuperAdmin ? {} : { hotelId: ctx.hotelId };
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  if (filters.category !== undefined) {
    where.category = filters.category;
  }
  if (filters.tag !== undefined) {
    // Prisma array-contains-element for String[] column. Case-sensitive by
    // default (PM ACK coding note — 1-line raise if PO wants insensitive).
    where.tags = { has: filters.tag };
  }
  return where;
}

export class KnowledgeService {
  constructor(private readonly repo: KnowledgeRepository) {}

  async list(ctx: TenantContext, filters: KnowledgeListFilters): Promise<KnowledgeListResponse> {
    const rows = await this.repo.findMany(buildKnowledgeWhere(ctx, filters));
    return { data: rows.map(serializeKnowledgeEntry) };
  }

  /**
   * Create a knowledge entry. `hotel_id`, `id`, timestamps are ALWAYS
   * server-set — `.strict()` rejects at zod boundary. Belt-and-suspenders
   * here reinforces the invariant.
   */
  async create(ctx: TenantContext, input: CreateEntryBody): Promise<KnowledgeEntryResponse> {
    const data: Prisma.KnowledgeEntryUncheckedCreateInput = {
      hotelId: ctx.hotelId,
      title: input.title,
      content: input.content,
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
    };
    const row = await this.repo.create(data);
    return { data: serializeKnowledgeEntry(row) };
  }

  async update(
    ctx: TenantContext,
    id: string,
    input: UpdateEntryBody,
  ): Promise<KnowledgeEntryResponse> {
    await this.loadOwned(ctx, id);
    const data: Prisma.KnowledgeEntryUncheckedUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.content !== undefined) data.content = input.content;
    if (input.category !== undefined) data.category = input.category;
    if (input.tags !== undefined) data.tags = input.tags;
    if (input.is_active !== undefined) data.isActive = input.is_active;
    const row = await this.repo.update(id, data);
    return { data: serializeKnowledgeEntry(row) };
  }

  async remove(ctx: TenantContext, id: string): Promise<void> {
    await this.loadOwned(ctx, id);
    await this.repo.delete(id);
  }

  private async loadOwned(ctx: TenantContext, id: string): Promise<KnowledgeEntryRow> {
    const row = await this.repo.findById(id);
    if (!row) {
      throw new NotFoundError('KnowledgeEntry', id);
    }
    assertHotelOwnership(ctx, row.hotelId, 'KnowledgeEntry');
    return row;
  }
}
