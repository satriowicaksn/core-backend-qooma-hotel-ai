// HTTP routes — thin: guard session → validate → call service → send.
// Service injected via plugin options (bootstrap wiring is foundation/DEP-4).
// All authenticated users pass (no role gate — N3); routes require req.tenant (401).

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { parseNotificationId } from './notifications.schema.js';
import type { NotificationsService } from './notifications.service.js';

export interface NotificationsRoutesOptions {
  readonly service: NotificationsService;
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

export const notificationsRoutes: FastifyPluginCallback<NotificationsRoutesOptions> = (
  fastify,
  opts,
  done,
) => {
  const { service } = opts;

  fastify.get('/notifications', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    req.log.info(
      { module: 'notifications', action: 'list', correlationId: correlationIdOf(req) },
      'list notifications',
    );
    const result = await service.list(ctx, req.query);
    return reply.send(result);
  });

  fastify.get('/notifications/unread-count', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    req.log.info(
      { module: 'notifications', action: 'unread-count', correlationId: correlationIdOf(req) },
      'unread notification count',
    );
    const result = await service.unreadCount(ctx);
    return reply.send(result);
  });

  fastify.post('/notifications/mark-all-read', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    req.log.info(
      { module: 'notifications', action: 'mark-all-read', correlationId: correlationIdOf(req) },
      'mark all notifications read',
    );
    const result = await service.markAllRead(ctx);
    return reply.send(result);
  });

  fastify.patch('/notifications/:id/read', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    const id = parseNotificationId(req.params);
    req.log.info(
      {
        module: 'notifications',
        action: 'read',
        notificationId: id,
        correlationId: correlationIdOf(req),
      },
      'mark notification read',
    );
    const result = await service.markRead(ctx, id);
    return reply.send(result);
  });

  done();
};
