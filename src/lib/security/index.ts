/**
 * Security utilities - barrel export.
 *
 * Consolidates CORS, CSRF, input validation, security headers,
 * and request ID generation for the multi-villa platform.
 *
 * Requirements: 34.1, 34.2, 34.3, 34.4
 */

// CORS
export {
  getCorsConfig,
  isOriginAllowed,
  buildCorsHeaders,
  buildPreflightHeaders,
} from './cors';
export type { CorsConfig } from './cors';

// CSRF
export {
  generateCsrfToken,
  validateCsrfToken,
  requiresCsrfValidation,
  getCsrfCookieOptions,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  CSRF_PROTECTED_METHODS,
} from './csrf';
export type { CsrfValidationResult } from './csrf';

// Input Validation
export {
  validateContentType,
  validatePayloadSize,
  validateFieldLength,
  validateRequest,
  scanForThreats,
  detectSqlInjection,
  detectXss,
  getPayloadCategory,
  PAYLOAD_LIMITS,
  ALLOWED_CONTENT_TYPES,
} from './input-validation';
export type {
  InputValidationResult,
  SanitizationResult,
  PayloadCategory,
} from './input-validation';

// Request ID
export {
  generateRequestId,
  resolveRequestId,
  isValidRequestId,
  REQUEST_ID_HEADER,
} from './request-id';

// Security Headers
export {
  getSecurityHeaders,
  API_VERSION_PREFIX,
  isVersionedApiPath,
} from './headers';
