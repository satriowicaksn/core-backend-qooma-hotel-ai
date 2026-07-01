/**
 * RBAC guard — pure function for role enforcement.
 *
 * Composes with tenant-guard chain:
 *   deriveTenantContext(user) → requireRole(tenant, [...])
 *     → assertHotelOwnership(tenant, resourceHotelId)
 *     → assertDeptOwnership(tenant, resourceDeptId)
 *
 * Spec: docs/spec/02-hotel-core.md §6 (per-endpoint RBAC matrix — staff NEVER;
 * super_admin implicit all-access; gm_admin full CRM; dept_head subset).
 */

import { AuthError, ForbiddenError } from '@core/errors/app-errors.js';

import type { SessionRole, TenantContext } from './tenant-guard.js';

/**
 * Enforce that the current session's role is in `allowed`.
 *
 * Check order:
 *   1. No tenant context             → AuthError (401)
 *   2. `staff` role                  → ForbiddenError (403) — hard-reject
 *      per spec §6 (staff NEVER hits CRM endpoints; Telegram-only).
 *      Defense-in-depth against callers that accidentally include 'staff'
 *      in `allowed`.
 *   3. `super_admin`                 → pass — implicit all-access (spec §6);
 *      caller need not list it in `allowed`.
 *   4. `role in allowed`             → pass; else ForbiddenError (403).
 *
 * On ForbiddenError, `details` carries `role` + `allowed` for observability
 * at the error-handler / log layer (masking happens at HTTP boundary).
 */
export function requireRole(
  tenant: TenantContext | undefined,
  allowed: readonly SessionRole[],
): void {
  if (!tenant) {
    throw new AuthError('No tenant context');
  }
  if (tenant.role === 'staff') {
    throw new ForbiddenError('staff role not permitted on CRM endpoints', {
      role: tenant.role,
      allowed,
    });
  }
  if (tenant.isSuperAdmin) return;
  if (!allowed.includes(tenant.role)) {
    throw new ForbiddenError(`role '${tenant.role}' not in allowed set`, {
      role: tenant.role,
      allowed,
    });
  }
}
