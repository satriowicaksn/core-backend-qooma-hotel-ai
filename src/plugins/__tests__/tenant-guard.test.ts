import { describe, it, expect } from '@jest/globals';

import { AuthError, NotFoundError } from '@core/errors/app-errors.js';

import {
  assertDeptOwnership,
  assertHotelOwnership,
  deriveTenantContext,
  type SessionUser,
} from '../tenant-guard.js';

describe('deriveTenantContext', () => {
  it('should throw AuthError when user is undefined', () => {
    expect(() => deriveTenantContext(undefined)).toThrow(AuthError);
  });

  it('should mark super_admin correctly', () => {
    const user: SessionUser = { userId: 'u-1', hotelId: 'h-1', role: 'super_admin' };
    const tenant = deriveTenantContext(user);
    expect(tenant.isSuperAdmin).toBe(true);
    expect(tenant.hotelId).toBe('h-1');
    expect(tenant.role).toBe('super_admin');
  });

  it('should not mark gm_admin as super_admin', () => {
    const user: SessionUser = { userId: 'u-2', hotelId: 'h-1', role: 'gm_admin' };
    const tenant = deriveTenantContext(user);
    expect(tenant.isSuperAdmin).toBe(false);
    expect(tenant.role).toBe('gm_admin');
  });

  it('should include deptId when present on user', () => {
    const user: SessionUser = {
      userId: 'u-3',
      hotelId: 'h-1',
      role: 'dept_head',
      deptId: 'd-1',
    };
    const tenant = deriveTenantContext(user);
    expect(tenant.deptId).toBe('d-1');
  });

  it('should omit deptId when not on user', () => {
    const user: SessionUser = { userId: 'u-4', hotelId: 'h-1', role: 'gm_admin' };
    const tenant = deriveTenantContext(user);
    expect(tenant.deptId).toBeUndefined();
  });
});

describe('assertHotelOwnership', () => {
  const gmAdmin = deriveTenantContext({
    userId: 'u-1',
    hotelId: 'h-1',
    role: 'gm_admin',
  });
  const superAdmin = deriveTenantContext({
    userId: 'u-2',
    hotelId: 'h-99',
    role: 'super_admin',
  });

  it('should throw AuthError when tenant is undefined', () => {
    expect(() => assertHotelOwnership(undefined, 'h-1')).toThrow(AuthError);
  });

  it('should allow same-hotel access', () => {
    expect(() => assertHotelOwnership(gmAdmin, 'h-1')).not.toThrow();
  });

  it('should throw NotFoundError on cross-hotel access (mask 403 as 404)', () => {
    expect(() => assertHotelOwnership(gmAdmin, 'h-2')).toThrow(NotFoundError);
  });

  it('super_admin should bypass hotel check', () => {
    expect(() => assertHotelOwnership(superAdmin, 'h-anything')).not.toThrow();
  });
});

describe('assertDeptOwnership', () => {
  const gmAdmin = deriveTenantContext({
    userId: 'u-1',
    hotelId: 'h-1',
    role: 'gm_admin',
  });
  const deptHead = deriveTenantContext({
    userId: 'u-2',
    hotelId: 'h-1',
    role: 'dept_head',
    deptId: 'd-1',
  });
  const superAdmin = deriveTenantContext({
    userId: 'u-3',
    hotelId: 'h-99',
    role: 'super_admin',
  });

  it('should throw AuthError when tenant is undefined', () => {
    expect(() => assertDeptOwnership(undefined, 'd-1')).toThrow(AuthError);
  });

  it('gm_admin should bypass dept check', () => {
    expect(() => assertDeptOwnership(gmAdmin, 'd-99')).not.toThrow();
  });

  it('super_admin should bypass dept check', () => {
    expect(() => assertDeptOwnership(superAdmin, 'd-99')).not.toThrow();
  });

  it('dept_head should access own dept', () => {
    expect(() => assertDeptOwnership(deptHead, 'd-1')).not.toThrow();
  });

  it('dept_head should be blocked from cross-dept (mask as 404)', () => {
    expect(() => assertDeptOwnership(deptHead, 'd-2')).toThrow(NotFoundError);
  });
});
