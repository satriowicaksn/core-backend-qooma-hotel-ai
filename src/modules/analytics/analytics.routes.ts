// HTTP routes — thin: guard session → RBAC → validate → service → send.
// Spec §6:800 lists dept_head with "own-dept slice" — slice-1 permits access
// without dept filter (Q-T30-#3 lean A; slice-2 refines post-PO).

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import { requireRole } from '@plugins/rbac.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import { parseRangeQuery } from './analytics.schema.js';
import type { AnalyticsService } from './analytics.service.js';

export interface AnalyticsRoutesOptions {
  readonly service: AnalyticsService;
}

const ALLOWED_ROLES = ['gm_admin', 'dept_head'] as const;

function requireTenant(tenant: TenantContext | undefined): TenantContext {
  if (!tenant) {
    throw new AuthError('No authenticated session');
  }
  return tenant;
}

function correlationIdOf(req: FastifyRequest): string {
  const header = req.headers['x-correlation-id'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }
  return req.id;
}

export const analyticsRoutes: FastifyPluginCallback<AnalyticsRoutesOptions> = (
  fastify,
  opts,
  done,
) => {
  const { service } = opts;

  fastify.get('/analytics/overview', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const query = parseRangeQuery(req.query);
    req.log.info(
      { module: 'analytics', action: 'overview', correlationId: correlationIdOf(req) },
      'analytics overview',
    );
    const result = await service.overview(ctx, query);
    return reply.send(result);
  });

  fastify.get('/analytics/tickets', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const query = parseRangeQuery(req.query);
    req.log.info(
      { module: 'analytics', action: 'tickets', correlationId: correlationIdOf(req) },
      'analytics tickets time-series',
    );
    const result = await service.tickets(ctx, query);
    return reply.send(result);
  });

  fastify.get('/analytics/high-alert', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const query = parseRangeQuery(req.query);
    req.log.info(
      { module: 'analytics', action: 'high-alert', correlationId: correlationIdOf(req) },
      'analytics high-alert',
    );
    const result = await service.highAlert(ctx, query);
    return reply.send(result);
  });

  done();
};
