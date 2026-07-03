// HTTP routes — thin: guard session → RBAC → validate → service → send.
// RBAC: super_admin (implicit) + gm_admin; dept_head + staff → 403.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import { requireRole } from '@plugins/rbac.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import { parseAgentId, parseListAgentsQuery, parseUpdateAgentBody } from './agents.schema.js';
import type { AgentsService } from './agents.service.js';

export interface AgentsRoutesOptions {
  readonly service: AgentsService;
}

const ALLOWED_ROLES = ['gm_admin'] as const;

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

export const agentsRoutes: FastifyPluginCallback<AgentsRoutesOptions> = (fastify, opts, done) => {
  const { service } = opts;

  fastify.get('/settings/agents', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const filters = parseListAgentsQuery(req.query);
    req.log.info(
      { module: 'agents', action: 'list', correlationId: correlationIdOf(req) },
      'list agents',
    );
    const result = await service.list(ctx, filters);
    return reply.send(result);
  });

  fastify.patch('/settings/agents/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseAgentId(req.params);
    const body = parseUpdateAgentBody(req.body);
    req.log.info(
      {
        module: 'agents',
        action: 'update',
        agentId: id,
        correlationId: correlationIdOf(req),
      },
      'update agent',
    );
    const result = await service.update(ctx, id, body);
    return reply.send(result);
  });

  done();
};
