// HTTP routes — thin: guard session → RBAC → validate → service → send.
// Review queue + review verdict: gm_admin all / dept_head own-dept (forced in
// service scope) / super_admin bypass. Settings: gm_admin only (dept_head →
// 403 via requireRole). otp_code NEVER appears on any of these wires.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError, ValidationError } from '@core/errors/app-errors.js';

import { requireRole } from '@plugins/rbac.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import type { OtpCrmService } from './otp-crm.service.js';
import { parseTicketIdParam } from './otp.schema.js';

export interface OtpRoutesOptions {
  readonly service: OtpCrmService;
}

const REVIEW_ROLES = ['gm_admin', 'dept_head'] as const;
const SETTINGS_ROLES = ['gm_admin'] as const;
const METRICS_ROLES = ['gm_admin', 'dept_head'] as const;

function requireTenant(tenant: TenantContext | undefined): TenantContext {
  if (!tenant) {
    throw new AuthError('No authenticated session');
  }
  return tenant;
}

function requireHotelScope(ctx: TenantContext): void {
  // super_admin bypasses requireRole but has no hotel scope in its JWT;
  // settings are hotel-scoped (feature-flags precedent).
  if (!ctx.hotelId) {
    throw new ValidationError('OTP settings require a hotel context. Use a hotel-scoped session.');
  }
}

function correlationIdOf(req: FastifyRequest): string {
  const header = req.headers['x-correlation-id'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }
  return req.id;
}

export const otpRoutes: FastifyPluginCallback<OtpRoutesOptions> = (fastify, opts, done) => {
  const { service } = opts;

  fastify.get('/tickets/review-queue', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, REVIEW_ROLES);
    req.log.info(
      { module: 'otp', action: 'review_queue', correlationId: correlationIdOf(req) },
      'list otp review queue',
    );
    const result = await service.reviewQueue(ctx, req.query);
    return reply.send(result);
  });

  fastify.patch('/tickets/:id/review', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, REVIEW_ROLES);
    const id = parseTicketIdParam(req.params);
    req.log.info(
      { module: 'otp', action: 'review', ticketId: id, correlationId: correlationIdOf(req) },
      'review otp-skipped ticket',
    );
    const result = await service.review(ctx, id, req.body);
    return reply.send(result);
  });

  fastify.get('/settings/otp', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, SETTINGS_ROLES);
    requireHotelScope(ctx);
    req.log.info(
      { module: 'otp', action: 'settings_get', correlationId: correlationIdOf(req) },
      'get otp settings',
    );
    const result = await service.getSettings(ctx);
    return reply.send(result);
  });

  fastify.put('/settings/otp', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, SETTINGS_ROLES);
    requireHotelScope(ctx);
    req.log.info(
      { module: 'otp', action: 'settings_put', correlationId: correlationIdOf(req) },
      'upsert otp settings',
    );
    const result = await service.putSettings(ctx, req.body);
    return reply.send(result);
  });

  fastify.get('/analytics/otp-metrics', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, METRICS_ROLES);
    req.log.info(
      { module: 'otp', action: 'metrics', correlationId: correlationIdOf(req) },
      'otp metrics',
    );
    const result = await service.metrics(ctx, req.query);
    return reply.send(result);
  });

  done();
};
