import { describe, it, expect } from 'vitest';
import { validateEvent, assertValidEvent, EventValidationError } from './validation';
import type { PlatformEvent } from './types';

/** Helper to create a valid event for testing. */
function makeValidEvent(overrides: Partial<PlatformEvent> = {}): PlatformEvent {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'booking.created',
    version: 1,
    timestamp: '2024-01-15T10:30:00.000Z',
    source: 'bookings',
    tenantId: '660e8400-e29b-41d4-a716-446655440001',
    correlationId: '770e8400-e29b-41d4-a716-446655440002',
    actor: {
      userId: '880e8400-e29b-41d4-a716-446655440003',
      role: 'Agency_Admin',
    },
    payload: { bookingId: 'abc123' },
    metadata: {
      retryCount: 0,
      maxRetries: 3,
      priority: 'normal',
    },
    ...overrides,
  };
}

describe('validateEvent', () => {
  it('returns valid for a well-formed event', () => {
    const result = validateEvent(makeValidEvent());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null input', () => {
    const result = validateEvent(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0].field).toBe('root');
  });

  it('rejects non-object input', () => {
    const result = validateEvent('not an object');
    expect(result.valid).toBe(false);
  });

  it('rejects invalid id (not UUID)', () => {
    const result = validateEvent(makeValidEvent({ id: 'not-a-uuid' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'id')).toBe(true);
  });

  it('rejects invalid event type format', () => {
    const result = validateEvent(makeValidEvent({ type: 'InvalidType' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'type')).toBe(true);
  });

  it('accepts multi-segment event types', () => {
    const result = validateEvent(makeValidEvent({ type: 'booking.status.updated' }));
    expect(result.valid).toBe(true);
  });

  it('rejects version of 0', () => {
    const result = validateEvent(makeValidEvent({ version: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'version')).toBe(true);
  });

  it('rejects non-integer version', () => {
    const result = validateEvent(makeValidEvent({ version: 1.5 }));
    expect(result.valid).toBe(false);
  });

  it('rejects invalid timestamp', () => {
    const result = validateEvent(makeValidEvent({ timestamp: 'not-a-date' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'timestamp')).toBe(true);
  });

  it('rejects empty source', () => {
    const result = validateEvent(makeValidEvent({ source: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'source')).toBe(true);
  });

  it('rejects invalid tenantId', () => {
    const result = validateEvent(makeValidEvent({ tenantId: 'bad' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'tenantId')).toBe(true);
  });

  it('rejects invalid correlationId', () => {
    const result = validateEvent(makeValidEvent({ correlationId: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'correlationId')).toBe(true);
  });

  it('allows undefined causationId', () => {
    const event = makeValidEvent();
    delete event.causationId;
    const result = validateEvent(event);
    expect(result.valid).toBe(true);
  });

  it('rejects invalid causationId when provided', () => {
    const result = validateEvent(makeValidEvent({ causationId: 'bad-uuid' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'causationId')).toBe(true);
  });

  it('rejects missing actor', () => {
    const event = makeValidEvent();
    (event as unknown as Record<string, unknown>).actor = null;
    const result = validateEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'actor')).toBe(true);
  });

  it('rejects actor with invalid userId', () => {
    const result = validateEvent(
      makeValidEvent({ actor: { userId: 'not-uuid', role: 'Admin' } })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'actor.userId')).toBe(true);
  });

  it('rejects actor with empty role', () => {
    const result = validateEvent(
      makeValidEvent({
        actor: { userId: '880e8400-e29b-41d4-a716-446655440003', role: '' },
      })
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'actor.role')).toBe(true);
  });

  it('rejects invalid priority', () => {
    const event = makeValidEvent();
    (event.metadata as Record<string, unknown>).priority = 'urgent';
    const result = validateEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'metadata.priority')).toBe(true);
  });

  it('rejects negative retryCount', () => {
    const event = makeValidEvent();
    event.metadata.retryCount = -1;
    const result = validateEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'metadata.retryCount')).toBe(true);
  });

  it('collects multiple errors at once', () => {
    const result = validateEvent({
      id: 'bad',
      type: 'BAD',
      version: -1,
      timestamp: 'nope',
      source: '',
      tenantId: 'x',
      correlationId: 'y',
      actor: null,
      metadata: { retryCount: -1, maxRetries: -1, priority: 'unknown' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(5);
  });
});

describe('assertValidEvent', () => {
  it('does not throw for a valid event', () => {
    expect(() => assertValidEvent(makeValidEvent())).not.toThrow();
  });

  it('throws EventValidationError for invalid event', () => {
    expect(() => assertValidEvent({ id: 'bad' })).toThrow(EventValidationError);
  });

  it('includes validation errors in the thrown error', () => {
    try {
      assertValidEvent({ id: 'bad' });
    } catch (err) {
      expect(err).toBeInstanceOf(EventValidationError);
      expect((err as EventValidationError).errors.length).toBeGreaterThan(0);
    }
  });
});
