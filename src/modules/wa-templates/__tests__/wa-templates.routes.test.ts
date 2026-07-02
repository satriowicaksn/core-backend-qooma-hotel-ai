import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { waTemplatesRoutes } from '../wa-templates.routes.js';
import type { WaTemplatesService } from '../wa-templates.service.js';
import type { WaTemplateListResponse, WaTemplateResponse } from '../wa-templates.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEMPLATE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const LIST_RESULT: WaTemplateListResponse = { data: [] };
const WIRE: WaTemplateResponse = {
  data: {
    id: TEMPLATE_ID,
    hotel_id: HOTEL_A,
    name: 'welcome_local',
    body: 'Halo {{name}}!',
    variables: ['name'],
    language: 'id',
    status: 'pending',
    template_id_meta: null,
    rejection_reason: null,
    is_global: false,
    approved_at: null,
    created_at: '2026-06-11T07:00:00.000Z',
    updated_at: '2026-06-11T07:00:00.000Z',
  },
};

interface Recorder {
  listCtx?: TenantContext;
  createName?: string;
  updateId?: string;
  removeId?: string;
  resubmitId?: string;
  removeReturn?: WaTemplateResponse | null;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: (ctx: TenantContext): Promise<WaTemplateListResponse> => {
      recorder.listCtx = ctx;
      return Promise.resolve(LIST_RESULT);
    },
    create: (_ctx: TenantContext, body: { name: string }): Promise<WaTemplateResponse> => {
      recorder.createName = body.name;
      return Promise.resolve(WIRE);
    },
    update: (_ctx: TenantContext, id: string): Promise<WaTemplateResponse> => {
      recorder.updateId = id;
      return Promise.resolve(WIRE);
    },
    remove: (_ctx: TenantContext, id: string): Promise<WaTemplateResponse | null> => {
      recorder.removeId = id;
      return Promise.resolve(recorder.removeReturn ?? null);
    },
    resubmit: (_ctx: TenantContext, id: string): Promise<WaTemplateResponse> => {
      recorder.resubmitId = id;
      return Promise.resolve(WIRE);
    },
  } as unknown as WaTemplatesService;

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
  void app.register(waTemplatesRoutes, { service });
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

describe('waTemplatesRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  it('should GET /wa-templates', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/wa-templates' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(LIST_RESULT);
    expect(recorder.listCtx).toEqual(GM);
  });

  it('should filter list by status query param', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/wa-templates?status=pending' });
    expect(res.statusCode).toBe(200);
  });

  it('should 400 on invalid status query value', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/wa-templates?status=bogus' });
    expect(res.statusCode).toBe(400);
  });

  it('should POST /wa-templates with 201', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/wa-templates',
      payload: { name: 'hotel_promo', body: 'Halo {{g}}', variables: ['g'] },
    });
    expect(res.statusCode).toBe(201);
    expect(recorder.createName).toBe('hotel_promo');
  });

  it('should reject POST body attempting to elevate to global (strict)', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/wa-templates',
      payload: { name: 'x', body: 'y', is_global: true },
    });
    expect(res.statusCode).toBe(400);
    expect(recorder.createName).toBeUndefined();
  });

  it('should PATCH /wa-templates/:id', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'PATCH',
      url: `/wa-templates/${TEMPLATE_ID}`,
      payload: { body: 'new body' },
    });
    expect(res.statusCode).toBe(200);
    expect(recorder.updateId).toBe(TEMPLATE_ID);
  });

  it('should DELETE with 204 on pending hard-delete (service returns null)', async () => {
    recorder = { removeReturn: null };
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'DELETE', url: `/wa-templates/${TEMPLATE_ID}` });
    expect(res.statusCode).toBe(204);
    expect(recorder.removeId).toBe(TEMPLATE_ID);
  });

  it('should DELETE with 200 + archived body on soft-archive (service returns row)', async () => {
    recorder = {
      removeReturn: { data: { ...WIRE.data, status: 'archived' } },
    };
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'DELETE', url: `/wa-templates/${TEMPLATE_ID}` });
    expect(res.statusCode).toBe(200);
    const body: WaTemplateResponse = res.json();
    expect(body.data.status).toBe('archived');
  });

  it('should POST /wa-templates/:id/resubmit with 200', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: `/wa-templates/${TEMPLATE_ID}/resubmit`,
    });
    expect(res.statusCode).toBe(200);
    expect(recorder.resubmitId).toBe(TEMPLATE_ID);
  });

  it('should 401 without a tenant context', async () => {
    app = buildApp(undefined, recorder);
    const res = await app.inject({ method: 'GET', url: '/wa-templates' });
    expect(res.statusCode).toBe(401);
  });

  it('should 403 for dept_head', async () => {
    app = buildApp(DEPT_HEAD, recorder);
    const res = await app.inject({ method: 'GET', url: '/wa-templates' });
    expect(res.statusCode).toBe(403);
  });

  it('should 403 for staff', async () => {
    app = buildApp(STAFF, recorder);
    const res = await app.inject({ method: 'GET', url: '/wa-templates' });
    expect(res.statusCode).toBe(403);
  });

  it('should allow super_admin', async () => {
    app = buildApp(SUPER, recorder);
    const res = await app.inject({ method: 'GET', url: '/wa-templates' });
    expect(res.statusCode).toBe(200);
  });

  it('should 400 on non-uuid id param', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'PATCH',
      url: '/wa-templates/not-a-uuid',
      payload: { body: 'x' },
    });
    expect(res.statusCode).toBe(400);
  });
});
