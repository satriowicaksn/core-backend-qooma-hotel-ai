// HTTP routes — thin: guard session → validate → call service → send.
// Service is injected via plugin options (bootstrap wiring is foundation/DEP-2).
// `req.tenant` is populated by T03/T04's preHandler (DEP-1 runtime) — until then
// these routes answer 401 (AuthError), which is the correct pre-auth behavior.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { parseTicketId } from './tickets.schema.js';
import type { TicketsService } from './tickets.service.js';

export interface TicketsRoutesOptions {
  readonly service: TicketsService;
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

export const ticketsRoutes: FastifyPluginCallback<TicketsRoutesOptions> = (fastify, opts, done) => {
  const { service } = opts;

  fastify.get('/tickets', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    req.log.info(
      { module: 'tickets', action: 'list', correlationId: correlationIdOf(req) },
      'list tickets',
    );
    const result = await service.list(ctx, req.query);
    return reply.send(result);
  });

  fastify.get('/tickets/stats', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    req.log.info(
      { module: 'tickets', action: 'stats', correlationId: correlationIdOf(req) },
      'ticket stats',
    );
    const result = await service.stats(ctx);
    return reply.send(result);
  });

  fastify.get('/tickets/overdue', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    req.log.info(
      { module: 'tickets', action: 'overdue', correlationId: correlationIdOf(req) },
      'ticket overdue list',
    );
    const result = await service.overdue(ctx, req.query);
    return reply.send(result);
  });

  fastify.get('/tickets/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    const id = parseTicketId(req.params);
    req.log.info(
      { module: 'tickets', action: 'detail', ticketId: id, correlationId: correlationIdOf(req) },
      'get ticket detail',
    );
    const result = await service.detail(ctx, id);
    return reply.send(result);
  });

  done();
};
