import type { Prisma, PrismaClient } from '@prisma/client';

import type { TicketDetailRow, TicketListRow, TicketRow } from './tickets.types.js';

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

  async groupCountByStatus(
    where: Prisma.TicketWhereInput,
  ): Promise<Array<{ status: string; count: number }>> {
    const grouped = await this.db.ticket.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });
    return grouped.map((g) => ({ status: g.status, count: g._count._all }));
  }

  async countWhere(where: Prisma.TicketWhereInput): Promise<number> {
    return this.db.ticket.count({ where });
  }

  async findOverdue(where: Prisma.TicketWhereInput, take: number): Promise<TicketListRow[]> {
    return this.db.ticket.findMany({
      where,
      include: LIST_INCLUDE,
      orderBy: [{ slaDueAt: 'asc' }, { id: 'asc' }],
      take,
    });
  }

  async findById(id: string): Promise<TicketRow | null> {
    return this.db.ticket.findUnique({ where: { id } });
  }

  async findDepartmentById(id: string): Promise<{ id: string; hotelId: string } | null> {
    return this.db.department.findUnique({ where: { id }, select: { id: true, hotelId: true } });
  }

  // Status transition + audit in one atomic tx. The status-guarded updateMany is
  // optimistic concurrency: count===1 means this transition won; 0 means the row
  // moved/vanished — caller re-resolves. Audit row only written when the update won.
  async transitionStatusTx(args: {
    id: string;
    hotelId: string;
    from: string;
    to: string;
    note: string | null;
    actorUserId: string;
  }): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const res = await tx.ticket.updateMany({
        where: { id: args.id, hotelId: args.hotelId, status: args.from },
        data: { status: args.to },
      });
      if (res.count === 1) {
        await tx.ticketUpdate.create({
          data: {
            hotelId: args.hotelId,
            ticketId: args.id,
            type: 'status_change',
            fromStatus: args.from,
            toStatus: args.to,
            note: args.note,
            actorUserId: args.actorUserId,
          },
        });
      }
      return res.count;
    });
  }

  async rerouteTx(args: {
    id: string;
    hotelId: string;
    fromDeptId: string;
    toDeptId: string;
    note: string | null;
    actorUserId: string;
  }): Promise<void> {
    await this.db.$transaction([
      this.db.ticket.update({ where: { id: args.id }, data: { departmentId: args.toDeptId } }),
      this.db.ticketUpdate.create({
        data: {
          hotelId: args.hotelId,
          ticketId: args.id,
          type: 'reroute',
          fromDepartmentId: args.fromDeptId,
          toDepartmentId: args.toDeptId,
          note: args.note,
          actorUserId: args.actorUserId,
        },
      }),
    ]);
  }
}
