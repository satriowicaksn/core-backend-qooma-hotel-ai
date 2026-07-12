// Repository: Prisma direct (no interface — ADR-0001). Analytics
// aggregations over local Slot B `tickets` table.
//
// PM ACK coding note: `$queryRaw` uses Prisma.sql template literal for
// parameterized dates — never string-interpolate to avoid SQL injection.

import { Prisma, type PrismaClient } from '@prisma/client';

import type {
  DepartmentPerformanceRow,
  HighAlertDeptRow,
  OverviewAggRow,
  PeakHoursRow,
  SatisfactionRow,
  TicketsByDayRow,
  TopRequestRow,
} from './analytics.types.js';

interface RawOverviewRow {
  total_tickets: bigint;
  closed_tickets: bigint;
  avg_satisfaction: Prisma.Decimal | null;
  avg_response_time_minutes: Prisma.Decimal | null;
}

interface RawTicketByDayRow {
  bucket: Date;
  count: bigint;
  closed: bigint;
  high_alert: bigint;
}

interface RawHighAlertRow {
  department_id: string;
  current_count: bigint;
  current_high_alert: bigint;
  prev_count: bigint;
  prev_high_alert: bigint;
}

interface RawDepartmentPerfRow {
  department_id: string;
  department_name: string;
  department_code: string;
  total: bigint;
  closed: bigint;
  avg_response_minutes: Prisma.Decimal | null;
}

interface RawPeakHoursRow {
  weekday: number;
  hour: number;
  total: bigint;
}

interface RawTopRequestRow {
  code: string;
  total: bigint;
}

interface RawSatisfactionRow {
  bucket: Date;
  score: Prisma.Decimal | null;
  responses: bigint;
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
        COUNT(*)::bigint AS count,
        COUNT(*) FILTER (WHERE status = 'closed')::bigint AS closed,
        COUNT(*) FILTER (WHERE is_high_alert)::bigint AS high_alert
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
      closed: Number(r.closed),
      highAlert: Number(r.high_alert),
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

  async departmentPerformance(
    hotelId: string,
    from: Date,
    to: Date,
  ): Promise<DepartmentPerformanceRow[]> {
    const rows = await this.db.$queryRaw<RawDepartmentPerfRow[]>(Prisma.sql`
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        d.code AS department_code,
        COUNT(t.id)::bigint AS total,
        COUNT(t.id) FILTER (WHERE t.status = 'closed')::bigint AS closed,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (t.closed_at - t.created_at)) / 60.0)
            FILTER (WHERE t.status = 'closed'),
          0
        ) AS avg_response_minutes
      FROM tickets t
      JOIN departments d ON d.id = t.department_id
      WHERE t.hotel_id = ${hotelId}::uuid
        AND t.created_at >= ${from}
        AND t.created_at <= ${to}
      GROUP BY d.id, d.name, d.code
      ORDER BY total DESC
    `);
    return rows.map((r) => ({
      departmentId: r.department_id,
      departmentName: r.department_name,
      departmentCode: r.department_code,
      total: Number(r.total),
      closed: Number(r.closed),
      avgResponseMinutes: r.avg_response_minutes ? Number(r.avg_response_minutes.toFixed(2)) : 0,
    }));
  }

  async peakHours(hotelId: string, from: Date, to: Date): Promise<PeakHoursRow[]> {
    const rows = await this.db.$queryRaw<RawPeakHoursRow[]>(Prisma.sql`
      SELECT
        EXTRACT(DOW FROM created_at)::int AS weekday,
        EXTRACT(HOUR FROM created_at)::int AS hour,
        COUNT(*)::bigint AS total
      FROM tickets
      WHERE hotel_id = ${hotelId}::uuid
        AND created_at >= ${from}
        AND created_at <= ${to}
      GROUP BY weekday, hour
      ORDER BY weekday ASC, hour ASC
    `);
    return rows.map((r) => ({
      weekday: r.weekday,
      hour: r.hour,
      total: Number(r.total),
    }));
  }

  async topRequests(hotelId: string, from: Date, to: Date): Promise<TopRequestRow[]> {
    const rows = await this.db.$queryRaw<RawTopRequestRow[]>(Prisma.sql`
      SELECT
        complaint_type AS code,
        COUNT(*)::bigint AS total
      FROM tickets
      WHERE hotel_id = ${hotelId}::uuid
        AND created_at >= ${from}
        AND created_at <= ${to}
        AND complaint_type IS NOT NULL
      GROUP BY complaint_type
      ORDER BY total DESC
      LIMIT 10
    `);
    return rows.map((r) => ({
      code: r.code,
      total: Number(r.total),
    }));
  }

  async satisfactionByDay(hotelId: string, from: Date, to: Date): Promise<SatisfactionRow[]> {
    const rows = await this.db.$queryRaw<RawSatisfactionRow[]>(Prisma.sql`
      SELECT
        DATE(closed_at) AS bucket,
        AVG(resolved_satisfaction) AS score,
        COUNT(*)::bigint AS responses
      FROM tickets
      WHERE hotel_id = ${hotelId}::uuid
        AND created_at >= ${from}
        AND created_at <= ${to}
        AND resolved_satisfaction IS NOT NULL
        AND closed_at IS NOT NULL
      GROUP BY bucket
      ORDER BY bucket ASC
    `);
    return rows.map((r) => ({
      date: r.bucket.toISOString().slice(0, 10),
      score: r.score ? Number(r.score.toFixed(2)) : 0,
      responses: Number(r.responses),
    }));
  }
}
