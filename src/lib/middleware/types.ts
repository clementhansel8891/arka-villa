/**
 * Middleware types for the multi-tenant platform.
 *
 * Defines the interfaces used by the proxy middleware stack
 * for tenant resolution, session management, and rate limiting.
 */

/**
 * Platform roles aligned with the RBAC system.
 */
export type PlatformRole =
  | 'Agency_Admin'
  | 'Villa_Owner'
  | 'Employee'
  | 'Guest'
  | 'Visitor';

/**
 * Tenant context extracted from the request subdomain or path.
 */
export interface TenantContext {
  /** UUID of the resolved tenant */
  tenantId: string;
  /** Subdomain or slug used to identify the tenant */
  slug: string;
}

/**
 * Authenticated user session extracted from JWT.
 */
export interface UserSession {
  /** User UUID */
  userId: string;
  /** User's role in the platform */
  role: PlatformRole;
  /** Tenant IDs the user is authorized to access */
  tenantIds: string[];
  /** Session ID for Redis session lookup */
  sessionId: string;
  /** Token issued-at timestamp (epoch seconds) */
  iat: number;
  /** Token expiration timestamp (epoch seconds) */
  exp: number;
}

/**
 * Rate limit result from the token bucket algorithm.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining tokens in the bucket */
  remaining: number;
  /** Total bucket capacity */
  limit: number;
  /** Seconds until the bucket refills (for Retry-After header) */
  retryAfter: number;
}

/**
 * Rate limit configuration for different endpoint categories.
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

/**
 * Headers set by the middleware for downstream consumption.
 */
export const MIDDLEWARE_HEADERS = {
  TENANT_ID: 'x-tenant-id',
  TENANT_SLUG: 'x-tenant-slug',
  USER_ID: 'x-user-id',
  USER_ROLE: 'x-user-role',
  SESSION_ID: 'x-session-id',
  VIEWPORT: 'x-viewport',
} as const;
