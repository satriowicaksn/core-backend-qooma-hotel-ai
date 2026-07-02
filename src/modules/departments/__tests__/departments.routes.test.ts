import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { departmentsRoutes } from '../departments.routes.js';
import type { DepartmentsService } from '../departments.service.js';
import type { DepartmentListResponse, DepartmentResponse } from '../departments.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEPT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const LIST_RESULT: DepartmentListResponse = { data: [] };
const DEPT_RESULT: DepartmentResponse = {
  data: {
    id: DEPT_ID,
    hotel_id: HOTEL_A,
    name: 'Housekeeping',
    code: 'HSK',
    operating_hours: {},
    escalation_chain: { l1_sla_minutes: 5 },
    telegram_chat_id: null,
    supervisor_telegram_id: null,
    is_active: true,
    created_at: '2026-06-11T07:00:00.000Z',
    updated_at: '2026-06-11T07:00:00.000Z',
  },
};

interface Recorder {
  listCtx?: TenantContext;
  createCtx?: TenantContext;
  createCode?: string;
  updateId?: string;
  removeId?: string;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: (ctx: TenantContext): Promise<DepartmentListResponse> => {
      recorder.listCtx = ctx;
      return Promise.resolve(LIST_RESULT);
    },
    create: (ctx: TenantContext, body: { code: string }): Promise<DepartmentResponse> => {
      recorder.createCtx = ctx;
      recorder.createCode = body.code;
      return Promise.resolve(DEPT_RESULT);
    },
    update: (_ctx: TenantContext, id: string): Promise<DepartmentResponse> => {
      recorder.updateId = id;
      return Promise.resolve(DEPT_RESULT);
    },
    remove: (_ctx: TenantContext, id: string): Promise<void> => {
      recorder.removeId = id;
      return Promise.resolve();
    },
  } as unknown as DepartmentsService;

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
  void app.register(departmentsRoutes, { service });
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

describe('departmentsRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  it('should GET /settings/departments and pass the tenant context', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/settings/departments' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(LIST_RESULT);
    expect(recorder.listCtx).toEqual(GM);
  });

  it('should POST /settings/departments with 201 on create', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/departments',
      payload: { name: 'Housekeeping', code: 'HSK' },
    });
    expect(res.statusCode).toBe(201);
    expect(recorder.createCode).toBe('HSK');
  });

  it('should PATCH /settings/departments/:id', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'PATCH',
      url: `/settings/departments/${DEPT_ID}`,
      payload: { name: 'HSK Updated' },
    });
    expect(res.statusCode).toBe(200);
    expect(recorder.updateId).toBe(DEPT_ID);
  });

  it('should DELETE /settings/departments/:id with 204', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'DELETE', url: `/settings/departments/${DEPT_ID}` });
    expect(res.statusCode).toBe(204);
    expect(recorder.removeId).toBe(DEPT_ID);
  });

  it('should 401 without a tenant context', async () => {
    app = buildApp(undefined, recorder);
    const res = await app.inject({ method: 'GET', url: '/settings/departments' });
    expect(res.statusCode).toBe(401);
  });

  it('should 403 for dept_head', async () => {
    app = buildApp(DEPT_HEAD, recorder);
    const res = await app.inject({ method: 'GET', url: '/settings/departments' });
    expect(res.statusCode).toBe(403);
  });

  it('should 403 for staff', async () => {
    app = buildApp(STAFF, recorder);
    const res = await app.inject({ method: 'POST', url: '/settings/departments', payload: {} });
    expect(res.statusCode).toBe(403);
  });

  it('should allow super_admin (implicit all-access)', async () => {
    app = buildApp(SUPER, recorder);
    const res = await app.inject({ method: 'GET', url: '/settings/departments' });
    expect(res.statusCode).toBe(200);
  });

  it('should 400 on non-uuid id param', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'PATCH',
      url: '/settings/departments/not-a-uuid',
      payload: { name: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should 400 on invalid code (fails regex CHECK)', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/departments',
      payload: { name: 'x', code: 'lowercase' },
    });
    expect(res.statusCode).toBe(400);
    expect(recorder.createCode).toBeUndefined();
  });
});
