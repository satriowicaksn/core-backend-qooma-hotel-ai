// HTTP routes — thin: guard session → RBAC → validate → service → send.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError, ValidationError } from '@core/errors/app-errors.js';

import { requireRole } from '@plugins/rbac.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import {
  parseCreateEntryBody,
  parseEntryId,
  parseListEntriesQuery,
  parseUpdateEntryBody,
} from './knowledge.schema.js';
import type { KnowledgeService } from './knowledge.service.js';

export interface KnowledgeRoutesOptions {
  readonly service: KnowledgeService;
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

export const knowledgeRoutes: FastifyPluginCallback<KnowledgeRoutesOptions> = (
  fastify,
  opts,
  done,
) => {
  const { service } = opts;

  fastify.get('/settings/knowledge', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const filters = parseListEntriesQuery(req.query);
    req.log.info(
      { module: 'knowledge', action: 'list', correlationId: correlationIdOf(req) },
      'list knowledge',
    );
    const result = await service.list(ctx, filters);
    return reply.send(result);
  });

  fastify.post('/settings/knowledge', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const body = parseCreateEntryBody(req.body);
    req.log.info(
      {
        module: 'knowledge',
        action: 'create',
        questionLen: body.question.length,
        correlationId: correlationIdOf(req),
      },
      'create knowledge entry',
    );
    const result = await service.create(ctx, body);
    return reply.code(201).send(result);
  });

  fastify.post('/settings/knowledge/import', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const upload = await req.file();
    if (!upload) {
      throw new ValidationError('CSV file is required (multipart field "file")');
    }
    const csvText = (await upload.toBuffer()).toString('utf8');
    req.log.info(
      {
        module: 'knowledge',
        action: 'import',
        filename: upload.filename,
        correlationId: correlationIdOf(req),
      },
      'import knowledge csv',
    );
    const result = await service.importCsv(ctx, csvText);
    return reply.send(result);
  });

  fastify.patch('/settings/knowledge/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseEntryId(req.params);
    const body = parseUpdateEntryBody(req.body);
    req.log.info(
      {
        module: 'knowledge',
        action: 'update',
        entryId: id,
        correlationId: correlationIdOf(req),
      },
      'update knowledge entry',
    );
    const result = await service.update(ctx, id, body);
    return reply.send(result);
  });

  fastify.delete('/settings/knowledge/:id', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseEntryId(req.params);
    req.log.info(
      {
        module: 'knowledge',
        action: 'delete',
        entryId: id,
        correlationId: correlationIdOf(req),
      },
      'delete knowledge entry',
    );
    await service.remove(ctx, id);
    return reply.code(204).send();
  });

  done();
};
