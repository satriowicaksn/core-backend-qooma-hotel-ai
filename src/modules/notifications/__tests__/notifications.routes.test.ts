import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { notificationsRoutes } from '../notifications.routes.js';
import type { NotificationsService } from '../notifications.service.js';
import type {
  MarkAllResponse,
  NotificationListResponse,
  NotificationResponse,
  UnreadCountResponse,
} from '../notifications.types.js';

const LIST_RESULT: NotificationListResponse = {
  data: [],
  pageInfo: { nextCursor: null, hasMore: false },
};
const COUNT_RESULT: UnreadCountResponse = { data: { count: 3 } };
const MARK_ALL_RESULT: MarkAllResponse = { data: { updated: 5 } };
const NOTIF_RESULT: NotificationResponse = {
  data: {
    id: 'notif-1',
    hotel_id: 'hotel-1',
    user_id: 'user-1',
    type: 'ticket_created',
    title: 't',
    body: null,
    link: null,
    metadata: {},
    is_read: true,
    read_at: '2026-06-11T08:00:00.000Z',
    created_at: '2026-06-11T07:00:00.000Z',
  },
};

interface Recorder {
  listCtx?: TenantContext;
  countHit?: boolean;
  markAllHit?: boolean;
  readId?: string;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    list: (ctx: TenantContext): Promise<NotificationListResponse> => {
      recorder.listCtx = ctx;
      return Promise.resolve(LIST_RESULT);
    },
    unreadCount: (): Promise<UnreadCountResponse> => {
      recorder.countHit = true;
      return Promise.resolve(COUNT_RESULT);
    },
    markAllRead: (): Promise<MarkAllResponse> => {
      recorder.markAllHit = true;
      return Promise.resolve(MARK_ALL_RESULT);
    },
    markRead: (_ctx: TenantContext, id: string): Promise<NotificationResponse> => {
      recorder.readId = id;
      return Promise.resolve(NOTIF_RESULT);
    },
  } as unknown as NotificationsService;

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
  void app.register(notificationsRoutes, { service });
  return app;
}

const GM: TenantContext = {
  userId: 'user-1',
  hotelId: 'hotel-1',
  isSuperAdmin: false,
  role: 'gm_admin',
};
const ID = '11111111-1111-4111-8111-111111111111';

describe('notificationsRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  it('should list notifications and pass the tenant context', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/notifications?is_read=false' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(LIST_RESULT);
    expect(recorder.listCtx).toEqual(GM);
  });

  it('should route /notifications/unread-count to the count handler (not :id/read)', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'GET', url: '/notifications/unread-count' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(COUNT_RESULT);
    expect(recorder.countHit).toBe(true);
    expect(recorder.readId).toBeUndefined();
  });

  it('should mark-all-read via POST', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'POST', url: '/notifications/mark-all-read' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(MARK_ALL_RESULT);
    expect(recorder.markAllHit).toBe(true);
  });

  it('should mark one read via PATCH and forward the id', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'PATCH', url: `/notifications/${ID}/read` });
    expect(res.statusCode).toBe(200);
    expect(recorder.readId).toBe(ID);
  });

  it('should 400 on a non-uuid id', async () => {
    app = buildApp(GM, recorder);
    const res = await app.inject({ method: 'PATCH', url: '/notifications/not-a-uuid/read' });
    expect(res.statusCode).toBe(400);
    expect(recorder.readId).toBeUndefined();
  });

  it('should 401 without a tenant context', async () => {
    app = buildApp(undefined, recorder);
    const res = await app.inject({ method: 'GET', url: '/notifications' });
    expect(res.statusCode).toBe(401);
  });
});
