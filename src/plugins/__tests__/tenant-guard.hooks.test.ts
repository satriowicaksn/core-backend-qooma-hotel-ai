import { describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { configureTenantGuardHooks } from '../tenant-guard.hooks.js';
import type { SessionUser } from '../tenant-guard.js';

/**
 * Build a minimal Fastify instance with a fixture-injection hook chained
 * before the tenant-guard hook. The fixture-injection hook simulates what the
 * JWT plugin would do at runtime (populate `req.user` from a decoded token).
 * Fastify's onRequest hooks fire FIFO by registration order, so:
 *   1. fixture-hook sets `req.user`
 *   2. tenant-guard hook reads `req.user`, derives `req.tenant`
 *   3. route handler observes `req.tenant`
 */
const buildApp = async (fixtureUser?: SessionUser): Promise<FastifyInstance> => {
  const app = Fastify({ logger: false });

  app.addHook('onRequest', (req, _reply, done) => {
    if (fixtureUser !== undefined) {
      req.user = fixtureUser;
    }
    done();
  });

  configureTenantGuardHooks(app);

  app.get('/_probe', (req) => ({
    tenant: req.tenant ?? null,
  }));

  await app.ready();
  return app;
};

describe('configureTenantGuardHooks', () => {
  it('should populate req.tenant when req.user is present', async () => {
    const user: SessionUser = { userId: 'u-1', hotelId: 'h-1', role: 'gm_admin' };
    const app = await buildApp(user);

    const res = await app.inject({ method: 'GET', url: '/_probe' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      tenant: { hotelId: 'h-1', isSuperAdmin: false, role: 'gm_admin' },
    });

    await app.close();
  });

  it('should leave req.tenant undefined when req.user is absent', async () => {
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/_probe' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ tenant: null });

    await app.close();
  });

  it('should propagate deptId to req.tenant when req.user has deptId', async () => {
    const user: SessionUser = {
      userId: 'u-2',
      hotelId: 'h-1',
      role: 'dept_head',
      deptId: 'd-1',
    };
    const app = await buildApp(user);

    const res = await app.inject({ method: 'GET', url: '/_probe' });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ tenant: { deptId: string; role: string } }>();
    expect(body.tenant.deptId).toBe('d-1');
    expect(body.tenant.role).toBe('dept_head');

    await app.close();
  });
});
