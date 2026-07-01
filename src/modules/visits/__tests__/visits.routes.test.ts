import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { visitsRoutes } from '../visits.routes.js';
import type { VisitsService } from '../visits.service.js';
import type { VisitListResponse } from '../visits.types.js';

const LIST_RESULT: VisitListResponse = {
  data: [],
  pageInfo: { page: 1, pageSize: 20, total: 0, hasMore: false },
};

interface Recorder {
  listCtx?: TenantContext;
  listQuery?: unknown;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: (ctx: TenantContext, rawQuery: unknown): Promise<VisitListResponse> => {
      recorder.listCtx = ctx;
      recorder.listQuery = rawQuery;
      return Promise.resolve(LIST_RESULT);
    },
  } as unknown as VisitsService;

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
  void app.register(visitsRoutes, { service });
  return app;
}

const GM: TenantContext = { hotelId: 'hotel-1', isSuperAdmin: false, role: 'gm_admin' };

describe('visitsRoutes', () => {
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
    const res = await app.inject({
      method: 'GET',
      url: '/visits?status=pending_verification&pageSize=5',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(LIST_RESULT);
    expect(recorder.listCtx).toEqual(GM);
  });

  it('should return 401 when the request has no tenant context', async () => {
    app = buildApp(undefined, recorder);
    const res = await app.inject({ method: 'GET', url: '/visits' });
    expect(res.statusCode).toBe(401);
    expect(recorder.listCtx).toBeUndefined();
  });
});
