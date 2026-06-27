/**
 * Request ID generation for distributed tracing.
 *
 * Generates unique request IDs attached to every incoming request.
 * These flow through the entire request lifecycle for correlation
 * in logs, audit trails, and debugging.
 *
 * Requirements: 34.1, 34.2
 */

import { randomBytes } from 'crypto';

/** Header name for the request ID */
export const REQUEST_ID_HEADER = 'x-request-id';

/** Prefix for internally-generated request IDs */
const REQUEST_ID_PREFIX = 'req_';

/** Length of the random portion in bytes (16 bytes = 32 hex chars) */
const RANDOM_BYTES_LENGTH = 16;

/** Max length for externally-provided request IDs */
const MAX_EXTERNAL_ID_LENGTH = 128;

/** Pattern to validate externally-provided request IDs */
const VALID_REQUEST_ID_PATTERN = /^[a-zA-Z0-9_\-:.]+$/;

/**
 * Generates a new unique request ID.
 *
 * Format: req_{timestamp_hex}_{random_hex}
 * This provides chronological sortability and uniqueness.
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(16);
  const random = randomBytes(RANDOM_BYTES_LENGTH).toString('hex');
  return `${REQUEST_ID_PREFIX}${timestamp}_${random}`;
}

/**
 * Resolves the request ID for a given request.
 *
 * If the request already has a valid X-Request-ID header (e.g., from
 * a load balancer or upstream proxy), it is preserved. Otherwise,
 * a new one is generated.
 *
 * @param existingId - The request ID from the incoming request header, if any.
 * @returns A valid request ID (either existing or newly generated).
 */
export function resolveRequestId(existingId: string | null | undefined): string {
  if (existingId && isValidRequestId(existingId)) {
    return existingId;
  }
  return generateRequestId();
}

/**
 * Validates an externally-provided request ID.
 *
 * Requirements:
 * - Must not exceed max length
 * - Must contain only safe characters (alphanumeric, hyphens, underscores, colons, dots)
 * - Must not be empty
 */
export function isValidRequestId(id: string): boolean {
  if (!id || id.length === 0) return false;
  if (id.length > MAX_EXTERNAL_ID_LENGTH) return false;
  return VALID_REQUEST_ID_PATTERN.test(id);
}
