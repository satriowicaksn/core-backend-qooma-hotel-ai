/**
 * Fastify + @fastify/jwt type augmentation for the tenant-guard chain.
 *
 * - `FastifyRequest.tenant` — populated at runtime by the tenant-guard onRequest
 *   hook (see `tenant-guard.hooks.ts`). Read by handlers to enforce hotel /
 *   department scope via `requireRole` + `assertHotelOwnership` +
 *   `assertDeptOwnership`.
 *
 * - `@fastify/jwt` `FastifyJWT` — augmenting this interface is the canonical
 *   consumer-typing pattern the plugin exposes (docs.fastify.io/... /jwt).
 *   Augmenting `FastifyRequest.user` directly would collide with the plugin's
 *   own `declare module 'fastify'` block (TS error: property 'user' must be
 *   of the same type). Widening `FastifyJWT.payload` / `.user` makes
 *   `req.user` auto-typed as `SessionUser` everywhere without collision.
 *
 * Both blocks are typecheck-only; no runtime dependency is added (the JWT
 * plugin's runtime need only be present when tokens actually need decoding).
 */

// Force @fastify/jwt module resolution so its `declare module 'fastify'`
// augmentation (which adds `FastifyRequest.user`) participates in the type
// graph — required for the `declare module '@fastify/jwt'` block below to
// take effect at `req.user` use-sites. Zero runtime cost (type-only import).
import type {} from '@fastify/jwt';

import type { SessionUser, TenantContext } from './tenant-guard.js';

declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantContext;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: SessionUser;
    user: SessionUser;
  }
}

export {};
