// HTTP routes — thin: guard session → RBAC → validate → service → send.
// Service injected via plugin options (bootstrap wiring is foundation/DEP-4).
// RBAC: super_admin (implicit) + gm_admin allowed; dept_head + staff → 403.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import { requireRole } from '@plugins/rbac.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import {
  parseCreateWaTemplateBody,
  parseListWaTemplatesQuery,
  parseUpdateWaTemplateBody,
  parseWaTemplateId,
} from './wa-templates.schema.js';
import type { WaTemplatesService } from './wa-templates.service.js';

export interface WaTemplatesRoutesOptions {
  readonly service: WaTemplatesService;
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

export const waTemplatesRoutes: FastifyPluginCallback<WaTemplatesRoutesOptions> = (
  fastify,
  opts,
  done,
) => {
  const { service } = opts;

  fastify.get('/wa-templates', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const filters = parseListWaTemplatesQuery(req.query);
    req.log.info(
      { module: 'wa-templates', action: 'list', correlationId: correlationIdOf(req) },
      'list wa templates',
    );
    const result = await service.list(ctx, filters);
    return reply.send(result);
  });

  fastify.post('/wa-templates', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const body = parseCreateWaTemplateBody(req.body);
    req.log.info(
      {
        module: 'wa-templates',
        action: 'create',
        name: body.name,
        correlationId: correlationIdOf(req),
      },
      'create wa template',
    );
    const result = await service.create(ctx, body);
    return reply.code(201).send(result);
  });

  fastify.patch('/wa-templates/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseWaTemplateId(req.params);
    const body = parseUpdateWaTemplateBody(req.body);
    req.log.info(
      {
        module: 'wa-templates',
        action: 'update',
        templateId: id,
        correlationId: correlationIdOf(req),
      },
      'update wa template',
    );
    const result = await service.update(ctx, id, body);
    return reply.send(result);
  });

  fastify.delete('/wa-templates/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseWaTemplateId(req.params);
    req.log.info(
      {
        module: 'wa-templates',
        action: 'delete',
        templateId: id,
        correlationId: correlationIdOf(req),
      },
      'delete wa template',
    );
    const result = await service.remove(ctx, id);
    // pending → hard delete (204); approved/rejected → archive (200 w/ row).
    if (result === null) {
      return reply.code(204).send();
    }
    return reply.send(result);
  });

  fastify.post('/wa-templates/:id/resubmit', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseWaTemplateId(req.params);
    req.log.info(
      {
        module: 'wa-templates',
        action: 'resubmit',
        templateId: id,
        correlationId: correlationIdOf(req),
      },
      'resubmit wa template',
    );
    const result = await service.resubmit(ctx, id);
    return reply.send(result);
  });

  done();
};
