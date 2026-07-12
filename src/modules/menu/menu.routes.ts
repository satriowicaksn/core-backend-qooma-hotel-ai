// HTTP routes — thin: guard session → RBAC → validate → service → send.
// RBAC: super_admin (implicit) + gm_admin allowed; dept_head + staff → 403.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError, ValidationError } from '@core/errors/app-errors.js';

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
import type { MenuImageInput } from './menu.types.js';

// Collected text fields + the single `image` file part (if any) from a
// multipart request. Non-`image` file parts are drained so the stream fully
// consumes without stalling the request.
interface MultipartForm {
  readonly fields: Record<string, string | undefined>;
  readonly image?: MenuImageInput;
}

async function readMultipartForm(req: FastifyRequest): Promise<MultipartForm> {
  const fields: Record<string, string | undefined> = {};
  let image: MenuImageInput | undefined;

  for await (const part of req.parts()) {
    if (part.type === 'file') {
      if (part.fieldname === 'image') {
        image = {
          buffer: await part.toBuffer(),
          ...(part.mimetype ? { contentType: part.mimetype } : {}),
          ...(part.filename ? { filename: part.filename } : {}),
        };
      } else {
        // Drain unexpected file parts so the multipart stream completes.
        await part.toBuffer();
      }
    } else if (typeof part.value === 'string') {
      fields[part.fieldname] = part.value;
    }
  }

  return image === undefined ? { fields } : { fields, image };
}

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
    req.log.info(
      {
        module: 'menu',
        action: 'create_item',
        multipart: req.isMultipart(),
        correlationId: correlationIdOf(req),
      },
      'create menu item',
    );
    if (req.isMultipart()) {
      const form = await readMultipartForm(req);
      const result = await service.createItemFromForm(ctx, form.fields, form.image);
      return reply.code(201).send(result);
    }
    const body = parseCreateItemBody(req.body);
    const result = await service.createItem(ctx, body);
    return reply.code(201).send(result);
  });

  fastify.patch('/settings/menu/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseItemId(req.params);
    req.log.info(
      {
        module: 'menu',
        action: 'update_item',
        itemId: id,
        multipart: req.isMultipart(),
        correlationId: correlationIdOf(req),
      },
      'update menu item',
    );
    if (req.isMultipart()) {
      const form = await readMultipartForm(req);
      const result = await service.updateItemFromForm(ctx, id, form.fields, form.image);
      return reply.send(result);
    }
    const body = parseUpdateItemBody(req.body);
    const result = await service.updateItem(ctx, id, body);
    return reply.send(result);
  });

  fastify.post('/settings/menu/import-csv', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const file = await req.file();
    if (!file) {
      throw new ValidationError('CSV file is required', { field: 'file' });
    }
    const csvText = (await file.toBuffer()).toString('utf8');
    req.log.info(
      { module: 'menu', action: 'import_csv', correlationId: correlationIdOf(req) },
      'import menu csv',
    );
    const result = await service.importCsv(ctx, csvText);
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
        itemCount: body.ids.length,
        correlationId: correlationIdOf(req),
      },
      'bulk update menu item availability',
    );
    const result = await service.bulkAvailability(ctx, body);
    return reply.send(result);
  });

  done();
};
