// HTTP routes — thin: guard session → RBAC → validate → service → send.
// RBAC: super_admin (implicit) + gm_admin allowed; dept_head + staff → 403.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import { requireRole } from '@plugins/rbac.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import {
  parseBulkAvailabilityBody,
  parseCategoryId,
  parseCreateCategoryBody,
  parseCreateItemBody,
  parseItemId,
  parseListMenuQuery,
  parseUpdateCategoryBody,
  parseUpdateItemBody,
} from './menu.schema.js';
import type { MenuService } from './menu.service.js';

export interface MenuRoutesOptions {
  readonly service: MenuService;
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

export const menuRoutes: FastifyPluginCallback<MenuRoutesOptions> = (fastify, opts, done) => {
  const { service } = opts;

  fastify.get('/settings/menu', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const filters = parseListMenuQuery(req.query);
    req.log.info(
      { module: 'menu', action: 'list', correlationId: correlationIdOf(req) },
      'list menu',
    );
    const result = await service.list(ctx, filters);
    return reply.send(result);
  });

  fastify.post('/settings/menu', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const body = parseCreateItemBody(req.body);
    req.log.info(
      {
        module: 'menu',
        action: 'create_item',
        categoryId: body.category_id,
        correlationId: correlationIdOf(req),
      },
      'create menu item',
    );
    const result = await service.createItem(ctx, body);
    return reply.code(201).send(result);
  });

  fastify.patch('/settings/menu/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseItemId(req.params);
    const body = parseUpdateItemBody(req.body);
    req.log.info(
      {
        module: 'menu',
        action: 'update_item',
        itemId: id,
        correlationId: correlationIdOf(req),
      },
      'update menu item',
    );
    const result = await service.updateItem(ctx, id, body);
    return reply.send(result);
  });

  fastify.delete('/settings/menu/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseItemId(req.params);
    req.log.info(
      {
        module: 'menu',
        action: 'delete_item',
        itemId: id,
        correlationId: correlationIdOf(req),
      },
      'delete menu item',
    );
    await service.removeItem(ctx, id);
    return reply.code(204).send();
  });

  fastify.post('/settings/menu/categories', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const body = parseCreateCategoryBody(req.body);
    req.log.info(
      {
        module: 'menu',
        action: 'create_category',
        name: body.name,
        correlationId: correlationIdOf(req),
      },
      'create menu category',
    );
    const result = await service.createCategory(ctx, body);
    return reply.code(201).send(result);
  });

  fastify.patch('/settings/menu/categories/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseCategoryId(req.params);
    const body = parseUpdateCategoryBody(req.body);
    req.log.info(
      {
        module: 'menu',
        action: 'update_category',
        categoryId: id,
        correlationId: correlationIdOf(req),
      },
      'update menu category',
    );
    const result = await service.updateCategory(ctx, id, body);
    return reply.send(result);
  });

  fastify.delete('/settings/menu/categories/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseCategoryId(req.params);
    req.log.info(
      {
        module: 'menu',
        action: 'delete_category',
        categoryId: id,
        correlationId: correlationIdOf(req),
      },
      'delete menu category',
    );
    await service.removeCategory(ctx, id);
    return reply.code(204).send();
  });

  fastify.post('/settings/menu/bulk-availability', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const body = parseBulkAvailabilityBody(req.body);
    // itemCount only per PM ACK — do not log the full array (payload size +
    // audit signal-to-noise).
    req.log.info(
      {
        module: 'menu',
        action: 'bulk-availability',
        itemCount: body.item_ids.length,
        correlationId: correlationIdOf(req),
      },
      'bulk update menu item availability',
    );
    const result = await service.bulkAvailability(ctx, body);
    return reply.send(result);
  });

  done();
};
