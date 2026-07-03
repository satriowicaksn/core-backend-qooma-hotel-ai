import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError, BusinessRuleError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { analyticsRoutes } from '../analytics.routes.js';
import type { AnalyticsService } from '../analytics.service.js';
import type {
  HighAlertResponse,
  OverviewResponse,
  TicketsTimeSeriesResponse,
} from '../analytics.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const META = {
  tier: null,
  is_luxury_gate: null,
  from: '2026-06-01',
  to: '2026-06-30',
  period: 'day' as const,
};

const OVERVIEW_RESULT: OverviewResponse = {
  data: {
    total_tickets: 42,
    resolution_rate: 0.5,
    avg_satisfaction: '4.30',
    avg_response_time_minutes: 25.5,
  },
  meta: META,
};

const TICKETS_RESULT: TicketsTimeSeriesResponse = {
  data: [{ date: '2026-06-01', count: 5 }],
  meta: META,
};

const HIGH_ALERT_RESULT: HighAlertResponse = {
  data: [],
  alert_summary: {
    total_high_alert: 0,
    threshold_exceeded_count: 0,
    recommendation_key: 'all_departments_healthy',
  },
  meta: META,
};

interface Recorder {
  overviewThrow?: Error;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    overview: (): Promise<OverviewResponse> => {
      if (recorder.overviewThrow) return Promise.reject(recorder.overviewThrow);
      return Promise.resolve(OVERVIEW_RESULT);
    },
    tickets: () => Promise.resolve(TICKETS_RESULT),
    highAlert: () => Promise.resolve(HIGH_ALERT_RESULT),
  } as unknown as AnalyticsService;

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
  void app.register(analyticsRoutes, { service });
  return app;
}

const GM: TenantContext = {
  userId: USER_ID,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const DEPT_HEAD: TenantContext = { ...GM, role: 'dept_head', deptId: 'x' };
const STAFF: TenantContext = { ...GM, role: 'staff' };
const SUPER: TenantContext = { ...GM, role: 'super_admin', isSuperAdmin: true };

describe('analyticsRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /analytics/overview', () => {
    it('should return 200 with overview + meta', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/analytics/overview' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(OVERVIEW_RESULT);
    });

    it('should 401 without tenant', async () => {
      app = buildApp(undefined, recorder);
      const res = await app.inject({ method: 'GET', url: '/analytics/overview' });
      expect(res.statusCode).toBe(401);
    });

    it('should allow dept_head (spec §6:800 owns-dept slice — slice-1 no filter)', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({ method: 'GET', url: '/analytics/overview' });
      expect(res.statusCode).toBe(200);
    });

    it('should 403 for staff', async () => {
      app = buildApp(STAFF, recorder);
      const res = await app.inject({ method: 'GET', url: '/analytics/overview' });
      expect(res.statusCode).toBe(403);
    });

    it('should allow super_admin', async () => {
      app = buildApp(SUPER, recorder);
      const res = await app.inject({ method: 'GET', url: '/analytics/overview' });
      expect(res.statusCode).toBe(200);
    });

    it('should 400 on bogus ?period', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/analytics/overview?period=year' });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on bad ?from date', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'GET',
        url: '/analytics/overview?from=not-a-date',
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 422 TIER_GATE when service throws BusinessRuleError', async () => {
      recorder = {
        overviewThrow: new BusinessRuleError('Analytics restricted to Luxury tier', {
          rule: 'TIER_GATE',
        }),
      };
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/analytics/overview' });
      expect(res.statusCode).toBe(422);
      const body: { code: string; details: { rule: string } } = res.json();
      expect(body.code).toBe('BUSINESS_RULE');
      expect(body.details.rule).toBe('TIER_GATE');
    });
  });

  describe('GET /analytics/tickets', () => {
    it('should return time-series buckets', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/analytics/tickets' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(TICKETS_RESULT);
    });
  });

  describe('GET /analytics/high-alert', () => {
    it('should return dept wires + alert_summary + meta', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/analytics/high-alert' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(HIGH_ALERT_RESULT);
    });

    it('should 403 for staff', async () => {
      app = buildApp(STAFF, recorder);
      const res = await app.inject({ method: 'GET', url: '/analytics/high-alert' });
      expect(res.statusCode).toBe(403);
    });
  });
});
