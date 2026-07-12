// Service: Knowledge entries CRUD. No UNIQUE + no CHECK constraints at DB
// → no P2002/P2003 catches needed. Simplest business rules in Slot C.
// RBAC gate lives at the route layer (requireRole([gm_admin])).

import type { Prisma } from '@prisma/client';
import type { ZodType } from 'zod';

import { NotFoundError } from '@core/errors/app-errors.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';
import { parseCsvWithSchema } from '@shared/utils/csv-parser.js';

import type { KnowledgeRepository } from './knowledge.repository.js';
import {
  IMPORT_COLUMNS,
  ImportRowSchema,
  type CreateEntryBody,
  type ImportRow,
  type UpdateEntryBody,
} from './knowledge.schema.js';
import { serializeKnowledgeEntry } from './knowledge.serializer.js';
import type {
  KnowledgeEntryResponse,
  KnowledgeEntryRow,
  KnowledgeImportResponse,
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
    // FE field names → DB columns: question→title, answer→content, keywords→tags.
    const data: Prisma.KnowledgeEntryUncheckedCreateInput = {
      hotelId: ctx.hotelId,
      title: input.question,
      content: input.answer,
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.keywords !== undefined ? { tags: input.keywords } : {}),
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
    if (input.question !== undefined) data.title = input.question;
    if (input.answer !== undefined) data.content = input.answer;
    if (input.category !== undefined) data.category = input.category;
    if (input.keywords !== undefined) data.tags = input.keywords;
    if (input.is_active !== undefined) data.isActive = input.is_active;
    const row = await this.repo.update(id, data);
    return { data: serializeKnowledgeEntry(row) };
  }

  /**
   * Bulk-create knowledge entries from a CSV upload. Partial success: valid
   * rows are inserted, invalid rows collected into `errors` (1-indexed by data
   * row, matching FE KnowledgeImportResponse). Inserts are sequential to keep
   * the error surface stable and per-row (no all-or-nothing transaction — a
   * single bad row must not roll back the good ones).
   */
  async importCsv(ctx: TenantContext, csvText: string): Promise<KnowledgeImportResponse> {
    // ImportRowSchema transforms string cells (keywords split, category → null)
    // so its zod *input* type differs from its output; parseCsvWithSchema's
    // `ZodType<T>` collapses input=output. The runtime input is always the
    // parser's Record<string,string> row, so this narrowing is sound.
    const rowSchema = ImportRowSchema as unknown as ZodType<ImportRow>;
    const { valid, errors } = parseCsvWithSchema<ImportRow>(csvText, rowSchema, {
      columns: [...IMPORT_COLUMNS],
      hasHeader: true,
    });

    let imported = 0;
    for (const row of valid) {
      await this.repo.create({
        hotelId: ctx.hotelId,
        title: row.question,
        content: row.answer,
        category: row.category,
        tags: row.keywords,
      });
      imported++;
    }

    return {
      imported,
      skipped: errors.length,
      // CsvRowError.rowIndex is 0-based over data rows → 1-index for the UI.
      errors: errors.map((e) => ({ row: e.rowIndex + 1, reason: e.issues.join('; ') })),
    };
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
