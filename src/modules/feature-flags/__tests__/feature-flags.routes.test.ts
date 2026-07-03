import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { featureFlagsRoutes } from '../feature-flags.routes.js';
import type { FeatureFlagsService } from '../feature-flags.service.js';
import type { FeatureFlagListResponse, FeatureFlagResponse } from '../feature-flags.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const LIST_RESULT: FeatureFlagListResponse = { data: [] };
const FLAG_RESULT: FeatureFlagResponse = {
  data: {
    hotel_id: HOTEL_A,
    flag: 'multi_language',
    is_enabled: true,
    config: {},
    min_tier: null,
    is_tier_locked: null,
    depends_on_active_data: null,
    updated_at: '2026-07-03T00:00:00.000Z',
    updated_by: null,
  },
};

interface Recorder {
  patchFlag?: string;
  patchBody?: unknown;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: () => Promise.resolve(LIST_RESULT),
    patch: (_ctx: TenantContext, flag: string, body: unknown): Promise<FeatureFlagResponse> => {
      recorder.patchFlag = flag;
      recorder.patchBody = body;
      return Promise.resolve(FLAG_RESULT);
    },
  } as unknown as FeatureFlagsService;

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
  void app.register(featureFlagsRoutes, { service });
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

describe('featureFlagsRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /feature-flags', () => {
    it('should list feature flags', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/feature-flags' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(LIST_RESULT);
    });

    it('should 401 without tenant', async () => {
      app = buildApp(undefined, recorder);
      const res = await app.inject({ method: 'GET', url: '/feature-flags' });
      expect(res.statusCode).toBe(401);
    });

    it('should 403 for dept_head', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({ method: 'GET', url: '/feature-flags' });
      expect(res.statusCode).toBe(403);
    });

    it('should 403 for staff', async () => {
      app = buildApp(STAFF, recorder);
      const res = await app.inject({ method: 'GET', url: '/feature-flags' });
      expect(res.statusCode).toBe(403);
    });

    it('should allow super_admin', async () => {
      app = buildApp(SUPER, recorder);
      const res = await app.inject({ method: 'GET', url: '/feature-flags' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('PATCH /feature-flags/:flag', () => {
    it('should return 200 on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: '/feature-flags/multi_language',
        payload: { is_enabled: true },
      });
      expect(res.statusCode).toBe(200);
      expect(recorder.patchFlag).toBe('multi_language');
    });

    it('should 400 on unknown flag param', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: '/feature-flags/not_a_real_flag',
        payload: { is_enabled: true },
      });
      expect(res.statusCode).toBe(400);
      expect(recorder.patchFlag).toBeUndefined();
    });

    it('should 400 on empty body (refine non-empty)', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: '/feature-flags/multi_language',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on unknown field (strict — hotel_id)', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: '/feature-flags/multi_language',
        payload: { is_enabled: true, hotel_id: 'attacker' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should accept ?force=true as no-op slice-1', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: '/feature-flags/multi_language?force=true',
        payload: { is_enabled: true },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should 400 on bogus ?force value', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: '/feature-flags/multi_language?force=bogus',
        payload: { is_enabled: true },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 403 for dept_head on PATCH', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: '/feature-flags/multi_language',
        payload: { is_enabled: true },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
