import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { visitsRoutes } from '../visits.routes.js';
import type { VisitsService } from '../visits.service.js';
import type { VisitDetailResponse, VisitListResponse } from '../visits.types.js';

const LIST_RESULT: VisitListResponse = {
  data: [],
  pageInfo: { page: 1, pageSize: 20, total: 0, hasMore: false },
};
const DETAIL_RESULT: VisitDetailResponse = {
  data: {
    id: 'visit-1',
    guest_id: 'guest-1',
    check_in: '2026-06-11T06:00:00.000Z',
    check_out: '2026-06-13T04:00:00.000Z',
    nights: 2,
    room_number: '1204',
    status: 'checked_in',
    booking_source: null,
    verification_attempts: 0,
    special_request: null,
    satisfaction_score: null,
    created_at: '2026-06-11T05:00:00.000Z',
    updated_at: '2026-06-11T05:00:00.000Z',
  },
};

interface Recorder {
  listCtx?: TenantContext;
  listQuery?: unknown;
  verifyId?: string;
  verifyBody?: unknown;
  rejectId?: string;
  approveId?: string;
  approveBody?: unknown;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: (ctx: TenantContext, rawQuery: unknown): Promise<VisitListResponse> => {
      recorder.listCtx = ctx;
      recorder.listQuery = rawQuery;
      return Promise.resolve(LIST_RESULT);
    },
    verifyManual: (
      _ctx: TenantContext,
      id: string,
      body: unknown,
    ): Promise<VisitDetailResponse> => {
      recorder.verifyId = id;
      recorder.verifyBody = body;
      return Promise.resolve(DETAIL_RESULT);
    },
    reject: (_ctx: TenantContext, id: string): Promise<VisitDetailResponse> => {
      recorder.rejectId = id;
      return Promise.resolve(DETAIL_RESULT);
    },
    approveManual: (
      _ctx: TenantContext,
      id: string,
      body: unknown,
    ): Promise<VisitDetailResponse> => {
      recorder.approveId = id;
      recorder.approveBody = body;
      return Promise.resolve(DETAIL_RESULT);
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

const GM: TenantContext = {
  userId: 'user-1',
  hotelId: 'hotel-1',
  isSuperAdmin: false,
  role: 'gm_admin',
};
const VALID_ID = '11111111-1111-4111-8111-111111111111';

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

  it('should forward the visit id + body to the service on verify-manual', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'PATCH',
      url: `/visits/${VALID_ID}/verify-manual`,
      payload: { action: 'reject' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(DETAIL_RESULT);
    expect(recorder.verifyId).toBe(VALID_ID);
    expect(recorder.verifyBody).toEqual({ action: 'reject' });
  });

  it('should return 400 when the visit id is not a valid uuid on verify-manual', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'PATCH',
      url: '/visits/not-a-uuid/verify-manual',
      payload: { action: 'reject' },
    });
    expect(res.statusCode).toBe(400);
    expect(recorder.verifyId).toBeUndefined();
  });

  it('should route /visits/:id/reject to the reject handler (no body)', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'PATCH', url: `/visits/${VALID_ID}/reject` });
    expect(res.statusCode).toBe(200);
    expect(recorder.rejectId).toBe(VALID_ID);
  });

  it('should route /visits/:id/approve-manual and forward the body', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'PATCH',
      url: `/visits/${VALID_ID}/approve-manual`,
      payload: { guest_name: 'Rahmat', room_number: '1210', nights: 2 },
    });
    expect(res.statusCode).toBe(200);
    expect(recorder.approveId).toBe(VALID_ID);
    expect(recorder.approveBody).toEqual({ guest_name: 'Rahmat', room_number: '1210', nights: 2 });
  });

  it('should 401 on reject without a tenant context', async () => {
    app = buildApp(undefined, recorder);
    const res = await app.inject({ method: 'PATCH', url: `/visits/${VALID_ID}/reject` });
    expect(res.statusCode).toBe(401);
    expect(recorder.rejectId).toBeUndefined();
  });
});
