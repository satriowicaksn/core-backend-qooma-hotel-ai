// HTTP routes — thin: guard session → RBAC → validate → service → send.
// Q-T26-#6 slice-1: ?force=true is parsed for future compatibility but has
// no effect (no dependency check to bypass). Super_admin usage logged for
// audit trail; gm_admin passing force=true logs a warning but proceeds.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError, ValidationError } from '@core/errors/app-errors.js';

import { requireRole } from '@plugins/rbac.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import type { KnownFlag } from './feature-flags.constants.js';
import { parseFlagParam, parsePatchQuery, parseUpdateFlagBody } from './feature-flags.schema.js';
import type { FeatureFlagsService } from './feature-flags.service.js';

export interface FeatureFlagsRoutesOptions {
  readonly service: FeatureFlagsService;
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

export const featureFlagsRoutes: FastifyPluginCallback<FeatureFlagsRoutesOptions> = (
  fastify,
  opts,
  done,
) => {
  const { service } = opts;

  fastify.get('/feature-flags', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    // super_admin bypasses requireRole but has no hotel scope (hotelId is empty
    // in their JWT). Feature flags are hotel-scoped; reject without a valid
    // hotel to avoid a silent empty response or FK violation downstream.
    if (!ctx.hotelId) {
      throw new ValidationError('Feature flags require a hotel context. Use a hotel-scoped session.');
    }
    req.log.info(
      { module: 'feature-flags', action: 'list', correlationId: correlationIdOf(req) },
      'list feature flags',
    );
    const result = await service.list(ctx);
    return reply.send(result);
  });

  fastify.patch('/feature-flags/:flag', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    if (!ctx.hotelId) {
      throw new ValidationError('Feature flags require a hotel context. Use a hotel-scoped session.');
    }
    const flag = parseFlagParam(req.params) as KnownFlag;
    const body = parseUpdateFlagBody(req.body);
    const query = parsePatchQuery(req.query);
    // Q-T26-#6 slice-1 audit trail: log force=true attempts even though
    // no dependency check exists yet. Slice-2 wires the real bypass.
    req.log.info(
      {
        module: 'feature-flags',
        action: 'toggle',
        flag,
        force: query.force === true,
        forceEffective: false, // slice-1 sentinel — nothing to force
        correlationId: correlationIdOf(req),
      },
      'toggle feature flag',
    );
    const result = await service.patch(ctx, flag, body);
    return reply.send(result);
  });

  done();
};
