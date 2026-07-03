import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError, NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { knowledgeRoutes } from '../knowledge.routes.js';
import type { KnowledgeService } from '../knowledge.service.js';
import type { KnowledgeEntryResponse, KnowledgeListResponse } from '../knowledge.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ENTRY_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const LIST_RESULT: KnowledgeListResponse = { data: [] };
const ENTRY_RESULT: KnowledgeEntryResponse = {
  data: {
    id: ENTRY_ID,
    hotel_id: HOTEL_A,
    title: 'Check-in FAQ',
    content: 'How to check in early',
    category: 'faq',
    tags: ['welcome'],
    is_active: true,
    created_at: '2026-07-03T00:00:00.000Z',
    updated_at: '2026-07-03T00:00:00.000Z',
  },
};

interface Recorder {
  updateThrow?: Error;
  removeThrow?: Error;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: (): Promise<KnowledgeListResponse> => Promise.resolve(LIST_RESULT),
    create: (): Promise<KnowledgeEntryResponse> => Promise.resolve(ENTRY_RESULT),
    update: (): Promise<KnowledgeEntryResponse> => {
      if (recorder.updateThrow) return Promise.reject(recorder.updateThrow);
      return Promise.resolve(ENTRY_RESULT);
    },
    remove: (): Promise<void> => {
      if (recorder.removeThrow) return Promise.reject(recorder.removeThrow);
      return Promise.resolve();
    },
  } as unknown as KnowledgeService;

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
  void app.register(knowledgeRoutes, { service });
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

describe('knowledgeRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /settings/knowledge', () => {
    it('should list entries', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/knowledge' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(LIST_RESULT);
    });

    it('should accept filter query params', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'GET',
        url: '/settings/knowledge?is_active=true&category=faq&tag=welcome',
      });
      expect(res.statusCode).toBe(200);
    });

    it('should 400 on bad is_active value', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'GET',
        url: '/settings/knowledge?is_active=bogus',
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 401 without tenant', async () => {
      app = buildApp(undefined, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/knowledge' });
      expect(res.statusCode).toBe(401);
    });

    it('should 403 for dept_head', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/knowledge' });
      expect(res.statusCode).toBe(403);
    });

    it('should 403 for staff', async () => {
      app = buildApp(STAFF, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/knowledge' });
      expect(res.statusCode).toBe(403);
    });

    it('should allow super_admin', async () => {
      app = buildApp(SUPER, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/knowledge' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('POST /settings/knowledge', () => {
    it('should return 201 on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/knowledge',
        payload: { title: 'x', content: 'y' },
      });
      expect(res.statusCode).toBe(201);
    });

    it('should 400 on missing content', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/knowledge',
        payload: { title: 'x' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on unknown field (strict)', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/knowledge',
        payload: { title: 'x', content: 'y', hotel_id: 'attacker' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /settings/knowledge/:id', () => {
    it('should return 200 on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/knowledge/${ENTRY_ID}`,
        payload: { title: 'new' },
      });
      expect(res.statusCode).toBe(200);
    });

    it('should 404 when service throws NotFoundError', async () => {
      recorder = { updateThrow: new NotFoundError('KnowledgeEntry', ENTRY_ID) };
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/knowledge/${ENTRY_ID}`,
        payload: { title: 'x' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('should 400 on empty body', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/knowledge/${ENTRY_ID}`,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on non-uuid id', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: '/settings/knowledge/not-a-uuid',
        payload: { title: 'x' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /settings/knowledge/:id', () => {
    it('should return 204 on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'DELETE',
        url: `/settings/knowledge/${ENTRY_ID}`,
      });
      expect(res.statusCode).toBe(204);
    });

    it('should 404 when service throws NotFoundError', async () => {
      recorder = { removeThrow: new NotFoundError('KnowledgeEntry', ENTRY_ID) };
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'DELETE',
        url: `/settings/knowledge/${ENTRY_ID}`,
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
