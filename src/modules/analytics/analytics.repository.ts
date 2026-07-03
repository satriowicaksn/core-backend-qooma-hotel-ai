// Repository: Prisma direct (no interface — ADR-0001). Analytics
// aggregations over local Slot B `tickets` table.
//
// PM ACK coding note: `$queryRaw` uses Prisma.sql template literal for
// parameterized dates — never string-interpolate to avoid SQL injection.

import { Prisma, type PrismaClient } from '@prisma/client';

import type { HighAlertDeptRow, OverviewAggRow, TicketsByDayRow } from './analytics.types.js';

interface RawOverviewRow {
  total_tickets: bigint;
  closed_tickets: bigint;
  avg_satisfaction: Prisma.Decimal | null;
  avg_response_time_minutes: Prisma.Decimal | null;
}

interface RawTicketByDayRow {
  bucket: Date;
  count: bigint;
}

interface RawHighAlertRow {
  department_id: string;
  current_count: bigint;
  current_high_alert: bigint;
  prev_count: bigint;
  prev_high_alert: bigint;
}

export class AnalyticsRepository {
  constructor(private readonly db: PrismaClient) {}

  async overviewAgg(hotelId: string, from: Date, to: Date): Promise<OverviewAggRow> {
    const rows = await this.db.$queryRaw<RawOverviewRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total_tickets,
        COUNT(*) FILTER (WHERE status = 'closed')::bigint AS closed_tickets,
        AVG(resolved_satisfaction) FILTER (WHERE resolved_satisfaction IS NOT NULL)
          AS avg_satisfaction,
        AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 60.0)
          FILTER (WHERE closed_at IS NOT NULL)
          AS avg_response_time_minutes
      FROM tickets
      WHERE hotel_id = ${hotelId}::uuid
        AND created_at >= ${from}
        AND created_at <= ${to}
    `);
    const row = rows[0];
    if (!row) {
      return {
        totalTickets: 0,
        closedTickets: 0,
        avgSatisfaction: null,
        avgResponseTimeMinutes: null,
      };
    }
    return {
      totalTickets: Number(row.total_tickets),
      closedTickets: Number(row.closed_tickets),
      avgSatisfaction: row.avg_satisfaction ? row.avg_satisfaction.toFixed(2) : null,
      avgResponseTimeMinutes: row.avg_response_time_minutes
        ? Number(row.avg_response_time_minutes.toFixed(2))
        : null,
    };
  }

  async ticketsByDay(hotelId: string, from: Date, to: Date): Promise<TicketsByDayRow[]> {
    const rows = await this.db.$queryRaw<RawTicketByDayRow[]>(Prisma.sql`
      SELECT
        date_trunc('day', created_at) AS bucket,
        COUNT(*)::bigint AS count
      FROM tickets
      WHERE hotel_id = ${hotelId}::uuid
        AND created_at >= ${from}
        AND created_at <= ${to}
      GROUP BY bucket
      ORDER BY bucket ASC
    `);
    return rows.map((r) => ({
      date: r.bucket.toISOString().slice(0, 10),
      count: Number(r.count),
    }));
  }

  async highAlertByDept(
    hotelId: string,
    from: Date,
    to: Date,
    prevFrom: Date,
    prevTo: Date,
  ): Promise<HighAlertDeptRow[]> {
    // Aggregates both current + prev windows in a single query per department.
    const rows = await this.db.$queryRaw<RawHighAlertRow[]>(Prisma.sql`
      SELECT
        department_id,
        COUNT(*) FILTER (WHERE created_at >= ${from} AND created_at <= ${to})::bigint
          AS current_count,
        COUNT(*) FILTER (WHERE created_at >= ${from} AND created_at <= ${to} AND is_high_alert)::bigint
          AS current_high_alert,
        COUNT(*) FILTER (WHERE created_at >= ${prevFrom} AND created_at <= ${prevTo})::bigint
          AS prev_count,
        COUNT(*) FILTER (WHERE created_at >= ${prevFrom} AND created_at <= ${prevTo} AND is_high_alert)::bigint
          AS prev_high_alert
      FROM tickets
      WHERE hotel_id = ${hotelId}::uuid
        AND (
          (created_at >= ${prevFrom} AND created_at <= ${prevTo})
          OR (created_at >= ${from} AND created_at <= ${to})
        )
      GROUP BY department_id
      ORDER BY department_id ASC
    `);
    return rows.map((r) => ({
      departmentId: r.department_id,
      currentCount: Number(r.current_count),
      currentHighAlert: Number(r.current_high_alert),
      prevCount: Number(r.prev_count),
      prevHighAlert: Number(r.prev_high_alert),
    }));
  }
}
