/**
 * RBAC Service — business logic for permission checking, role assignment,
 * and permission loading.
 *
 * This module provides the data layer and fine-grained permission checking
 * that feeds the middleware rbac-enforcer.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
 */

import { ALL_ROLES } from './types';
import type {
  PermissionCheckRequest,
  PermissionCheckResult,
  PermissionDenialLog,
  Role,
  RoleAssignment,
  RoleAssignmentInput,
  UserPermissions,
} from './types';
import { getPermissionsForRole, getPermissionScope, roleHasPermission } from './permissions';
import {
  assignRole as assignRoleInDb,
  cacheUserPermissions,
  getCachedPermissions,
  getRoleAssignment,
  invalidatePermissionsCache,
  logPermissionDenial,
} from './repository';

/**
 * Load permissions for a user, using Redis cache for performance.
 * Per Requirement 2.2: complete within 2 seconds of authentication.
 *
 * This function first checks the Redis cache. If not cached, it loads
 * the role assignment from the database, resolves permissions from the
 * permission matrix, caches the result, and returns it.
 */
export async function loadUserPermissions(userId: string): Promise<UserPermissions | null> {
  // Check cache first for fast return
  const cached = await getCachedPermissions(userId);
  if (cached) {
    return JSON.parse(cached) as UserPermissions;
  }

  // Load from database
  const assignment = await getRoleAssignment(userId);
  if (!assignment) {
    return null;
  }

  // Resolve permissions from the permission matrix
  const permissions = getPermissionsForRole(assignment.role);

  const userPermissions: UserPermissions = {
    userId,
    role: assignment.role,
    tenantIds: assignment.tenantIds,
    permissions,
    loadedAt: new Date().toISOString(),
  };

  // Cache for fast subsequent lookups
  await cacheUserPermissions(userId, JSON.stringify(userPermissions));

  return userPermissions;
}

/**
 * Check if a user has permission to perform an action on a resource.
 * Considers role, resource, action, scope, and tenant context.
 *
 * Per Requirements 2.3-2.6: enforces role-specific access rules.
 * Per Requirement 2.8: logs denials with user, target tenant, and timestamp.
 */
export async function checkPermission(
  request: PermissionCheckRequest
): Promise<PermissionCheckResult> {
  const { userId, role, resource, action, tenantId, userTenantIds } = request;

  // Step 1: Check if the role has the base permission
  if (!roleHasPermission(role, resource, action)) {
    const reason = `Role '${role}' does not have '${action}' permission on resource '${resource}'`;

    // Log the denial (Requirement 2.8)
    await logDenial(userId, role, resource, action, tenantId ?? null, reason);

    return { allowed: false, reason };
  }

  // Step 2: Check scope-based access
  const scope = getPermissionScope(role, resource, action);

  if (scope === 'all') {
    // Agency_Admin has 'all' scope — no further checks needed
    return { allowed: true };
  }

  if (scope === 'public') {
    // Public scope — anyone can access
    return { allowed: true };
  }

  if (scope === 'tenant' && tenantId) {
    // Tenant-scoped: user must be authorized for the target tenant
    // Agency_Admin bypasses tenant check (covered by 'all' scope above)
    if (!userTenantIds.includes(tenantId)) {
      const reason = `User is not authorized for tenant '${tenantId}'`;

      await logDenial(userId, role, resource, action, tenantId, reason);

      return { allowed: false, reason };
    }
  }

  // 'own' scope: the caller must ensure they are accessing their own data.
  // The service trusts that route handlers enforce ownership checks on individual records.

  return { allowed: true };
}

/**
 * Assign a role to a user. Enforces single-role-per-account rule.
 *
 * Per Requirement 2.9: exactly one role per user account.
 * Per Requirement 2.7: apply within 5 seconds without re-auth.
 */
export async function assignRole(input: RoleAssignmentInput): Promise<RoleAssignment> {
  // Validate role
  if (!ALL_ROLES.includes(input.role)) {
    throw new Error(`Invalid role: ${input.role}`);
  }

  // Validate tenant assignment logic
  if (input.role === 'Agency_Admin' && input.tenantIds.length > 0) {
    // Agency_Admin has access to ALL tenants — tenantIds should be empty
    // We allow it but clear tenantIds since the role has 'all' scope
    input = { ...input, tenantIds: [] };
  }

  if (input.role === 'Visitor') {
    throw new Error('Cannot explicitly assign Visitor role. Visitor is the implicit unauthenticated role.');
  }

  // Assign the role (repository handles deactivating old assignment)
  const assignment = await assignRoleInDb(input);

  return assignment;
}

/**
 * Get the current role assignment for a user.
 */
export async function getUserRole(userId: string): Promise<RoleAssignment | null> {
  return getRoleAssignment(userId);
}

/**
 * Invalidate a user's cached permissions.
 * Called when role changes are made to ensure real-time updates.
 * Per Requirement 2.7: apply within 5 seconds without re-auth.
 */
export async function refreshPermissions(userId: string): Promise<void> {
  await invalidatePermissionsCache(userId);
}

/**
 * Internal helper to log permission denials.
 * Per Requirement 2.8: all denials logged with user, target tenant, timestamp.
 */
async function logDenial(
  userId: string,
  role: Role,
  resource: string,
  action: string,
  targetTenantId: string | null,
  reason: string
): Promise<void> {
  const entry: PermissionDenialLog = {
    userId,
    role,
    resource,
    action: action as PermissionDenialLog['action'],
    targetTenantId,
    reason,
    timestamp: new Date().toISOString(),
  };

  // Fire and forget — don't block the response for logging
  logPermissionDenial(entry).catch((err) => {
    console.error('[RBAC] Failed to log permission denial:', err);
  });
}
