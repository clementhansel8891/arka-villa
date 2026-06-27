/**
 * Property-Based Tests for RBAC Permission Enforcement.
 *
 * **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.8, 27.4, 29.5**
 *
 * Uses fast-check to generate random role/operation/resource combinations
 * and verify the permission matrix correctness.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getPermissionsForRole,
  roleHasPermission,
  getPermissionScope,
  PERMISSION_MATRIX,
} from '../permissions';
import type { PermissionAction, PermissionScope, Role } from '../types';
import { ALL_ROLES } from '../types';

// --- Arbitraries ---

const roleArb: fc.Arbitrary<Role> = fc.constantFrom(...ALL_ROLES);

const actionArb: fc.Arbitrary<PermissionAction> = fc.constantFrom(
  'create',
  'read',
  'update',
  'delete'
);

/** All resources that appear in the permission matrix. */
const allResources: string[] = [
  ...new Set(
    Object.values(PERMISSION_MATRIX).flatMap((perms) =>
      perms.map((p) => p.resource)
    )
  ),
];

const resourceArb: fc.Arbitrary<string> = fc.constantFrom(...allResources);

describe('RBAC Permission Enforcement — Property Tests', () => {
  /**
   * Property 1: Agency_Admin has 'all' scope on every resource it can access.
   * Per Requirement 2.3: Agency_Admin full read/write across all tenants.
   */
  it('Agency_Admin has "all" scope on every resource+action it is granted', () => {
    const agencyAdminPermissions = getPermissionsForRole('Agency_Admin');
    const agencyAdminResourceActions = agencyAdminPermissions.map(
      (p) => `${p.resource}:${p.action}`
    );

    fc.assert(
      fc.property(
        fc.constantFrom(...agencyAdminResourceActions),
        (resourceAction) => {
          const [resource, action] = resourceAction.split(':');
          const scope = getPermissionScope(
            'Agency_Admin',
            resource,
            action as PermissionAction
          );
          expect(scope).toBe('all');
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 2: Villa_Owner can only read (not write) financial_reports and bookings,
   * except settings which they can write.
   * Per Requirement 2.4.
   */
  it('Villa_Owner has only read access to financial_reports and bookings (no create/update/delete)', () => {
    const readOnlyResources = ['financial_reports', 'bookings'];
    const writeActions: PermissionAction[] = ['create', 'update', 'delete'];

    fc.assert(
      fc.property(
        fc.constantFrom(...readOnlyResources),
        fc.constantFrom(...writeActions),
        (resource, action) => {
          const hasPermission = roleHasPermission('Villa_Owner', resource, action);
          expect(hasPermission).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Employee cannot access financial_reports at all.
   * Per Requirement 2.5.
   */
  it('Employee has no access to financial_reports for any action', () => {
    fc.assert(
      fc.property(actionArb, (action) => {
        const hasPermission = roleHasPermission('Employee', 'financial_reports', action);
        expect(hasPermission).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Guest can only access 'own' scope resources.
   * Per Requirement 2.6: restricted to own booking records, profile, messaging.
   */
  it('Guest permissions are all scoped to "own"', () => {
    const guestPermissions = getPermissionsForRole('Guest');

    fc.assert(
      fc.property(
        fc.constantFrom(...guestPermissions.map((_, i) => i)),
        (index) => {
          const perm = guestPermissions[index];
          expect(perm.scope).toBe('own');
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 5: Visitor can only access 'public' scope resources.
   */
  it('Visitor permissions are all scoped to "public"', () => {
    const visitorPermissions = getPermissionsForRole('Visitor');

    fc.assert(
      fc.property(
        fc.constantFrom(...visitorPermissions.map((_, i) => i)),
        (index) => {
          const perm = visitorPermissions[index];
          expect(perm.scope).toBe('public');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: No role has more permissions than Agency_Admin on shared resources.
   * For any resource+action that a non-admin role has AND that resource exists in
   * Agency_Admin's matrix, Agency_Admin also has that action.
   * Role-specific self-service resources (profile, work_hours) and role-specific
   * actions (reviews:create for guests) are excluded as they are by design
   * accessible only to their respective roles.
   */
  it('Agency_Admin is a superset on shared resources — non-admin permissions on shared resources are also granted to Agency_Admin', () => {
    // Resources that are role-specific self-service and not meant for admin access
    const roleSpecificResources = new Set(['profile', 'work_hours', 'agency_showcase']);
    // Specific resource+action combos that are role-specific by design
    const roleSpecificActions = new Set(['reviews:create']);

    const agencyAdminResources = new Set(
      getPermissionsForRole('Agency_Admin').map((p) => p.resource)
    );

    const nonAdminRoles: Role[] = ALL_ROLES.filter(
      (r) => r !== 'Agency_Admin'
    ) as Role[];

    fc.assert(
      fc.property(
        fc.constantFrom(...nonAdminRoles),
        resourceArb,
        actionArb,
        (role, resource, action) => {
          // Skip role-specific resources
          if (roleSpecificResources.has(resource)) return;
          // Skip role-specific actions
          if (roleSpecificActions.has(`${resource}:${action}`)) return;
          // Only check resources that Agency_Admin is expected to manage
          if (!agencyAdminResources.has(resource)) return;

          const roleHas = roleHasPermission(role, resource, action);
          if (roleHas) {
            const adminHas = roleHasPermission('Agency_Admin', resource, action);
            expect(adminHas).toBe(true);
          }
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * Property 7: Every permission denial for an unauthorized role/resource/action
   * returns null scope (correct denial).
   */
  it('Denied role/resource/action combinations return null scope', () => {
    fc.assert(
      fc.property(roleArb, resourceArb, actionArb, (role, resource, action) => {
        const hasPermission = roleHasPermission(role, resource, action);
        const scope = getPermissionScope(role, resource, action);

        if (!hasPermission) {
          expect(scope).toBeNull();
        } else {
          expect(scope).not.toBeNull();
        }
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Property 8: The permission matrix is complete — every role has a non-empty permission set.
   */
  it('Every role in ALL_ROLES has a non-empty permission set', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        const permissions = getPermissionsForRole(role);
        expect(permissions.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});
