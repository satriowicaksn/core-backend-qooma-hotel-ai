// HTTP routes — thin: guard session → validate → call service → send.
// Service is injected via plugin options (bootstrap wiring is foundation/DEP-2).
// `req.tenant` is populated by T03/T04's preHandler (DEP-1 runtime) — until then
// these routes answer 401 (AuthError), which is the correct pre-auth behavior.
//
// PATCH /visits/:id/verify-manual is intentionally not registered yet — blocked on
// GAP T16-#4 (no 422 BusinessRuleError class). Added once PM rules on it.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { VisitsService } from './visits.service.js';

export interface VisitsRoutesOptions {
  readonly service: VisitsService;
}

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

export const visitsRoutes: FastifyPluginCallback<VisitsRoutesOptions> = (fastify, opts, done) => {
  const { service } = opts;

  fastify.get('/visits', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    req.log.info(
      { module: 'visits', action: 'list', correlationId: correlationIdOf(req) },
      'list visits',
    );
    const result = await service.list(ctx, req.query);
    return reply.send(result);
  });

  done();
};
