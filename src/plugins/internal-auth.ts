/**
 * Internal RPC auth — shared-secret guard for service-to-service routes
 * (`/internal/*`, ADD-24). Mirrors the integration-backend `X-Internal-Secret`
 * approach: constant-time compare (docs/SECURITY.md — timingSafeEqual, never
 * `===`) over sha256 digests so differing lengths leak nothing.
 *
 * Factory pattern (NOT a Fastify plugin) — same rationale as
 * tenant-guard.hooks.ts: the returned preHandler is attached inside the
 * internal-routes plugin scope so it guards ONLY those routes.
 *
 * No secret configured (INTERNAL_API_SECRET unset) → every internal call is
 * rejected with AuthError; the surface is fail-closed by default.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

import type { FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

export const INTERNAL_SECRET_HEADER = 'x-internal-secret';

function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function assertInternalSecret(
  configuredSecret: string | undefined,
  presented: string | undefined,
): void {
  if (!configuredSecret) {
    throw new AuthError('Internal API not configured');
  }
  if (typeof presented !== 'string' || presented.length === 0) {
    throw new AuthError('Missing internal secret header');
  }
  if (!timingSafeEqual(sha256(configuredSecret), sha256(presented))) {
    throw new AuthError('Invalid internal secret');
  }
}

export function makeInternalAuthPreHandler(
  configuredSecret: string | undefined,
): (req: FastifyRequest) => Promise<void> {
  // eslint-disable-next-line @typescript-eslint/require-await -- Fastify preHandler contract is async
  return async (req: FastifyRequest): Promise<void> => {
    const header = req.headers[INTERNAL_SECRET_HEADER];
    assertInternalSecret(configuredSecret, typeof header === 'string' ? header : undefined);
  };
}
