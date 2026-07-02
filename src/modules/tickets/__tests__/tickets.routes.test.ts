import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { ticketsRoutes } from '../tickets.routes.js';
import type { TicketsService } from '../tickets.service.js';
import type {
  OverdueListResponse,
  TicketDetailResponse,
  TicketListResponse,
  TicketStatsResponse,
} from '../tickets.types.js';

const LIST_RESULT: TicketListResponse = {
  data: [],
  pageInfo: { nextCursor: null, hasMore: false },
};
const DETAIL_RESULT: TicketDetailResponse = {
  data: {
    id: 'ticket-1',
    ticket_number: 'HSK-2606-001',
    guest_id: 'guest-1',
    guest_name: 'Budi',
    wa_phone_masked: '+628******7890',
    department_id: 'dept-1',
    assigned_user_id: null,
    assigned_to: null,
    status: 'open',
    priority: 'normal',
    complaint_type: null,
    subject: 's',
    is_high_alert: false,
    is_overdue: false,
    resolved_satisfaction: null,
    sla_due_at: null,
    closed_at: null,
    created_at: '2026-06-11T07:00:00.000Z',
    updated_at: '2026-06-11T07:00:00.000Z',
    guest_email: null,
    complaint_detail: null,
    body: null,
    updates: [],
    messages: [],
  },
};

const STATS_RESULT: TicketStatsResponse = {
  data: {
    by_status: {
      open: 1,
      in_progress: 0,
      awaiting_late_reason: 0,
      done_pending: 0,
      closed: 0,
      high_alert: 0,
      escalated: 0,
      cancelled: 0,
    },
    total: 1,
    overdue: 0,
    high_alert_count: 0,
  },
};
const OVERDUE_RESULT: OverdueListResponse = {
  data: [],
  pageInfo: { nextCursor: null, hasMore: false },
};

interface Recorder {
  listCtx?: TenantContext;
  listQuery?: unknown;
  detailId?: string;
  statsHit?: boolean;
  overdueHit?: boolean;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: (ctx: TenantContext, rawQuery: unknown): Promise<TicketListResponse> => {
      recorder.listCtx = ctx;
      recorder.listQuery = rawQuery;
      return Promise.resolve(LIST_RESULT);
    },
    detail: (_ctx: TenantContext, id: string): Promise<TicketDetailResponse> => {
      recorder.detailId = id;
      return Promise.resolve(DETAIL_RESULT);
    },
    stats: (_ctx: TenantContext): Promise<TicketStatsResponse> => {
      recorder.statsHit = true;
      return Promise.resolve(STATS_RESULT);
    },
    overdue: (_ctx: TenantContext): Promise<OverdueListResponse> => {
      recorder.overdueHit = true;
      return Promise.resolve(OVERDUE_RESULT);
    },
  } as unknown as TicketsService;

  const app = Fastify();
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send(err.toJson());
    }
    return reply.code(500).send({ error: 'internal' });
  });
  app.addHook('preHandler', (req, _reply, done) => {
    req.tenant = tenant;
    done();
  });
  void app.register(ticketsRoutes, { service });
  return app;
}

const GM: TenantContext = {
  userId: 'u-1',
  hotelId: 'hotel-1',
  isSuperAdmin: false,
  role: 'gm_admin',
};

describe('ticketsRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 200 and pass the tenant context to the service when listing', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/tickets?limit=5&status=open' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(LIST_RESULT);
    expect(recorder.listCtx).toEqual(GM);
  });

  it('should return 401 when the request has no tenant context', async () => {
    app = buildApp(undefined, recorder);
    const res = await app.inject({ method: 'GET', url: '/tickets' });
    expect(res.statusCode).toBe(401);
    expect(recorder.listCtx).toBeUndefined();
  });

  it('should return 200 and forward the ticket id when fetching detail', async () => {
    app = buildApp(GM, recorder);
    const id = '11111111-1111-4111-8111-111111111111';
    const res = await app.inject({ method: 'GET', url: `/tickets/${id}` });
    expect(res.statusCode).toBe(200);
    expect(recorder.detailId).toBe(id);
  });

  it('should return 400 when the ticket id is not a valid uuid', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/tickets/not-a-uuid' });
    expect(res.statusCode).toBe(400);
    expect(recorder.detailId).toBeUndefined();
  });

  it('should route /tickets/stats to the stats handler, not the :id param route (E4)', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/tickets/stats' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(STATS_RESULT);
    expect(recorder.statsHit).toBe(true);
    expect(recorder.detailId).toBeUndefined();
  });

  it('should route /tickets/overdue to the overdue handler, not the :id param route (E4)', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/tickets/overdue?limit=5' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(OVERDUE_RESULT);
    expect(recorder.overdueHit).toBe(true);
    expect(recorder.detailId).toBeUndefined();
  });
});
