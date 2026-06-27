/**
 * CSRF (Cross-Site Request Forgery) protection.
 *
 * Implements double-submit cookie pattern for state-changing operations.
 * CSRF tokens are generated per session and validated on POST/PUT/PATCH/DELETE.
 *
 * Requirements: 34.3, 34.4
 */

import { randomBytes } from 'crypto';

/** CSRF token length in bytes (results in 64-char hex string) */
const TOKEN_BYTE_LENGTH = 32;

/** Name of the CSRF cookie */
export const CSRF_COOKIE_NAME = '__csrf_token';

/** Name of the CSRF header expected in requests */
export const CSRF_HEADER_NAME = 'x-csrf-token';

/** HTTP methods that require CSRF validation (state-changing) */
export const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Paths exempt from CSRF checks (e.g., webhook endpoints) */
const CSRF_EXEMPT_PATHS = [
  '/api/v1/payments/webhook',
  '/api/v1/channels/sync/webhook',
  '/api/v1/internal/',
];

export interface CsrfValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Generates a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
  return randomBytes(TOKEN_BYTE_LENGTH).toString('hex');
}

/**
 * Validates a CSRF token from the request header against the cookie value.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function validateCsrfToken(
  headerToken: string | null | undefined,
  cookieToken: string | null | undefined
): CsrfValidationResult {
  if (!cookieToken) {
    return { valid: false, reason: 'Missing CSRF cookie' };
  }

  if (!headerToken) {
    return { valid: false, reason: 'Missing CSRF header' };
  }

  if (headerToken.length !== cookieToken.length) {
    return { valid: false, reason: 'CSRF token mismatch' };
  }

  // Timing-safe comparison
  if (!timingSafeEqual(headerToken, cookieToken)) {
    return { valid: false, reason: 'CSRF token mismatch' };
  }

  return { valid: true };
}

/**
 * Determines whether the given request path and method require CSRF validation.
 */
export function requiresCsrfValidation(method: string, pathname: string): boolean {
  // Only state-changing methods need CSRF
  if (!CSRF_PROTECTED_METHODS.has(method.toUpperCase())) {
    return false;
  }

  // Check exempt paths (webhooks, internal endpoints)
  for (const exemptPath of CSRF_EXEMPT_PATHS) {
    if (pathname.startsWith(exemptPath)) {
      return false;
    }
  }

  // Only API routes under /api/v1/ need CSRF
  if (!pathname.startsWith('/api/v1/')) {
    return false;
  }

  return true;
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Returns the Set-Cookie attributes for the CSRF cookie.
 */
export function getCsrfCookieOptions(isProduction: boolean): string {
  const parts = [
    `${CSRF_COOKIE_NAME}={token}`,
    'Path=/',
    'HttpOnly=false',  // Client JS needs to read this for the header
    `SameSite=${isProduction ? 'Strict' : 'Lax'}`,
  ];

  if (isProduction) {
    parts.push('Secure');
  }

  return parts.join('; ');
}
