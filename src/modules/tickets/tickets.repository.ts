import type { Prisma, PrismaClient } from '@prisma/client';

import type { TicketDetailRow, TicketListRow } from './tickets.types.js';

const LIST_INCLUDE = {
  guest: true,
  assignedUser: true,
} satisfies Prisma.TicketInclude;

const DETAIL_INCLUDE = {
  guest: true,
  assignedUser: true,
  updates: { include: { actor: true }, orderBy: { createdAt: 'asc' } },
  messages: { orderBy: { sentAt: 'asc' } },
} satisfies Prisma.TicketInclude;

export class TicketsRepository {
  constructor(private readonly db: PrismaClient) {}

  async findMany(where: Prisma.TicketWhereInput, take: number): Promise<TicketListRow[]> {
    return this.db.ticket.findMany({
      where,
      include: LIST_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
  }

  async findDetailById(id: string): Promise<TicketDetailRow | null> {
    return this.db.ticket.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
  }
}
