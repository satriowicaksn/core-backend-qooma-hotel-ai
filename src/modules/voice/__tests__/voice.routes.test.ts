import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError, BusinessRuleError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { voiceRoutes } from '../voice.routes.js';
import type { VoiceService } from '../voice.service.js';
import type { VoiceConfigResponse, VoiceTestResponse } from '../voice.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const STUB_NOTE = 'stub — PBX integration is wave 2a per ADD-23.7';

const CONFIG_RESULT: VoiceConfigResponse = {
  data: {
    hotel_id: HOTEL_A,
    pbx_type: 'sip',
    pbx_host: 'sip.example.com',
    sip_username: 'user',
    sip_password: 'pass',
    sip_port: 5060,
    sip_codec: 'opus',
    did_number: '+15551234',
    config: {},
    is_active: true,
    updated_at: '2026-07-03T00:00:00.000Z',
  },
};

const TEST_RESULT: VoiceTestResponse = {
  data: { success: true, message: STUB_NOTE, note: STUB_NOTE },
};

const VALID_TEST_BODY = {
  pbx_host: 'sip.example.com',
  sip_username: 'user',
  sip_password: 'pass',
  sip_port: 5060,
};

interface Recorder {
  getCtx?: TenantContext;
  upsertBody?: unknown;
  testCtx?: TenantContext;
  testBody?: unknown;
  testThrow?: Error;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    get: (ctx: TenantContext): Promise<VoiceConfigResponse> => {
      recorder.getCtx = ctx;
      return Promise.resolve(CONFIG_RESULT);
    },
    upsert: (_ctx: TenantContext, body: unknown): Promise<VoiceConfigResponse> => {
      recorder.upsertBody = body;
      return Promise.resolve(CONFIG_RESULT);
    },
    test: (ctx: TenantContext, body: unknown): Promise<VoiceTestResponse> => {
      recorder.testCtx = ctx;
      recorder.testBody = body;
      if (recorder.testThrow) {
        return Promise.reject(recorder.testThrow);
      }
      return Promise.resolve(TEST_RESULT);
    },
  } as unknown as VoiceService;

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
  void app.register(voiceRoutes, { service });
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

describe('voiceRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /settings/voice', () => {
    it('should return voice config with tenant context', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/voice' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(CONFIG_RESULT);
      expect(recorder.getCtx).toEqual(GM);
    });

    it('should 401 without tenant', async () => {
      app = buildApp(undefined, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/voice' });
      expect(res.statusCode).toBe(401);
    });

    it('should 403 for dept_head', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/voice' });
      expect(res.statusCode).toBe(403);
    });

    it('should 403 for staff', async () => {
      app = buildApp(STAFF, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/voice' });
      expect(res.statusCode).toBe(403);
    });

    it('should allow super_admin', async () => {
      app = buildApp(SUPER, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/voice' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('PUT /settings/voice', () => {
    it('should upsert and return 200', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PUT',
        url: '/settings/voice',
        payload: { pbx_type: 'twilio', is_active: true },
      });
      expect(res.statusCode).toBe(200);
      expect(recorder.upsertBody).toEqual({ pbx_type: 'twilio', is_active: true });
    });

    it('should 400 on empty body', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'PUT', url: '/settings/voice', payload: {} });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on hotel_id in body (strict)', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PUT',
        url: '/settings/voice',
        payload: { pbx_type: 'sip', hotel_id: 'attacker' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on pbx_type over 40 chars', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'PUT',
        url: '/settings/voice',
        payload: { pbx_type: 'x'.repeat(41) },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 403 for dept_head', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({
        method: 'PUT',
        url: '/settings/voice',
        payload: { pbx_type: 'sip' },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /settings/voice/test', () => {
    it('should parse the body and return 200 stub success on happy path', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/voice/test',
        payload: VALID_TEST_BODY,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(TEST_RESULT);
      expect(recorder.testBody).toEqual(VALID_TEST_BODY);
    });

    it('should 400 on a body missing required fields', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/voice/test',
        payload: { pbx_host: 'sip.example.com' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 422 VOICE_NOT_CONFIGURED when service throws', async () => {
      recorder = {
        testThrow: new BusinessRuleError('Voice PBX not configured', {
          rule: 'VOICE_NOT_CONFIGURED',
        }),
      };
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/voice/test',
        payload: VALID_TEST_BODY,
      });
      expect(res.statusCode).toBe(422);
      const body: { code: string; details: { rule: string } } = res.json();
      expect(body.code).toBe('BUSINESS_RULE');
      expect(body.details.rule).toBe('VOICE_NOT_CONFIGURED');
    });

    it('should 403 for dept_head', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/settings/voice/test',
        payload: VALID_TEST_BODY,
      });
      expect(res.statusCode).toBe(403);
    });
  });
});
