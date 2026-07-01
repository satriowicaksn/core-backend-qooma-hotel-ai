import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { guestsRoutes } from '../guests.routes.js';
import type { GuestsService } from '../guests.service.js';
import type {
  GuestDetailResponse,
  GuestListResponse,
  GuestMessagesResponse,
  GuestResponse,
  PreferencesResponse,
} from '../guests.types.js';

const GUEST_WIRE = {
  id: 'guest-1',
  name: 'Budi',
  wa_phone: '+6281234567890',
  email: null,
  privacy_mode: 'standard',
  is_vip: false,
  vip_level: null,
  total_stays: 0,
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
};
const LIST_RESULT: GuestListResponse = {
  data: [GUEST_WIRE],
  pageInfo: { page: 1, pageSize: 20, total: 1, hasMore: false },
};
const DETAIL_RESULT: GuestDetailResponse = {
  data: { ...GUEST_WIRE, preferences: [], visits: [] },
};
const GUEST_RESULT: GuestResponse = { data: GUEST_WIRE };
const PREFS_RESULT: PreferencesResponse = { data: [] };
const MESSAGES_RESULT: GuestMessagesResponse = {
  data: [],
  pageInfo: { nextCursor: null, hasMore: false },
};

interface Recorder {
  listCtx?: TenantContext;
  detailId?: string;
  updateId?: string;
  updateBody?: unknown;
  prefId?: string;
  messagesId?: string;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: (ctx: TenantContext): Promise<GuestListResponse> => {
      recorder.listCtx = ctx;
      return Promise.resolve(LIST_RESULT);
    },
    detail: (_ctx: TenantContext, id: string): Promise<GuestDetailResponse> => {
      recorder.detailId = id;
      return Promise.resolve(DETAIL_RESULT);
    },
    update: (_ctx: TenantContext, id: string, body: unknown): Promise<GuestResponse> => {
      recorder.updateId = id;
      recorder.updateBody = body;
      return Promise.resolve(GUEST_RESULT);
    },
    addPreference: (_ctx: TenantContext, id: string): Promise<PreferencesResponse> => {
      recorder.prefId = id;
      return Promise.resolve(PREFS_RESULT);
    },
    messages: (_ctx: TenantContext, id: string): Promise<GuestMessagesResponse> => {
      recorder.messagesId = id;
      return Promise.resolve(MESSAGES_RESULT);
    },
  } as unknown as GuestsService;

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
  void app.register(guestsRoutes, { service });
  return app;
}

const GM: TenantContext = { hotelId: 'hotel-1', isSuperAdmin: false, role: 'gm_admin' };
const ID = '11111111-1111-4111-8111-111111111111';

describe('guestsRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  it('should list guests and pass the tenant context', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/guests?q=budi&page=1' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(LIST_RESULT);
    expect(recorder.listCtx).toEqual(GM);
  });

  it('should 401 when there is no tenant context', async () => {
    app = buildApp(undefined, recorder);
    const res = await app.inject({ method: 'GET', url: '/guests' });
    expect(res.statusCode).toBe(401);
  });

  it('should fetch detail by id', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: `/guests/${ID}` });
    expect(res.statusCode).toBe(200);
    expect(recorder.detailId).toBe(ID);
  });

  it('should 400 on a non-uuid id', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/guests/not-a-uuid' });
    expect(res.statusCode).toBe(400);
  });

  it('should patch a guest and forward the body', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'PATCH',
      url: `/guests/${ID}`,
      payload: { is_vip: true },
    });
    expect(res.statusCode).toBe(200);
    expect(recorder.updateId).toBe(ID);
    expect(recorder.updateBody).toEqual({ is_vip: true });
  });

  it('should upsert a preference', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({
      method: 'POST',
      url: `/guests/${ID}/preferences`,
      payload: { preference_type: 'pillow', preference_value: 'soft' },
    });
    expect(res.statusCode).toBe(200);
    expect(recorder.prefId).toBe(ID);
  });

  it('should route /guests/:id/messages to the messages handler', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: `/guests/${ID}/messages?limit=10` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(MESSAGES_RESULT);
    expect(recorder.messagesId).toBe(ID);
  });
});
