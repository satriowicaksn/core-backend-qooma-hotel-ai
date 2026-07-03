import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError, ConflictError, NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { menuRoutes } from '../menu.routes.js';
import type { MenuService } from '../menu.service.js';
import type { MenuCategoryResponse, MenuItemResponse, MenuListResponse } from '../menu.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CATEGORY_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ITEM_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const LIST_RESULT: MenuListResponse = { data: { categories: [] } };
const CATEGORY_RESULT: MenuCategoryResponse = {
  data: {
    id: CATEGORY_ID,
    hotel_id: HOTEL_A,
    name: 'Beverages',
    sort_order: 0,
    is_active: true,
    items: [],
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  },
};
const ITEM_RESULT: MenuItemResponse = {
  data: {
    id: ITEM_ID,
    hotel_id: HOTEL_A,
    category_id: CATEGORY_ID,
    name: 'Coffee',
    description: null,
    price_idr: '25000.00',
    image_url: null,
    prep_minutes: 5,
    is_available: true,
    available_window_from: null,
    available_window_to: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  },
};

interface Recorder {
  createCategoryThrow?: Error;
  removeCategoryThrow?: Error;
  createItemThrow?: Error;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: (): Promise<MenuListResponse> => Promise.resolve(LIST_RESULT),
    createCategory: (): Promise<MenuCategoryResponse> => {
      if (recorder.createCategoryThrow) return Promise.reject(recorder.createCategoryThrow);
      return Promise.resolve(CATEGORY_RESULT);
    },
    updateCategory: (): Promise<MenuCategoryResponse> => Promise.resolve(CATEGORY_RESULT),
    removeCategory: (): Promise<void> => {
      if (recorder.removeCategoryThrow) return Promise.reject(recorder.removeCategoryThrow);
      return Promise.resolve();
    },
    createItem: (): Promise<MenuItemResponse> => {
      if (recorder.createItemThrow) return Promise.reject(recorder.createItemThrow);
      return Promise.resolve(ITEM_RESULT);
    },
    updateItem: (): Promise<MenuItemResponse> => Promise.resolve(ITEM_RESULT),
    removeItem: (): Promise<void> => Promise.resolve(),
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

describe('menuRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /settings/menu', () => {
    it('should return nested categories-with-items', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/menu' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(LIST_RESULT);
    });

    it('should filter by ?is_active', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/menu?is_active=true' });
      expect(res.statusCode).toBe(200);
    });

    it('should 400 on bad is_active value', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/menu?is_active=bogus' });
      expect(res.statusCode).toBe(400);
    });

    it('should 401 without tenant', async () => {
      app = buildApp(undefined, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/menu' });
      expect(res.statusCode).toBe(401);
    });

    it('should 403 for dept_head', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/menu' });
      expect(res.statusCode).toBe(403);
    });

    it('should 403 for staff', async () => {
      app = buildApp(STAFF, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/menu' });
      expect(res.statusCode).toBe(403);
    });

    it('should allow super_admin', async () => {
      app = buildApp(SUPER, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/menu' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /settings/menu/categories', () => {
    it('should return 201 on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/menu/categories',
        payload: { name: 'Beverages' },
      });
      expect(res.statusCode).toBe(201);
    });

    it('should 409 CATEGORY_NAME_TAKEN when service throws', async () => {
      recorder = {
        createCategoryThrow: new ConflictError('Category name taken', {
          reason: 'CATEGORY_NAME_TAKEN',
          name: 'Beverages',
        }),
      };
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/menu/categories',
        payload: { name: 'Beverages' },
      });
      expect(res.statusCode).toBe(409);
    });

    it('should 400 on empty category name', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/menu/categories',
        payload: { name: '' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /settings/menu/categories/:id', () => {
    it('should return 200 on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/menu/categories/${CATEGORY_ID}`,
        payload: { sort_order: 5 },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should 400 on non-uuid id', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: '/settings/menu/categories/not-a-uuid',
        payload: { sort_order: 5 },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on empty body', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/menu/categories/${CATEGORY_ID}`,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /settings/menu/categories/:id', () => {
    it('should return 204 on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'DELETE',
        url: `/settings/menu/categories/${CATEGORY_ID}`,
      });
      expect(res.statusCode).toBe(204);
    });

    it('should 409 CATEGORY_HAS_ITEMS when service throws', async () => {
      recorder = {
        removeCategoryThrow: new ConflictError('Category has items', {
          reason: 'CATEGORY_HAS_ITEMS',
          itemCount: 3,
        }),
      };
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'DELETE',
        url: `/settings/menu/categories/${CATEGORY_ID}`,
      });
      expect(res.statusCode).toBe(409);
      const body: { details: { reason: string; itemCount: number } } = res.json();
      expect(body.details.reason).toBe('CATEGORY_HAS_ITEMS');
      expect(body.details.itemCount).toBe(3);
    });
  });

  describe('POST /settings/menu', () => {
    it('should return 201 on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/menu',
        payload: { category_id: CATEGORY_ID, name: 'Coffee', price_idr: 25000 },
      });
      expect(res.statusCode).toBe(201);
    });

    it('should 400 on missing category_id', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/menu',
        payload: { name: 'Coffee', price_idr: 25000 },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 404 cross-tenant category from service', async () => {
      recorder = { createItemThrow: new NotFoundError('MenuCategory', CATEGORY_ID) };
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/menu',
        payload: { category_id: CATEGORY_ID, name: 'Coffee', price_idr: 25000 },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /settings/menu/:id', () => {
    it('should return 200 on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/menu/${ITEM_ID}`,
        payload: { name: 'Cold Brew' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should 400 on empty body', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/menu/${ITEM_ID}`,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /settings/menu/:id', () => {
    it('should return 204 on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'DELETE', url: `/settings/menu/${ITEM_ID}` });
      expect(res.statusCode).toBe(204);
    });
  });
});
