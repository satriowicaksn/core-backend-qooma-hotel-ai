import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { menuRoutes } from '../menu.routes.js';
import type { MenuService } from '../menu.service.js';
import type { BulkAvailabilityResponse } from '../menu.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const ID_A1 = '30000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ID_A2 = '30000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const BULK_RESULT: BulkAvailabilityResponse = {
  data: { updated: 2, skipped: [] },
};

interface Recorder {
  bulkBody?: unknown;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: () => Promise.resolve({ data: { categories: [] } }),
    createCategory: () => Promise.resolve({}),
    updateCategory: () => Promise.resolve({}),
    removeCategory: () => Promise.resolve(),
    createItem: () => Promise.resolve({}),
    updateItem: () => Promise.resolve({}),
    removeItem: () => Promise.resolve(),
    bulkAvailability: (_ctx: TenantContext, body: unknown): Promise<BulkAvailabilityResponse> => {
      recorder.bulkBody = body;
      return Promise.resolve(BULK_RESULT);
    },
  } as unknown as MenuService;

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
  void app.register(menuRoutes, { service });
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

describe('POST /settings/menu/bulk-availability', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return 200 with bulk result on happy path', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/menu/bulk-availability',
      payload: { item_ids: [ID_A1, ID_A2], is_available: true },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(BULK_RESULT);
    expect(recorder.bulkBody).toEqual({
      item_ids: [ID_A1, ID_A2],
      is_available: true,
    });
  });

  it('should 401 without tenant', async () => {
    app = buildApp(undefined, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/menu/bulk-availability',
      payload: { item_ids: [ID_A1], is_available: true },
    });
    expect(res.statusCode).toBe(401);
  });

  it('should 403 for dept_head', async () => {
    app = buildApp(DEPT_HEAD, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/menu/bulk-availability',
      payload: { item_ids: [ID_A1], is_available: true },
    });
    expect(res.statusCode).toBe(403);
  });

  it('should 403 for staff', async () => {
    app = buildApp(STAFF, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/menu/bulk-availability',
      payload: { item_ids: [ID_A1], is_available: true },
    });
    expect(res.statusCode).toBe(403);
  });

  it('should allow super_admin', async () => {
    app = buildApp(SUPER, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/menu/bulk-availability',
      payload: { item_ids: [ID_A1], is_available: true },
    });
    expect(res.statusCode).toBe(200);
  });

  it('should 400 on empty item_ids', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/menu/bulk-availability',
      payload: { item_ids: [], is_available: true },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should 400 on empty-delta body (Q-T23-#5)', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/menu/bulk-availability',
      payload: { item_ids: [ID_A1] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should 400 on unknown field (strict — hotel_id)', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/menu/bulk-availability',
      payload: {
        item_ids: [ID_A1],
        is_available: true,
        hotel_id: 'attacker',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should 400 on only-from window (both-or-neither refine)', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: '/settings/menu/bulk-availability',
      payload: { item_ids: [ID_A1], available_window_from: '06:00' },
    });
    expect(res.statusCode).toBe(400);
  });
});
