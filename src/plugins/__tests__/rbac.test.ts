import { describe, expect, it } from '@jest/globals';

import { AuthError, ForbiddenError } from '@core/errors/app-errors.js';

import { requireRole } from '../rbac.js';
import { assertDeptOwnership, assertHotelOwnership, deriveTenantContext } from '../tenant-guard.js';

describe('requireRole', () => {
  const gmAdmin = deriveTenantContext({ userId: 'u-1', hotelId: 'h-1', role: 'gm_admin' });
  const deptHead = deriveTenantContext({
    userId: 'u-2',
    hotelId: 'h-1',
    role: 'dept_head',
    deptId: 'd-1',
  });
  const superAdmin = deriveTenantContext({ userId: 'u-3', hotelId: 'h-1', role: 'super_admin' });
  const staff = deriveTenantContext({ userId: 'u-4', hotelId: 'h-1', role: 'staff' });

  it('should throw AuthError when tenant is undefined', () => {
    expect(() => requireRole(undefined, ['gm_admin'])).toThrow(AuthError);
  });

  it('should throw ForbiddenError when role is staff even if staff is in allowed', () => {
    expect(() => requireRole(staff, ['staff'])).toThrow(ForbiddenError);
  });

  it('should throw ForbiddenError when role is staff and allowed is empty', () => {
    expect(() => requireRole(staff, [])).toThrow(ForbiddenError);
  });

  it('should allow super_admin when allowed does not include super_admin', () => {
    expect(() => requireRole(superAdmin, ['gm_admin'])).not.toThrow();
  });

  it('should allow super_admin when allowed is empty', () => {
    expect(() => requireRole(superAdmin, [])).not.toThrow();
  });

  it('should allow gm_admin when included in allowed', () => {
    expect(() => requireRole(gmAdmin, ['gm_admin'])).not.toThrow();
  });

  it('should throw ForbiddenError when gm_admin is not in allowed', () => {
    expect(() => requireRole(gmAdmin, ['dept_head'])).toThrow(ForbiddenError);
  });

  it('should allow dept_head when included in allowed', () => {
    expect(() => requireRole(deptHead, ['gm_admin', 'dept_head'])).not.toThrow();
  });

  it('should throw ForbiddenError when dept_head is not in allowed', () => {
    expect(() => requireRole(deptHead, ['gm_admin'])).toThrow(ForbiddenError);
  });

  it('should include role and allowed in ForbiddenError.details for observability', () => {
    let caught: unknown;
    try {
      requireRole(deptHead, ['gm_admin']);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ForbiddenError);
    expect((caught as ForbiddenError).details).toEqual({
      role: 'dept_head',
      allowed: ['gm_admin'],
    });
  });
});

describe('requireRole composition with tenant-guard chain', () => {
  it('should complete the chain without throwing when dept_head accesses own hotel and own dept', () => {
    const tenant = deriveTenantContext({
      userId: 'u-1',
      hotelId: 'h-1',
      role: 'dept_head',
      deptId: 'd-1',
    });

    expect(() => {
      requireRole(tenant, ['gm_admin', 'dept_head']);
      assertHotelOwnership(tenant, 'h-1');
      assertDeptOwnership(tenant, 'd-1');
    }).not.toThrow();
  });
});
