/**
 * Tenant guard — pure functions for multi-tenant + dept-scope enforcement.
 *
 * Not yet a Fastify plugin (api.ts entrypoint is still a stub). These functions
 * will be wired as a preHandler hook after the JWT auth plugin lands (T04+).
 *
 * Spec: docs/spec/02-hotel-core.md §6 (RBAC & tenant guard summary), §7
 * (cross-tenant enumeration masked as 404, not 403).
 */

import { AuthError, NotFoundError } from '@core/errors/app-errors.js';

export type SessionRole = 'gm_admin' | 'dept_head' | 'super_admin' | 'staff';

export interface SessionUser {
  userId: string;
  hotelId: string;
  role: SessionRole;
  deptId?: string;
}

export interface TenantContext {
  hotelId: string;
  isSuperAdmin: boolean;
  role: SessionRole;
  deptId?: string;
}

/**
 * Derive a TenantContext from a decoded session user.
 * Throws AuthError if no session is attached to the request.
 */
export function deriveTenantContext(user: SessionUser | undefined): TenantContext {
  if (!user) {
    throw new AuthError('No session on request');
  }
  const ctx: TenantContext = {
    hotelId: user.hotelId,
    isSuperAdmin: user.role === 'super_admin',
    role: user.role,
  };
  if (user.deptId !== undefined) {
    ctx.deptId = user.deptId;
  }
  return ctx;
}

/**
 * Enforce that the current session may access a resource belonging to
 * `resourceHotelId`. Super-admin bypasses.
 *
 * On cross-tenant attempt: throws NotFoundError (spec §7 — mask 403 as 404 to
 * prevent enumeration of other hotels' resources).
 */
export function assertHotelOwnership(
  tenant: TenantContext | undefined,
  resourceHotelId: string,
  resourceName: string = 'Resource',
): void {
  if (!tenant) {
    throw new AuthError('No tenant context');
  }
  if (tenant.isSuperAdmin) return;
  if (tenant.hotelId !== resourceHotelId) {
    throw new NotFoundError(resourceName);
  }
}

/**
 * Enforce dept-scope for `dept_head` role. `gm_admin` and `super_admin` bypass.
 *
 * On cross-dept attempt by dept_head: throws NotFoundError (same enumeration
 * mask rule as `assertHotelOwnership`).
 */
export function assertDeptOwnership(
  tenant: TenantContext | undefined,
  resourceDeptId: string,
  resourceName: string = 'Resource',
): void {
  if (!tenant) {
    throw new AuthError('No tenant context');
  }
  if (tenant.isSuperAdmin || tenant.role === 'gm_admin') return;
  if (tenant.role === 'dept_head' && tenant.deptId === resourceDeptId) return;
  throw new NotFoundError(resourceName);
}
