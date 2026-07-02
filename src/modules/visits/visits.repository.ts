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

  async findById(id: string): Promise<VisitRow | null> {
    return this.db.visit.findUnique({ where: { id } });
  }

  // Status-guarded verify-manual transition in one atomic tx (V2). The `status`
  // arm of the WHERE is the optimistic-concurrency guard: count===1 means this
  // transition won; 0 means the row moved/vanished (caller re-resolves). A visit
  // audit row would be written inside this same tx once an audit table lands
  // (GAP T16-#1 / Q-B-09) — for now the service's recordVisitAudit no-op stands.
  async verifyManualTx(args: {
    id: string;
    hotelId: string;
    from: string;
    data: Prisma.VisitUpdateManyMutationInput;
  }): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const res = await tx.visit.updateMany({
        where: { id: args.id, hotelId: args.hotelId, status: args.from },
        data: args.data,
      });
      return res.count;
    });
  }
}
