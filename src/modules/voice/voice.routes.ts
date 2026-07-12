// HTTP routes — thin: guard session → RBAC → validate → service → send.
// PM ACK tightening #2: winston observability at BOTH PUT + POST /test.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import { requireRole } from '@plugins/rbac.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import { parseUpsertVoiceBody, parseVoiceTestBody } from './voice.schema.js';
import type { VoiceService } from './voice.service.js';

export interface VoiceRoutesOptions {
  readonly service: VoiceService;
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

export const voiceRoutes: FastifyPluginCallback<VoiceRoutesOptions> = (fastify, opts, done) => {
  const { service } = opts;

  fastify.get('/settings/voice', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    req.log.info(
      { module: 'voice', action: 'get', correlationId: correlationIdOf(req) },
      'get voice config',
    );
    const result = await service.get(ctx);
    return reply.send(result);
  });

  fastify.put('/settings/voice', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const body = parseUpsertVoiceBody(req.body);
    req.log.info(
      {
        module: 'voice',
        action: 'upsert',
        pbxTypeSet: body.pbx_type !== undefined && body.pbx_type !== null,
        isActiveSet: body.is_active === true,
        correlationId: correlationIdOf(req),
      },
      'upsert voice config',
    );
    const result = await service.upsert(ctx, body);
    return reply.send(result);
  });

  fastify.post('/settings/voice/test', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const body = parseVoiceTestBody(req.body);
    req.log.info(
      { module: 'voice', action: 'test', correlationId: correlationIdOf(req) },
      'test voice connection',
    );
    const result = await service.test(ctx, body);
    return reply.send(result);
  });

  done();
};
