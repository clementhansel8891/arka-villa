/**
 * Security headers and API versioning enforcement.
 *
 * Consolidates security header configuration that was previously
 * scattered across proxy.ts. Provides a single function to retrieve
 * all required security headers for responses.
 *
 * Requirements: 34.4 (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
 */

/** The required API version prefix for all API routes */
export const API_VERSION_PREFIX = '/api/v1/';

/**
 * Returns all security headers that should be set on every response.
 *
 * These headers mitigate common web attacks:
 * - X-Frame-Options: prevents clickjacking
 * - X-Content-Type-Options: prevents MIME sniffing
 * - Referrer-Policy: limits referrer information leakage
 * - Strict-Transport-Security: enforces HTTPS
 * - Content-Security-Policy: controls resource loading
 * - Permissions-Policy: restricts browser features
 * - X-DNS-Prefetch-Control: controls DNS prefetching
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy': buildCsp(),
    'Permissions-Policy': buildPermissionsPolicy(),
    'X-DNS-Prefetch-Control': 'off',
  };
}

/**
 * Checks whether a path is a valid versioned API path.
 * All API routes must start with /api/v1/ for version enforcement.
 */
export function isVersionedApiPath(pathname: string): boolean {
  // Non-API paths don't require versioning
  if (!pathname.startsWith('/api/')) {
    return true;
  }
  // API paths must be versioned
  return pathname.startsWith(API_VERSION_PREFIX);
}

/**
 * Builds the Content-Security-Policy header value.
 */
function buildCsp(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' wss: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  return directives.join('; ');
}

/**
 * Builds the Permissions-Policy header value.
 * Restricts access to sensitive browser APIs.
 */
function buildPermissionsPolicy(): string {
  const policies = [
    'camera=(self)',
    'microphone=()',
    'geolocation=()',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ];
  return policies.join(', ');
}
