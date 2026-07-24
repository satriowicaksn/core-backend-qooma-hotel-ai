// Repository: Prisma direct (no interface — ADR-0001).

import type { Prisma, PrismaClient } from '@prisma/client';

import type { KnowledgeEntryRow } from './knowledge.types.js';

export class KnowledgeRepository {
  constructor(private readonly db: PrismaClient) {}

  async findMany(where: Prisma.KnowledgeEntryWhereInput): Promise<KnowledgeEntryRow[]> {
    return this.db.knowledgeEntry.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: string): Promise<KnowledgeEntryRow | null> {
    return this.db.knowledgeEntry.findUnique({ where: { id } });
  }

  async create(data: Prisma.KnowledgeEntryUncheckedCreateInput): Promise<KnowledgeEntryRow> {
    return this.db.knowledgeEntry.create({ data });
  }

  async update(
    id: string,
    data: Prisma.KnowledgeEntryUncheckedUpdateInput,
  ): Promise<KnowledgeEntryRow> {
    return this.db.knowledgeEntry.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.db.knowledgeEntry.delete({ where: { id } });
  }

  async searchForRag(hotelId: string, query: string, limit: number): Promise<KnowledgeEntryRow[]> {
    const q = query.trim();
    if (q === '') return [];
    return this.db.knowledgeEntry.findMany({
      where: {
        hotelId,
        isActive: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { tags: { has: q.toLowerCase() } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
    });
  }
}
