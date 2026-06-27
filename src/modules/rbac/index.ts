/**
 * RBAC Module
 *
 * Role-based access control, permission matrix enforcement,
 * and fine-grained permission checking for the multi-tenant platform.
 *
 * This module provides:
 * - Permission matrix defining access for 5 roles
 * - Service layer for permission checking and role assignment
 * - Repository layer for database queries and caching
 * - Types for all RBAC-related data structures
 *
 * The middleware rbac-enforcer (at @/lib/middleware/rbac-enforcer.ts)
 * handles route-level enforcement. This module provides the data layer
 * and fine-grained permission checking that feeds the middleware.
 */

export * from './types';
export * from './permissions';
export {
  loadUserPermissions,
  checkPermission,
  assignRole,
  getUserRole,
  refreshPermissions,
} from './service';
export {
  getRoleAssignment,
  getRoleAssignmentsByTenant,
  logPermissionDenial,
  invalidatePermissionsCache,
} from './repository';
