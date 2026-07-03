import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError, BusinessRuleError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { agentsRoutes } from '../agents.routes.js';
import type { AgentsService } from '../agents.service.js';
import type { AgentListResponse, AgentResponse } from '../agents.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AGENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const LIST_RESULT: AgentListResponse = { data: [] };
const WIRE: AgentResponse = {
  data: {
    id: AGENT_ID,
    hotel_id: HOTEL_A,
    agent_type: 'concierge',
    name: 'Concierge Agent',
    is_active: true,
    capacity: 3,
    config: {},
    created_at: '2026-06-11T07:00:00.000Z',
    updated_at: '2026-06-11T07:00:00.000Z',
  },
};

interface Recorder {
  listCtx?: TenantContext;
  updateId?: string;
  updateBody?: unknown;
  updateThrow?: Error;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: (ctx: TenantContext): Promise<AgentListResponse> => {
      recorder.listCtx = ctx;
      return Promise.resolve(LIST_RESULT);
    },
    update: (_ctx: TenantContext, id: string, body: unknown): Promise<AgentResponse> => {
      recorder.updateId = id;
      recorder.updateBody = body;
      if (recorder.updateThrow) {
        return Promise.reject(recorder.updateThrow);
      }
      return Promise.resolve(WIRE);
    },
  } as unknown as AgentsService;

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
  void app.register(agentsRoutes, { service });
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

describe('agentsRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /settings/agents', () => {
    it('should list agents with tenant context', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/agents' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(LIST_RESULT);
      expect(recorder.listCtx).toEqual(GM);
    });

    it('should accept is_active query filter', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/agents?is_active=false' });
      expect(res.statusCode).toBe(200);
    });

    it('should 401 without tenant', async () => {
      app = buildApp(undefined, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/agents' });
      expect(res.statusCode).toBe(401);
    });

    it('should 403 for dept_head', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/agents' });
      expect(res.statusCode).toBe(403);
    });

    it('should 403 for staff', async () => {
      app = buildApp(STAFF, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/agents' });
      expect(res.statusCode).toBe(403);
    });

    it('should allow super_admin', async () => {
      app = buildApp(SUPER, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/agents' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('PATCH /settings/agents/:id', () => {
    it('should update and return 200', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/agents/${AGENT_ID}`,
        payload: { is_active: false },
      });
      expect(res.statusCode).toBe(200);
      expect(recorder.updateId).toBe(AGENT_ID);
      expect(recorder.updateBody).toEqual({ is_active: false });
    });

    it('should 400 on non-uuid id', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: '/settings/agents/not-a-uuid',
        payload: { is_active: false },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on empty body', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/agents/${AGENT_ID}`,
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on immutable field (agent_type)', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/agents/${AGENT_ID}`,
        payload: { is_active: true, agent_type: 'butler' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 422 on MIN_AGENTS_VIOLATION from service', async () => {
      recorder = {
        updateThrow: new BusinessRuleError('Minimum 3 active agents required', {
          rule: 'MIN_AGENTS_VIOLATION',
          activeAfter: 2,
          minRequired: 3,
        }),
      };
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/agents/${AGENT_ID}`,
        payload: { is_active: false },
      });
      expect(res.statusCode).toBe(422);
      const body: { code: string; details: { rule: string } } = res.json();
      expect(body.code).toBe('BUSINESS_RULE');
      expect(body.details.rule).toBe('MIN_AGENTS_VIOLATION');
    });

    it('should 403 for dept_head', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({
        method: 'PATCH',
        url: `/settings/agents/${AGENT_ID}`,
        payload: { is_active: false },
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
