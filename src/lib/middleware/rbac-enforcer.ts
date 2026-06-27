/**
 * RBAC enforcement for the proxy middleware.
 *
 * Enforces role-based access control by checking the user's role
 * against the required permissions for the requested route.
 *
 * Per Requirement 2.1: Five roles with distinct access levels.
 * Per Requirement 2.8: Deny + error message on unauthorized access.
 */

import type { PlatformRole, UserSession, TenantContext } from './types';

/**
 * Route access configuration mapping path patterns to allowed roles.
 */
interface RouteAccessRule {
  /** Path prefix or pattern */
  pattern: string;
  /** Roles allowed to access this route */
  allowedRoles: PlatformRole[];
  /** Whether tenant context is required */
  requiresTenant: boolean;
}

/**
 * Route access rules define which roles can access which paths.
 * More specific rules should be listed first (matched top to bottom).
 */
const ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  // Agency admin routes
  { pattern: '/api/v1/tenants', allowedRoles: ['Agency_Admin'], requiresTenant: false },
  { pattern: '/web/agency/', allowedRoles: ['Agency_Admin'], requiresTenant: false },
  { pattern: '/m/agency/', allowedRoles: ['Agency_Admin'], requiresTenant: false },

  // Owner portal routes
  { pattern: '/web/owner/', allowedRoles: ['Agency_Admin', 'Villa_Owner'], requiresTenant: true },
  { pattern: '/m/owner/', allowedRoles: ['Agency_Admin', 'Villa_Owner'], requiresTenant: true },

  // Staff portal routes
  { pattern: '/api/v1/staff/', allowedRoles: ['Agency_Admin', 'Employee'], requiresTenant: true },
  { pattern: '/web/staff/', allowedRoles: ['Agency_Admin', 'Employee'], requiresTenant: true },
  { pattern: '/m/staff/', allowedRoles: ['Agency_Admin', 'Employee'], requiresTenant: true },

  // Financial and reporting routes (Agency_Admin and Villa_Owner)
  { pattern: '/api/v1/financial/', allowedRoles: ['Agency_Admin', 'Villa_Owner'], requiresTenant: true },

  // Booking management routes (authenticated users, guests can view own)
  { pattern: '/api/v1/bookings', allowedRoles: ['Agency_Admin', 'Villa_Owner', 'Employee', 'Guest'], requiresTenant: true },

  // AI chat routes
  { pattern: '/api/v1/ai/', allowedRoles: ['Agency_Admin', 'Villa_Owner', 'Employee', 'Guest'], requiresTenant: true },

  // CCTV routes (restricted)
  { pattern: '/api/v1/cctv/', allowedRoles: ['Agency_Admin', 'Villa_Owner'], requiresTenant: true },

  // IoT routes (restricted)
  { pattern: '/api/v1/iot/', allowedRoles: ['Agency_Admin'], requiresTenant: true },

  // Marketing routes
  { pattern: '/api/v1/marketing/', allowedRoles: ['Agency_Admin'], requiresTenant: false },

  // Maintenance routes
  { pattern: '/api/v1/maintenance/', allowedRoles: ['Agency_Admin', 'Employee'], requiresTenant: true },

  // Channel management
  { pattern: '/api/v1/channels/', allowedRoles: ['Agency_Admin'], requiresTenant: true },

  // Notification routes (any authenticated user)
  { pattern: '/api/v1/notifications/', allowedRoles: ['Agency_Admin', 'Villa_Owner', 'Employee', 'Guest'], requiresTenant: false },

  // Audit logs (admin only)
  { pattern: '/api/v1/audit/', allowedRoles: ['Agency_Admin'], requiresTenant: false },

  // RBAC management
  { pattern: '/api/v1/rbac/', allowedRoles: ['Agency_Admin'], requiresTenant: false },

  // Generic authenticated API endpoints
  { pattern: '/api/v1/', allowedRoles: ['Agency_Admin', 'Villa_Owner', 'Employee', 'Guest'], requiresTenant: false },

  // Dashboard views (any authenticated user)
  { pattern: '/web/', allowedRoles: ['Agency_Admin', 'Villa_Owner', 'Employee', 'Guest'], requiresTenant: false },
  { pattern: '/m/', allowedRoles: ['Agency_Admin', 'Villa_Owner', 'Employee', 'Guest'], requiresTenant: false },
];

/**
 * Result of an RBAC enforcement check.
 */
export interface RbacResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** Reason for denial (for logging and error response) */
  reason?: string;
  /** Required role for the requested resource */
  requiredRoles?: PlatformRole[];
}

/**
 * Enforces RBAC on the request based on user session and route.
 *
 * @param pathname - Request path
 * @param session - Authenticated user session (null for visitors)
 * @param tenant - Resolved tenant context (null if not resolved)
 * @returns RbacResult indicating whether access is allowed
 */
export function enforceRbac(
  pathname: string,
  session: UserSession | null,
  tenant: TenantContext | null
): RbacResult {
  // Find the matching rule
  const rule = ROUTE_ACCESS_RULES.find((r) =>
    pathname.startsWith(r.pattern)
  );

  // No rule matched — allow (public route)
  if (!rule) {
    return { allowed: true };
  }

  // Rule exists but no session — deny (auth required)
  if (!session) {
    return {
      allowed: false,
      reason: 'Authentication required',
      requiredRoles: rule.allowedRoles,
    };
  }

  // Check if user's role is in allowed roles
  if (!rule.allowedRoles.includes(session.role)) {
    return {
      allowed: false,
      reason: `Role '${session.role}' is not authorized. Required: ${rule.allowedRoles.join(', ')}`,
      requiredRoles: rule.allowedRoles,
    };
  }

  // Check tenant scope if required
  if (rule.requiresTenant && tenant) {
    // Agency_Admin can access all tenants
    if (session.role === 'Agency_Admin') {
      return { allowed: true };
    }

    // Other roles must have the tenant in their authorized list
    if (!session.tenantIds.includes(tenant.tenantId)) {
      return {
        allowed: false,
        reason: `User not authorized for tenant '${tenant.tenantId}'`,
        requiredRoles: rule.allowedRoles,
      };
    }
  }

  return { allowed: true };
}
