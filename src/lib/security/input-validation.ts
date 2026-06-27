/**
 * Input validation middleware utilities.
 *
 * Enforces:
 * - Maximum payload sizes per endpoint category
 * - Content-Type enforcement for request bodies
 * - SQL injection pattern detection
 * - XSS payload detection
 * - Field length validation
 *
 * Requirements: 34.3, 34.4
 */

/** Maximum payload sizes in bytes */
export const PAYLOAD_LIMITS = {
  /** Default max for standard API requests (1MB) */
  default: 1 * 1024 * 1024,
  /** Max for file upload endpoints (10MB) */
  fileUpload: 10 * 1024 * 1024,
  /** Max for AI chat messages (50KB — per requirement 29.7) */
  aiChat: 50 * 1024,
  /** Max for authentication endpoints (8KB) */
  auth: 8 * 1024,
  /** Max for webhook payloads (512KB) */
  webhook: 512 * 1024,
} as const;

/** Allowed content types for request bodies */
export const ALLOWED_CONTENT_TYPES = [
  'application/json',
  'multipart/form-data',
  'application/x-www-form-urlencoded',
] as const;

export type PayloadCategory = keyof typeof PAYLOAD_LIMITS;

export interface InputValidationResult {
  valid: boolean;
  reason?: string;
  /** HTTP status code to return (400, 413, 415) */
  statusCode?: number;
}

/**
 * Determines the payload size category for a given path.
 */
export function getPayloadCategory(pathname: string): PayloadCategory {
  if (pathname.includes('/upload') || pathname.includes('/photos')) {
    return 'fileUpload';
  }
  if (pathname.startsWith('/api/v1/ai/')) {
    return 'aiChat';
  }
  if (pathname.startsWith('/api/v1/auth/')) {
    return 'auth';
  }
  if (pathname.includes('/webhook')) {
    return 'webhook';
  }
  return 'default';
}

/**
 * Validates the Content-Type header for requests with bodies.
 * Only applies to methods that typically have request bodies.
 */
export function validateContentType(
  contentType: string | null,
  method: string
): InputValidationResult {
  const methodsWithBody = new Set(['POST', 'PUT', 'PATCH']);
  if (!methodsWithBody.has(method.toUpperCase())) {
    return { valid: true };
  }

  if (!contentType) {
    return {
      valid: false,
      reason: 'Content-Type header is required for request bodies',
      statusCode: 415,
    };
  }

  // Extract the media type (ignore charset and boundary parameters)
  const mediaType = contentType.split(';')[0].trim().toLowerCase();

  const isAllowed = ALLOWED_CONTENT_TYPES.some((allowed) => mediaType === allowed);
  if (!isAllowed) {
    return {
      valid: false,
      reason: `Unsupported Content-Type: ${mediaType}. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      statusCode: 415,
    };
  }

  return { valid: true };
}

/**
 * Validates the payload size against the limit for the endpoint category.
 */
export function validatePayloadSize(
  contentLength: number | null,
  pathname: string
): InputValidationResult {
  if (contentLength === null || contentLength === 0) {
    return { valid: true };
  }

  const category = getPayloadCategory(pathname);
  const limit = PAYLOAD_LIMITS[category];

  if (contentLength > limit) {
    return {
      valid: false,
      reason: `Payload too large. Maximum allowed: ${formatBytes(limit)}, received: ${formatBytes(contentLength)}`,
      statusCode: 413,
    };
  }

  return { valid: true };
}

// ─── Injection Detection ────────────────────────────────────────

/**
 * Common SQL injection patterns.
 * These patterns detect common attack vectors in user input.
 */
const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|UNION)\b\s+)/i,
  /(['";]\s*--)/,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(;\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s)/i,
  /(\bUNION\s+(ALL\s+)?SELECT\b)/i,
  /(\/\*[\s\S]*?\*\/)/,
  /(\bSLEEP\s*\()/i,
  /(\bBENCHMARK\s*\()/i,
  /(\bWAITFOR\s+DELAY\b)/i,
  /(\bLOAD_FILE\s*\()/i,
  /(\bINTO\s+(OUT|DUMP)FILE\b)/i,
];

/**
 * Common XSS patterns.
 */
const XSS_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=\s*["']/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<svg[\s>].*?on\w+/i,
  /data\s*:\s*text\/html/i,
  /expression\s*\(/i,
  /vbscript\s*:/i,
];

export interface SanitizationResult {
  safe: boolean;
  threats: string[];
}

/**
 * Checks a string value for SQL injection patterns.
 */
export function detectSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Checks a string value for XSS patterns.
 */
export function detectXss(value: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Scans an input value (string or object) for injection threats.
 * Recursively checks all string values in objects and arrays.
 */
export function scanForThreats(input: unknown): SanitizationResult {
  const threats: string[] = [];

  function scan(value: unknown, path: string): void {
    if (typeof value === 'string') {
      if (detectSqlInjection(value)) {
        threats.push(`SQL injection detected at ${path}`);
      }
      if (detectXss(value)) {
        threats.push(`XSS payload detected at ${path}`);
      }
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        scan(value[i], `${path}[${i}]`);
      }
    } else if (value !== null && typeof value === 'object') {
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        scan(val, path ? `${path}.${key}` : key);
      }
    }
  }

  scan(input, '');

  return {
    safe: threats.length === 0,
    threats,
  };
}

/**
 * Validates that a string does not exceed the given max length.
 */
export function validateFieldLength(
  value: string,
  maxLength: number,
  fieldName: string
): InputValidationResult {
  if (value.length > maxLength) {
    return {
      valid: false,
      reason: `Field '${fieldName}' exceeds maximum length of ${maxLength} characters`,
      statusCode: 400,
    };
  }
  return { valid: true };
}

/**
 * Validates a complete request body: content-type, size, and threat scanning.
 */
export function validateRequest(params: {
  pathname: string;
  method: string;
  contentType: string | null;
  contentLength: number | null;
  body?: unknown;
}): InputValidationResult {
  // 1. Content-Type check
  const ctResult = validateContentType(params.contentType, params.method);
  if (!ctResult.valid) return ctResult;

  // 2. Payload size check
  const sizeResult = validatePayloadSize(params.contentLength, params.pathname);
  if (!sizeResult.valid) return sizeResult;

  // 3. Threat scanning (if body provided)
  if (params.body !== undefined && params.body !== null) {
    const threatResult = scanForThreats(params.body);
    if (!threatResult.safe) {
      return {
        valid: false,
        reason: `Malicious input detected: ${threatResult.threats[0]}`,
        statusCode: 400,
      };
    }
  }

  return { valid: true };
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
