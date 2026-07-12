/**
 * Auth preHandler — validates the auth-service access-token cookie and
 * populates `req.tenant` (consumed by every module route via `requireTenant`).
 *
 * Cross-service contract (auth-backend `auth.token-issuer.ts`):
 *   - httpOnly cookie `token` holds an HS256 JWT signed with JWT_ACCESS_SECRET.
 *   - Payload: { sub, sid, role, hotelId: string|null, deptId: string|null }.
 *     `hotelId` is null ONLY for super_admin.
 *
 * ⚠️ This service's JWT_ACCESS_SECRET MUST equal the auth-service's, else every
 *    token fails verification (401). Coordinate the shared secret in env/deploy.
 *
 * @fastify/cookie is not a dependency, so the token is read straight from the
 * Cookie header. Registered on the ROOT instance so the onRequest hook applies
 * to all routes; `/healthz` is exempt.
 */

import jwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';

import { ForbiddenError } from '@core/errors/app-errors.js';

import { deriveTenantContext, type SessionRole, type SessionUser } from './tenant-guard.js';

const ACCESS_COOKIE = 'token';
const PUBLIC_PATHS = new Set<string>(['/healthz']);

interface AccessTokenPayload {
  readonly sub: string;
  readonly sid: string;
  readonly role: SessionRole;
  readonly hotelId: string | null;
  readonly deptId: string | null;
}

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}

export async function registerAuth(fastify: FastifyInstance, secret: string): Promise<void> {
  await fastify.register(jwt, { secret });

  fastify.addHook('onRequest', (req, _reply, done) => {
    const path = req.url.split('?')[0] ?? req.url;
    if (PUBLIC_PATHS.has(path)) return done();

    const token = readCookie(req.headers.cookie, ACCESS_COOKIE);
    if (!token) return done(); // no session → route answers 401 via requireTenant

    let payload: AccessTokenPayload;
    try {
      payload = fastify.jwt.verify<AccessTokenPayload>(token);
    } catch {
      return done(); // invalid / expired → route answers 401
    }

    // Non-super_admin must carry a hotel scope; reject a malformed token early.
    if (payload.role !== 'super_admin' && payload.hotelId === null) {
      return done(new ForbiddenError('Tenant scope violation'));
    }

    const user: SessionUser = {
      userId: payload.sub,
      hotelId: payload.hotelId ?? '',
      role: payload.role,
      ...(payload.deptId ? { deptId: payload.deptId } : {}),
    };
    req.tenant = deriveTenantContext(user);
    return done();
  });
}
