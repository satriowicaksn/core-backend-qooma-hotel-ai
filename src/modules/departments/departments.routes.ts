// HTTP routes — thin: guard session → RBAC → validate → service → send.
// Service injected via plugin options (bootstrap wiring is foundation/DEP-4).
// RBAC: super_admin (implicit) + gm_admin allowed; dept_head + staff → 403.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import { requireRole } from '@plugins/rbac.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import {
  parseCreateDepartmentBody,
  parseDepartmentId,
  parseListDepartmentsQuery,
  parseUpdateDepartmentBody,
} from './departments.schema.js';
import type { DepartmentsService } from './departments.service.js';

export interface DepartmentsRoutesOptions {
  readonly service: DepartmentsService;
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

export const departmentsRoutes: FastifyPluginCallback<DepartmentsRoutesOptions> = (
  fastify,
  opts,
  done,
) => {
  const { service } = opts;

  fastify.get('/settings/departments', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const filters = parseListDepartmentsQuery(req.query);
    req.log.info(
      { module: 'departments', action: 'list', correlationId: correlationIdOf(req) },
      'list departments',
    );
    const result = await service.list(ctx, filters);
    return reply.send(result);
  });

  fastify.post('/settings/departments', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const body = parseCreateDepartmentBody(req.body);
    req.log.info(
      {
        module: 'departments',
        action: 'create',
        code: body.code,
        correlationId: correlationIdOf(req),
      },
      'create department',
    );
    const result = await service.create(ctx, body);
    return reply.code(201).send(result);
  });

  fastify.patch('/settings/departments/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseDepartmentId(req.params);
    const body = parseUpdateDepartmentBody(req.body);
    req.log.info(
      {
        module: 'departments',
        action: 'update',
        departmentId: id,
        correlationId: correlationIdOf(req),
      },
      'update department',
    );
    const result = await service.update(ctx, id, body);
    return reply.send(result);
  });

  fastify.delete('/settings/departments/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseDepartmentId(req.params);
    req.log.info(
      {
        module: 'departments',
        action: 'delete',
        departmentId: id,
        correlationId: correlationIdOf(req),
      },
      'delete department',
    );
    await service.remove(ctx, id);
    return reply.code(204).send();
  });

  done();
};
