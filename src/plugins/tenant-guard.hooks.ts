/**
 * Tenant-guard runtime wiring — attaches `req.tenant` via a Fastify onRequest hook.
 *
 * Factory pattern (deliberately NOT a Fastify plugin): Fastify 4 encapsulates
 * `addHook` calls made inside `app.register(fn)`, so a hook added in an
 * isolated plugin scope only fires for routes registered as children of that
 * scope. Modules registered as siblings at root would silently miss the hook.
 * By taking the caller's `FastifyInstance` directly, this factory attaches
 * the hook on the caller's scope (typically root), giving global coverage
 * without pulling `fastify-plugin` as a new dependency.
 *
 * Usage in `src/entrypoints/api.ts` (once api.ts leaves stub state):
 *
 *   await app.register(jwtPlugin);
 *   configureTenantGuardHooks(app);   // direct fn call — NOT app.register()
 *   await app.register(ticketsRoutes, { prefix: '/api' });
 *
 * Runtime behavior:
 *   - JWT plugin decodes → `req.user` set → hook derives `req.tenant`.
 *   - No JWT / public route → `req.user` undefined → hook leaves
 *     `req.tenant` undefined; route-level `requireRole(req.tenant, ...)`
 *     surfaces AuthError.
 *   - While JWT plugin is not yet registered (api.ts still stub), `req.user`
 *     is always undefined at runtime and the hook is effectively dormant.
 */

import type { FastifyInstance } from 'fastify';

import { deriveTenantContext } from './tenant-guard.js';

export function configureTenantGuardHooks(app: FastifyInstance): void {
  app.addHook('onRequest', (req, _reply, done) => {
    if (req.user) {
      req.tenant = deriveTenantContext(req.user);
    }
    done();
  });
}
