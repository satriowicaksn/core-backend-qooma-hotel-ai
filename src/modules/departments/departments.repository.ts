// Repository: Prisma direct (no interface — ADR-0001).
// Delete-conflict uses `count` queries not `findMany` (cheaper + no memory
// pressure per PM C reminder).

import type { Prisma, PrismaClient } from '@prisma/client';

import type { DepartmentRow } from './departments.types.js';

// "Open" ticket statuses = anything not terminal. The T02 migration CHECK
// constraint (20260701112000_add_hc_check_constraints_and_partial_indexes:39)
// enumerates: open, in_progress, awaiting_late_reason, done_pending, closed,
// high_alert, escalated, cancelled. Terminal = {closed, cancelled} — matches
// the partial-index guard in the same migration (line 111). Anything else
// blocks department delete.
const TERMINAL_TICKET_STATUSES = ['closed', 'cancelled'];

export class DepartmentsRepository {
  constructor(private readonly db: PrismaClient) {}

  async findMany(where: Prisma.DepartmentWhereInput): Promise<DepartmentRow[]> {
    return this.db.department.findMany({
      where,
      orderBy: [{ code: 'asc' }],
    });
  }

  async findById(id: string): Promise<DepartmentRow | null> {
    return this.db.department.findUnique({ where: { id } });
  }

  async create(data: Prisma.DepartmentUncheckedCreateInput): Promise<DepartmentRow> {
    return this.db.department.create({ data });
  }

  async update(id: string, data: Prisma.DepartmentUncheckedUpdateInput): Promise<DepartmentRow> {
    return this.db.department.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.db.department.delete({ where: { id } });
  }

  async countOpenTickets(deptId: string): Promise<number> {
    return this.db.ticket.count({
      where: { departmentId: deptId, status: { notIn: TERMINAL_TICKET_STATUSES } },
    });
  }
}
