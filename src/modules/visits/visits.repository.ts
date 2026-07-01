import type { Prisma, PrismaClient } from '@prisma/client';

import type { VisitRow } from './visits.types.js';

export class VisitsRepository {
  constructor(private readonly db: PrismaClient) {}

  async findManyPaged(
    where: Prisma.VisitWhereInput,
    skip: number,
    take: number,
  ): Promise<VisitRow[]> {
    return this.db.visit.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
    });
  }

  async countWhere(where: Prisma.VisitWhereInput): Promise<number> {
    return this.db.visit.count({ where });
  }
}
