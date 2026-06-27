/**
 * Event envelope schema validation.
 *
 * Validates that a PlatformEvent has all required fields
 * and correct structure before publishing to a stream.
 */

import type { PlatformEvent } from './types';

/** Validation error with field-level detail. */
export interface ValidationError {
  field: string;
  message: string;
}

/** Result of event envelope validation. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_TYPE_REGEX = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

const VALID_PRIORITIES = ['critical', 'high', 'normal', 'low'] as const;

/**
 * Validates a PlatformEvent envelope structure.
 *
 * Checks all required fields, types, and format constraints.
 * Returns a ValidationResult with any errors found.
 */
export function validateEvent(event: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!event || typeof event !== 'object') {
    return { valid: false, errors: [{ field: 'root', message: 'Event must be a non-null object' }] };
  }

  const e = event as Record<string, unknown>;

  // id: UUID v4
  if (typeof e.id !== 'string' || !UUID_REGEX.test(e.id)) {
    errors.push({ field: 'id', message: 'Must be a valid UUID' });
  }

  // type: dot-notation event type
  if (typeof e.type !== 'string' || !EVENT_TYPE_REGEX.test(e.type)) {
    errors.push({ field: 'type', message: 'Must be a dot-notation event type (e.g., "booking.created")' });
  }

  // version: positive integer
  if (typeof e.version !== 'number' || !Number.isInteger(e.version) || e.version < 1) {
    errors.push({ field: 'version', message: 'Must be a positive integer' });
  }

  // timestamp: ISO 8601 string
  if (typeof e.timestamp !== 'string' || isNaN(Date.parse(e.timestamp))) {
    errors.push({ field: 'timestamp', message: 'Must be a valid ISO 8601 timestamp' });
  }

  // source: non-empty string
  if (typeof e.source !== 'string' || e.source.trim().length === 0) {
    errors.push({ field: 'source', message: 'Must be a non-empty string' });
  }

  // tenantId: UUID
  if (typeof e.tenantId !== 'string' || !UUID_REGEX.test(e.tenantId)) {
    errors.push({ field: 'tenantId', message: 'Must be a valid UUID' });
  }

  // correlationId: UUID
  if (typeof e.correlationId !== 'string' || !UUID_REGEX.test(e.correlationId)) {
    errors.push({ field: 'correlationId', message: 'Must be a valid UUID' });
  }

  // causationId: optional UUID
  if (e.causationId !== undefined && e.causationId !== null) {
    if (typeof e.causationId !== 'string' || !UUID_REGEX.test(e.causationId)) {
      errors.push({ field: 'causationId', message: 'Must be a valid UUID when provided' });
    }
  }

  // actor: { userId, role }
  if (!e.actor || typeof e.actor !== 'object') {
    errors.push({ field: 'actor', message: 'Must be an object with userId and role' });
  } else {
    const actor = e.actor as Record<string, unknown>;
    if (typeof actor.userId !== 'string' || !UUID_REGEX.test(actor.userId)) {
      errors.push({ field: 'actor.userId', message: 'Must be a valid UUID' });
    }
    if (typeof actor.role !== 'string' || actor.role.trim().length === 0) {
      errors.push({ field: 'actor.role', message: 'Must be a non-empty string' });
    }
  }

  // payload: must exist (can be any value including null for some events)
  if (!('payload' in e)) {
    errors.push({ field: 'payload', message: 'Must be present' });
  }

  // metadata: { retryCount, maxRetries, priority }
  if (!e.metadata || typeof e.metadata !== 'object') {
    errors.push({ field: 'metadata', message: 'Must be an object with retryCount, maxRetries, and priority' });
  } else {
    const meta = e.metadata as Record<string, unknown>;
    if (typeof meta.retryCount !== 'number' || !Number.isInteger(meta.retryCount) || meta.retryCount < 0) {
      errors.push({ field: 'metadata.retryCount', message: 'Must be a non-negative integer' });
    }
    if (typeof meta.maxRetries !== 'number' || !Number.isInteger(meta.maxRetries) || meta.maxRetries < 0) {
      errors.push({ field: 'metadata.maxRetries', message: 'Must be a non-negative integer' });
    }
    if (typeof meta.priority !== 'string' || !(VALID_PRIORITIES as readonly string[]).includes(meta.priority)) {
      errors.push({ field: 'metadata.priority', message: 'Must be one of: critical, high, normal, low' });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Asserts that an event is valid, throwing if not.
 * Use this in emit() to prevent invalid events from entering streams.
 */
export function assertValidEvent(event: unknown): asserts event is PlatformEvent {
  const result = validateEvent(event);
  if (!result.valid) {
    const details = result.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    throw new EventValidationError(`Invalid event envelope: ${details}`, result.errors);
  }
}

/** Custom error class for event validation failures. */
export class EventValidationError extends Error {
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[]) {
    super(message);
    this.name = 'EventValidationError';
    this.errors = errors;
  }
}
