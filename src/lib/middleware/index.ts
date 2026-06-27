/**
 * Middleware utilities - barrel export.
 *
 * Provides all middleware stack components for the Next.js proxy.
 */

export type {
  TenantContext,
  UserSession,
  PlatformRole,
  RateLimitResult,
  RateLimitConfig,
} from './types';
export { MIDDLEWARE_HEADERS } from './types';

export {
  checkRateLimit,
  getRateLimitConfig,
  getRateLimitKey,
  RATE_LIMITS,
  TOKEN_BUCKET_SCRIPT,
} from './rate-limiter';

export {
  extractSubdomain,
  resolveTenantFromSlug,
  cacheTenantResolution,
  extractTenantFromPath,
} from './tenant-resolver';

export { validateJwt, signJwt } from './jwt-validator';

export { enforceRbac } from './rbac-enforcer';
export type { RbacResult } from './rbac-enforcer';

export {
  detectViewport,
  getViewportRedirect,
  isViewportRedirectExempt,
} from './viewport-detector';
export type { ViewportType } from './viewport-detector';
