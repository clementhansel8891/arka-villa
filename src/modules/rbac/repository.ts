/**
 * RBAC Repository — database queries for role assignments.
 *
 * Handles persistence of role assignments in the public schema
 * (cross-tenant shared table) and permission denial logging.
 *
 * Requirements: 2.7, 2.8, 2.9
 */

import { publicQuery } from '@/lib/db';
import { redis } from '@/lib/db/redis';

import type { PermissionDenialLog, Role, RoleAssignment, RoleAssignmentInput } from './types';

/** Redis key prefix for cached user permissions. */
const PERMISSIONS_CACHE_PREFIX = 'rbac:permissions:';

/** Cache TTL in seconds (short — allows real-time updates within 5s). */
const PERMISSIONS_CACHE_TTL_SECONDS = 4;

/**
 * Get the current role assignment for a user.
 * Per Requirement 2.9: single role per user account.
 */
export async function getRoleAssignment(userId: string): Promise<RoleAssignment | null> {
  const result = await publicQuery<{
    id: string;
    user_id: string;
    role: Role;
    tenant_ids: string[];
    assigned_at: Date;
    assigned_by: string;
  }>(
    `SELECT id, user_id, role, tenant_ids, assigned_at, assigned_by
     FROM role_assignments
     WHERE user_id = $1 AND is_active = true
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    tenantIds: row.tenant_ids,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
  };
}

/**
 * Assign a role to a user. Deactivates any existing role assignment first.
 * Per Requirement 2.9: single role per user account.
 * Per Requirement 2.7: apply within 5 seconds without re-auth.
 */
export async function assignRole(input: RoleAssignmentInput): Promise<RoleAssignment> {
  // Deactivate any existing role assignment for this user
  await publicQuery(
    `UPDATE role_assignments
     SET is_active = false, deactivated_at = NOW()
     WHERE user_id = $1 AND is_active = true`,
    [input.userId]
  );

  // Insert the new role assignment
  const result = await publicQuery<{
    id: string;
    user_id: string;
    role: Role;
    tenant_ids: string[];
    assigned_at: Date;
    assigned_by: string;
  }>(
    `INSERT INTO role_assignments (user_id, role, tenant_ids, assigned_by, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, user_id, role, tenant_ids, assigned_at, assigned_by`,
    [input.userId, input.role, input.tenantIds, input.assignedBy]
  );

  const row = result.rows[0];
  const assignment: RoleAssignment = {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    tenantIds: row.tenant_ids,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
  };

  // Invalidate permissions cache immediately so changes apply within 5 seconds
  await invalidatePermissionsCache(input.userId);

  return assignment;
}

/**
 * Cache user permissions in Redis for fast subsequent lookups.
 * Per Requirement 2.2: load within 2 seconds of authentication.
 */
export async function cacheUserPermissions(
  userId: string,
  data: string
): Promise<void> {
  await redis.set(
    `${PERMISSIONS_CACHE_PREFIX}${userId}`,
    data,
    'EX',
    PERMISSIONS_CACHE_TTL_SECONDS
  );
}

/**
 * Retrieve cached user permissions from Redis.
 */
export async function getCachedPermissions(userId: string): Promise<string | null> {
  return redis.get(`${PERMISSIONS_CACHE_PREFIX}${userId}`);
}

/**
 * Invalidate cached permissions for a user.
 * Called when role assignment changes to ensure real-time updates.
 * Per Requirement 2.7: changes apply within 5 seconds.
 */
export async function invalidatePermissionsCache(userId: string): Promise<void> {
  await redis.del(`${PERMISSIONS_CACHE_PREFIX}${userId}`);
}

/**
 * Log a permission denial to the database.
 * Per Requirement 2.8: log all denials with user, target tenant, timestamp.
 */
export async function logPermissionDenial(entry: PermissionDenialLog): Promise<void> {
  await publicQuery(
    `INSERT INTO permission_denial_logs
       (user_id, role, resource, action, target_tenant_id, reason, denied_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.userId,
      entry.role,
      entry.resource,
      entry.action,
      entry.targetTenantId,
      entry.reason,
      entry.timestamp,
    ]
  );
}

/**
 * Get all role assignments for a specific tenant.
 * Used by Agency_Admin to view users assigned to a villa.
 */
export async function getRoleAssignmentsByTenant(tenantId: string): Promise<RoleAssignment[]> {
  const result = await publicQuery<{
    id: string;
    user_id: string;
    role: Role;
    tenant_ids: string[];
    assigned_at: Date;
    assigned_by: string;
  }>(
    `SELECT id, user_id, role, tenant_ids, assigned_at, assigned_by
     FROM role_assignments
     WHERE $1 = ANY(tenant_ids) AND is_active = true`,
    [tenantId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    role: row.role,
    tenantIds: row.tenant_ids,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
  }));
}

/**
 * Check if a user already has an active role assignment.
 * Per Requirement 2.9: exactly one role per user account.
 */
export async function hasExistingRoleAssignment(userId: string): Promise<boolean> {
  const result = await publicQuery<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM role_assignments
     WHERE user_id = $1 AND is_active = true`,
    [userId]
  );

  return parseInt(result.rows[0].count, 10) > 0;
}
