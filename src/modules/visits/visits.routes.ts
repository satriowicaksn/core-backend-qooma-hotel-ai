// HTTP routes — thin: guard session → validate → call service → send.
// Service is injected via plugin options (bootstrap wiring is foundation/DEP-2).
// `req.tenant` is populated by T03/T04's preHandler (DEP-1 runtime) — until then
// these routes answer 401 (AuthError), which is the correct pre-auth behavior.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { parseVisitId } from './visits.schema.js';
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

  fastify.patch('/visits/:id/verify-manual', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    const id = parseVisitId(req.params);
    req.log.info(
      {
        module: 'visits',
        action: 'verify-manual',
        visitId: id,
        correlationId: correlationIdOf(req),
      },
      'verify visit manually',
    );
    const result = await service.verifyManual(ctx, id, req.body);
    return reply.send(result);
  });

  done();
};
