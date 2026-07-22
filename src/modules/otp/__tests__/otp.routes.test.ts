import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { OtpCrmService } from '../otp-crm.service.js';
import { otpInternalRoutes } from '../otp.internal.routes.js';
import { otpRoutes } from '../otp.routes.js';
import type { OtpService } from '../otp.service.js';
import type {
  OtpMetricsResponse,
  OtpSettingsResponse,
  ReviewQueueResponse,
  ReviewResponse,
} from '../otp.types.js';

const SECRET = 'internal-secret-0123456789abcdef0123456789abcdef';
const TICKET_ID = '11111111-1111-4111-8111-111111111111';

const SETTINGS: OtpSettingsResponse = {
  data: { otp_enabled: true, otp_grace_minutes: 10, otp_complaint_window: 180 },
};
const QUEUE: ReviewQueueResponse = { data: [], pageInfo: { nextCursor: null, hasMore: false } };
const REVIEW: ReviewResponse = {
  data: {
    id: TICKET_ID,
    review_status: 'reviewed',
    review_outcome: 'wrong_dept',
    reviewed_by: 'GM',
    reviewed_at: '2026-07-22T09:00:00.000Z',
  },
};
const METRICS: OtpMetricsResponse = {
  period: '2026-07',
  team_average: {
    otp_verified_rate: 0,
    otp_skip_rate: 0,
    skip_then_complaint_rate: 0,
    supervisor_confirmed_fault_rate: 0,
  },
  staff: [],
};

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: 'u-1',
    hotelId: 'hotel-1',
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function buildApp(tenant: TenantContext | undefined): FastifyInstance {
  const crmService = {
    reviewQueue: () => Promise.resolve(QUEUE),
    review: () => Promise.resolve(REVIEW),
    getSettings: () => Promise.resolve(SETTINGS),
    putSettings: () => Promise.resolve(SETTINGS),
    metrics: () => Promise.resolve(METRICS),
  } as unknown as OtpCrmService;

  const otpService = {
    resolveTelegram: () => Promise.resolve({ ticketId: TICKET_ID }),
    setTelegramMessage: () => Promise.resolve(),
    ackDelivered: () => Promise.resolve(),
    markDelivered: () => Promise.resolve({ graceDeadline: new Date('2026-07-22T09:10:00.000Z') }),
    verifyCode: () => Promise.resolve({ result: 'wrong_code', attemptsLeft: 2 }),
    skip: () => Promise.resolve(),
    resend: () => Promise.resolve({ otpCode: '42' }),
  } as unknown as OtpService;

  const app = Fastify();
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: err.toJson() });
    }
    return reply.code(500).send({ error: 'internal' });
  });
  app.addHook('preHandler', (req, _reply, done) => {
    req.tenant = tenant;
    done();
  });
  void app.register(otpRoutes, { service: crmService });
  void app.register(otpInternalRoutes, {
    service: otpService,
    internalSecret: SECRET,
    prefix: '/internal',
  });
  return app;
}

describe('otp public routes — RBAC', () => {
  let app: FastifyInstance;
  afterEach(async () => {
    await app.close();
  });

  it('should 401 without a session on every public surface', async () => {
    app = buildApp(undefined);
    for (const [method, url] of [
      ['GET', '/tickets/review-queue'],
      ['PATCH', `/tickets/${TICKET_ID}/review`],
      ['GET', '/settings/otp'],
      ['PUT', '/settings/otp'],
      ['GET', '/analytics/otp-metrics'],
    ] as const) {
      const res = await app.inject({ method, url, payload: method === 'GET' ? undefined : {} });
      expect(res.statusCode).toBe(401);
    }
  });

  it('should serve the review queue to gm_admin and dept_head', async () => {
    app = buildApp(ctx());
    expect((await app.inject({ method: 'GET', url: '/tickets/review-queue' })).statusCode).toBe(
      200,
    );
    await app.close();
    app = buildApp(ctx({ role: 'dept_head', deptId: 'dept-1' }));
    expect((await app.inject({ method: 'GET', url: '/tickets/review-queue' })).statusCode).toBe(
      200,
    );
  });

  it('should 403 staff everywhere and dept_head on settings', async () => {
    app = buildApp(ctx({ role: 'staff' }));
    expect((await app.inject({ method: 'GET', url: '/tickets/review-queue' })).statusCode).toBe(
      403,
    );
    await app.close();
    app = buildApp(ctx({ role: 'dept_head', deptId: 'dept-1' }));
    expect((await app.inject({ method: 'GET', url: '/settings/otp' })).statusCode).toBe(403);
    const put = await app.inject({
      method: 'PUT',
      url: '/settings/otp',
      payload: { otp_enabled: true, otp_grace_minutes: 10, otp_complaint_window: 180 },
    });
    expect(put.statusCode).toBe(403);
  });

  it('should let super_admin pass gm-only settings but demand a hotel scope', async () => {
    app = buildApp(ctx({ isSuperAdmin: true, role: 'super_admin', hotelId: '' }));
    const res = await app.inject({ method: 'GET', url: '/settings/otp' });
    expect(res.statusCode).toBe(400);
  });

  it('should route PATCH review and metrics through the service', async () => {
    app = buildApp(ctx());
    const patch = await app.inject({
      method: 'PATCH',
      url: `/tickets/${TICKET_ID}/review`,
      payload: { outcome: 'wrong_dept' },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toEqual(REVIEW);
    const metrics = await app.inject({ method: 'GET', url: '/analytics/otp-metrics' });
    expect(metrics.statusCode).toBe(200);
    expect(metrics.json()).toEqual(METRICS);
  });
});

describe('otp internal routes — X-Internal-Secret guard', () => {
  let app: FastifyInstance;
  beforeEach(() => {
    app = buildApp(undefined);
  });
  afterEach(async () => {
    await app.close();
  });

  it('should 401 without or with a wrong secret', async () => {
    const noHeader = await app.inject({
      method: 'POST',
      url: `/internal/tickets/${TICKET_ID}/otp/verify`,
      payload: { code: '42' },
    });
    expect(noHeader.statusCode).toBe(401);
    const wrong = await app.inject({
      method: 'POST',
      url: `/internal/tickets/${TICKET_ID}/otp/verify`,
      headers: { 'x-internal-secret': 'nope' },
      payload: { code: '42' },
    });
    expect(wrong.statusCode).toBe(401);
  });

  it('should resolve telegram messages to ticket ids', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/internal/tickets/resolve-telegram',
      headers: { 'x-internal-secret': SECRET },
      payload: { hotel_id: '22222222-2222-4222-8222-222222222222', telegram_message_id: 987 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ticket_id: TICKET_ID });
  });

  it('should return grace_deadline on mark-delivered and result on verify', async () => {
    const mark = await app.inject({
      method: 'POST',
      url: `/internal/tickets/${TICKET_ID}/otp/mark-delivered`,
      headers: { 'x-internal-secret': SECRET },
      payload: {},
    });
    expect(mark.statusCode).toBe(200);
    expect(mark.json()).toEqual({ grace_deadline: '2026-07-22T09:10:00.000Z' });

    const verify = await app.inject({
      method: 'POST',
      url: `/internal/tickets/${TICKET_ID}/otp/verify`,
      headers: { 'x-internal-secret': SECRET },
      payload: { code: '13' },
    });
    expect(verify.statusCode).toBe(200);
    expect(verify.json()).toEqual({ result: 'wrong_code', attempts_left: 2 });
  });

  it('should reject a malformed verify code with 400 before touching the service', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/internal/tickets/${TICKET_ID}/otp/verify`,
      headers: { 'x-internal-secret': SECRET },
      payload: { code: '4' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('should return the code ONLY on the internal resend surface', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/internal/tickets/${TICKET_ID}/otp/resend`,
      headers: { 'x-internal-secret': SECRET },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ otp_code: '42' });
  });

  it('should acknowledge skip with { ok: true } and validate the reason enum', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: `/internal/tickets/${TICKET_ID}/otp/skip`,
      headers: { 'x-internal-secret': SECRET },
      payload: { reason: 'guest_declined' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ ok: true });
    const bad = await app.inject({
      method: 'POST',
      url: `/internal/tickets/${TICKET_ID}/otp/skip`,
      headers: { 'x-internal-secret': SECRET },
      payload: { reason: 'grace_timeout' },
    });
    expect(bad.statusCode).toBe(400);
  });

  it('should never authorize when no secret is configured (fail-closed)', async () => {
    const closedApp = Fastify();
    closedApp.setErrorHandler((err, _req, reply) => {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send({ error: err.toJson() });
      }
      return reply.code(500).send({ error: 'internal' });
    });
    void closedApp.register(otpInternalRoutes, {
      service: {} as OtpService,
      internalSecret: undefined,
      prefix: '/internal',
    });
    const res = await closedApp.inject({
      method: 'POST',
      url: `/internal/tickets/${TICKET_ID}/otp/ack-delivered`,
      headers: { 'x-internal-secret': 'anything' },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
    await closedApp.close();
  });
});
