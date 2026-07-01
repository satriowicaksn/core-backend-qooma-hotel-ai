/**
 * Fastify type augmentation for `request.tenant`.
 *
 * The preHandler hook that attaches `request.tenant` will be added after the
 * JWT auth plugin lands (T04+). At that point, JWT decodes `request.user`,
 * and tenant-guard hook computes `request.tenant = deriveTenantContext(user)`.
 *
 * We declare the field here so downstream handlers can `req.tenant?.hotelId`
 * with proper typing even before the runtime wiring.
 */

import type { TenantContext } from './tenant-guard.js';

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantContext;
  }
}

export {};
