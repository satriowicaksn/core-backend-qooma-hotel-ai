import type { Prisma } from '@prisma/client';

const TERMINAL_STATUSES = ['closed', 'cancelled'] as const;

export function isOverdue(row: { slaDueAt: Date | null; status: string }, now: Date): boolean {
  if (!row.slaDueAt) return false;
  if ((TERMINAL_STATUSES as readonly string[]).includes(row.status)) return false;
  return row.slaDueAt.getTime() < now.getTime();
}

export function overdueWhere(now: Date): Prisma.TicketWhereInput {
  return {
    slaDueAt: { lt: now },
    status: { notIn: [...TERMINAL_STATUSES] },
  };
}

export function notOverdueWhere(now: Date): Prisma.TicketWhereInput {
  return { NOT: overdueWhere(now) };
}
