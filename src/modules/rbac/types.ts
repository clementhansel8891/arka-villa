/**
 * RBAC module types.
 *
 * Defines the permission matrix structure, role definitions,
 * and supporting types for the role-based access control system.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9
 */

import type { PlatformRole } from '@/lib/middleware/types';

/** Re-export PlatformRole as the canonical Role type for the RBAC module. */
export type Role = PlatformRole;

/** All valid roles in the system. */
export const ALL_ROLES: readonly Role[] = [
  'Agency_Admin',
  'Villa_Owner',
  'Employee',
  'Guest',
  'Visitor',
] as const;

/** Actions a user can perform on a resource. */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

/** Scope of the permission — who the data belongs to. */
export type PermissionScope = 'all' | 'own' | 'tenant' | 'public';

/**
 * A single permission entry defining what action can be
 * taken on a resource, and within what scope.
 */
export interface Permission {
  /** The resource being acted upon (e.g., 'bookings', 'financial_reports'). */
  resource: string;
  /** The action being performed. */
  action: PermissionAction;
  /** The scope restriction for this permission. */
  scope: PermissionScope;
}

/**
 * A role assignment linking a user to a specific role and tenant.
 * Per Requirement 2.9: exactly one role per user account.
 */
export interface RoleAssignment {
  /** Unique identifier for this assignment. */
  id: string;
  /** The user being assigned. */
  userId: string;
  /** The role assigned to the user. */
  role: Role;
  /** Tenant IDs the user has access to (empty for Agency_Admin = all tenants). */
  tenantIds: string[];
  /** When this assignment was created. */
  assignedAt: Date;
  /** Who performed the assignment. */
  assignedBy: string;
}

/**
 * Input for assigning a role to a user.
 */
export interface RoleAssignmentInput {
  /** The user to assign a role to. */
  userId: string;
  /** The role to assign. */
  role: Role;
  /** Tenant IDs to scope the assignment (empty for Agency_Admin). */
  tenantIds: string[];
  /** ID of the admin performing the assignment. */
  assignedBy: string;
}

/**
 * The complete permission matrix: maps each role to its allowed permissions.
 */
export type PermissionMatrix = Record<Role, Permission[]>;

/**
 * Cached user permissions loaded after authentication.
 * Per Requirement 2.2: loaded within 2 seconds of authentication.
 */
export interface UserPermissions {
  /** User ID. */
  userId: string;
  /** User's assigned role. */
  role: Role;
  /** Tenant IDs the user can access. */
  tenantIds: string[];
  /** The resolved permissions for the user's role. */
  permissions: Permission[];
  /** When these permissions were loaded/cached. */
  loadedAt: string;
}

/**
 * A permission check request.
 */
export interface PermissionCheckRequest {
  /** User ID performing the action. */
  userId: string;
  /** User's role. */
  role: Role;
  /** Target resource. */
  resource: string;
  /** Action being attempted. */
  action: PermissionAction;
  /** The tenant context for this action. */
  tenantId?: string;
  /** Tenant IDs the user is authorized for. */
  userTenantIds: string[];
}

/**
 * Result of a permission check.
 */
export interface PermissionCheckResult {
  /** Whether the action is allowed. */
  allowed: boolean;
  /** Reason for denial (populated when allowed is false). */
  reason?: string;
}

/**
 * Permission denial log entry.
 * Per Requirement 2.8: log all denials with user, target tenant, and timestamp.
 */
export interface PermissionDenialLog {
  /** User who attempted the action. */
  userId: string;
  /** User's role. */
  role: Role;
  /** The resource targeted. */
  resource: string;
  /** The action attempted. */
  action: PermissionAction;
  /** Target tenant (if applicable). */
  targetTenantId: string | null;
  /** Human-readable denial reason. */
  reason: string;
  /** When the denial occurred (ISO 8601). */
  timestamp: string;
}
