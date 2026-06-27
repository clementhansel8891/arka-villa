/**
 * Tests for RBAC enforcement in the middleware.
 */

import { describe, it, expect } from 'vitest';
import { enforceRbac } from './rbac-enforcer';
import type { UserSession, TenantContext } from './types';

const adminSession: UserSession = {
  userId: 'admin-001',
  role: 'Agency_Admin',
  tenantIds: [],
  sessionId: 'sess-001',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const ownerSession: UserSession = {
  userId: 'owner-001',
  role: 'Villa_Owner',
  tenantIds: ['tenant-abc'],
  sessionId: 'sess-002',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const employeeSession: UserSession = {
  userId: 'staff-001',
  role: 'Employee',
  tenantIds: ['tenant-abc'],
  sessionId: 'sess-003',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const guestSession: UserSession = {
  userId: 'guest-001',
  role: 'Guest',
  tenantIds: ['tenant-abc'],
  sessionId: 'sess-004',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
};

const tenantContext: TenantContext = {
  tenantId: 'tenant-abc',
  slug: 'villa-sunrise',
};

const otherTenantContext: TenantContext = {
  tenantId: 'tenant-xyz',
  slug: 'villa-sunset',
};

describe('enforceRbac', () => {
  describe('public routes (no matching rule)', () => {
    it('allows access for unauthenticated users to unmatched routes', () => {
      expect(enforceRbac('/some-random-path', null, null).allowed).toBe(true);
    });
  });

  describe('authentication requirement', () => {
    it('denies unauthenticated access to API routes', () => {
      const result = enforceRbac('/api/v1/bookings', null, null);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Authentication required');
    });

    it('denies unauthenticated access to dashboard routes', () => {
      const result = enforceRbac('/web/agency/overview', null, null);
      expect(result.allowed).toBe(false);
    });
  });

  describe('role-based access', () => {
    it('allows Agency_Admin to access tenant management', () => {
      expect(enforceRbac('/api/v1/tenants', adminSession, null).allowed).toBe(true);
    });

    it('denies Villa_Owner access to tenant management', () => {
      const result = enforceRbac('/api/v1/tenants', ownerSession, null);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Villa_Owner');
    });

    it('allows Employee access to staff routes', () => {
      expect(enforceRbac('/api/v1/staff/tasks', employeeSession, tenantContext).allowed).toBe(true);
    });

    it('denies Guest access to staff routes', () => {
      const result = enforceRbac('/api/v1/staff/tasks', guestSession, tenantContext);
      expect(result.allowed).toBe(false);
    });

    it('allows Guest access to bookings', () => {
      expect(enforceRbac('/api/v1/bookings', guestSession, tenantContext).allowed).toBe(true);
    });

    it('denies Guest access to CCTV', () => {
      const result = enforceRbac('/api/v1/cctv/stream/123', guestSession, tenantContext);
      expect(result.allowed).toBe(false);
    });

    it('allows Villa_Owner access to CCTV', () => {
      expect(enforceRbac('/api/v1/cctv/stream/123', ownerSession, tenantContext).allowed).toBe(true);
    });
  });

  describe('tenant scope enforcement', () => {
    it('Agency_Admin can access any tenant', () => {
      expect(enforceRbac('/api/v1/bookings', adminSession, otherTenantContext).allowed).toBe(true);
    });

    it('Villa_Owner can access their own tenant', () => {
      expect(enforceRbac('/api/v1/bookings', ownerSession, tenantContext).allowed).toBe(true);
    });

    it('Villa_Owner cannot access other tenant', () => {
      const result = enforceRbac('/api/v1/bookings', ownerSession, otherTenantContext);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('tenant-xyz');
    });

    it('Employee can access their assigned tenant', () => {
      expect(enforceRbac('/api/v1/staff/tasks', employeeSession, tenantContext).allowed).toBe(true);
    });

    it('Employee cannot access unassigned tenant', () => {
      const result = enforceRbac('/api/v1/staff/tasks', employeeSession, otherTenantContext);
      expect(result.allowed).toBe(false);
    });
  });
});
