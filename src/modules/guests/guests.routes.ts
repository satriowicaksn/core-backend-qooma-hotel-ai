// HTTP routes — thin: guard session → validate → call service → send.
// Service injected via plugin options (bootstrap wiring is foundation/DEP-4).
// `req.tenant` is populated by T03/T04's preHandler; endpoint RBAC (gm_admin-only)
// is also the preHandler's job (N3) — handlers scope data, not roles.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { parseGuestId } from './guests.schema.js';
import type { GuestsService } from './guests.service.js';

export interface GuestsRoutesOptions {
  readonly service: GuestsService;
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

export const guestsRoutes: FastifyPluginCallback<GuestsRoutesOptions> = (fastify, opts, done) => {
  const { service } = opts;

  fastify.get('/guests', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    req.log.info(
      { module: 'guests', action: 'list', correlationId: correlationIdOf(req) },
      'list guests',
    );
    const result = await service.list(ctx, req.query);
    return reply.send(result);
  });

  fastify.get('/guests/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    const id = parseGuestId(req.params);
    req.log.info(
      { module: 'guests', action: 'detail', guestId: id, correlationId: correlationIdOf(req) },
      'get guest detail',
    );
    const result = await service.detail(ctx, id);
    return reply.send(result);
  });

  fastify.patch('/guests/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    const id = parseGuestId(req.params);
    req.log.info(
      { module: 'guests', action: 'update', guestId: id, correlationId: correlationIdOf(req) },
      'update guest',
    );
    const result = await service.update(ctx, id, req.body);
    return reply.send(result);
  });

  fastify.post('/guests/:id/preferences', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    const id = parseGuestId(req.params);
    req.log.info(
      {
        module: 'guests',
        action: 'add_preference',
        guestId: id,
        correlationId: correlationIdOf(req),
      },
      'upsert guest preference',
    );
    const result = await service.addPreference(ctx, id, req.body);
    return reply.send(result);
  });

  done();
};
