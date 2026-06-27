/**
 * End-to-end flow tests for event bus emit and subscribe patterns.
 *
 * Validates: Requirements 1.4, 34.1
 *
 * Tests the complete lifecycle: emit → subscribe → handler invocation → acknowledge,
 * with property-based testing for event envelope invariants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock ioredis to avoid loading the full module
vi.mock('ioredis', () => ({ default: vi.fn() }));

import { EventBus } from './event-bus';
import { STREAMS } from './streams';
import type { PlatformEvent } from './types';

/** Arbitrary for generating valid PlatformEvent objects. */
const platformEventArb = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom(
    'booking.created',
    'booking.updated',
    'payment.completed',
    'staff.assigned',
    'maintenance.reported'
  ),
  version: fc.integer({ min: 1, max: 10 }),
  timestamp: fc.integer({ min: 1704067200000, max: 1767139200000 })
    .map((ms) => new Date(ms).toISOString()),
  source: fc.constantFrom('bookings', 'channels', 'payments', 'staff', 'maintenance'),
  tenantId: fc.uuid(),
  correlationId: fc.uuid(),
  actor: fc.record({
    userId: fc.uuid(),
    role: fc.constantFrom('Agency_Admin', 'Villa_Owner', 'Employee', 'Guest'),
  }),
  payload: fc.record({
    key: fc.string({ minLength: 1, maxLength: 20 }),
    value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
  }),
  metadata: fc.record({
    retryCount: fc.integer({ min: 0, max: 5 }),
    maxRetries: fc.integer({ min: 1, max: 10 }),
    priority: fc.constantFrom('critical', 'high', 'normal', 'low'),
  }),
}) as fc.Arbitrary<PlatformEvent>;

/** Create a mock Redis client. */
function createMockRedis() {
  return {
    xadd: vi.fn().mockResolvedValue('1700000000000-0'),
    xack: vi.fn().mockResolvedValue(1),
    xgroup: vi.fn().mockResolvedValue('OK'),
    xreadgroup: vi.fn().mockImplementation(() => new Promise(() => {})),
    xautoclaim: vi.fn().mockResolvedValue(['0-0', [], []]),
    xpending: vi.fn().mockResolvedValue([0, null, null, null]),
  };
}

describe('Event bus emit → subscribe flow', () => {
  let bus: EventBus;
  let mockPublisher: ReturnType<typeof createMockRedis>;
  let mockSubscriber: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockPublisher = createMockRedis();
    mockSubscriber = createMockRedis();
    bus = new EventBus({
      publisher: mockPublisher as any,
      subscriber: mockSubscriber as any,
    });
  });

  /**
   * Validates: Requirements 1.4
   * Property: Any valid PlatformEvent can be emitted without errors.
   */
  it('property: all valid events can be emitted successfully', async () => {
    await fc.assert(
      fc.asyncProperty(platformEventArb, async (event) => {
        const messageId = await bus.emit(STREAMS.BOOKINGS, event);
        expect(messageId).toBe('1700000000000-0');
        expect(mockPublisher.xadd).toHaveBeenCalled();
        mockPublisher.xadd.mockClear();
      }),
      { numRuns: 30 }
    );
  });

  /**
   * Validates: Requirements 1.4
   * Property: Emitted events are serialized faithfully (round-trip integrity).
   */
  it('property: event data is serialized faithfully to Redis', async () => {
    await fc.assert(
      fc.asyncProperty(platformEventArb, async (event) => {
        await bus.emit(STREAMS.BOOKINGS, event);

        const serializedData = mockPublisher.xadd.mock.calls[0][3];
        const parsed = JSON.parse(serializedData);

        expect(parsed.id).toBe(event.id);
        expect(parsed.type).toBe(event.type);
        expect(parsed.tenantId).toBe(event.tenantId);
        expect(parsed.actor.userId).toBe(event.actor.userId);
        expect(parsed.metadata.priority).toBe(event.metadata.priority);

        mockPublisher.xadd.mockClear();
      }),
      { numRuns: 30 }
    );
  });

  /**
   * Validates: Requirements 1.4
   * Property: Events emitted to different streams use the correct stream name.
   */
  it('property: events are routed to the correct stream', async () => {
    const streamArb = fc.constantFrom(
      STREAMS.BOOKINGS,
      STREAMS.PAYMENTS,
      STREAMS.NOTIFICATIONS,
      STREAMS.STAFF,
      STREAMS.MAINTENANCE
    );

    await fc.assert(
      fc.asyncProperty(streamArb, platformEventArb, async (stream, event) => {
        await bus.emit(stream, event);

        const usedStream = mockPublisher.xadd.mock.calls[0][0];
        expect(usedStream).toBe(stream);

        mockPublisher.xadd.mockClear();
      }),
      { numRuns: 30 }
    );
  });

  it('handler receives deserialized event with correct metadata', async () => {
    const event: PlatformEvent = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'booking.created',
      version: 1,
      timestamp: '2024-06-15T10:30:00.000Z',
      source: 'bookings',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
      correlationId: '770e8400-e29b-41d4-a716-446655440002',
      actor: { userId: '880e8400-e29b-41d4-a716-446655440003', role: 'Agency_Admin' },
      payload: { bookingId: 'bk-001', guestName: 'Test Guest' },
      metadata: { retryCount: 0, maxRetries: 3, priority: 'normal' },
    };

    const receivedEvents: PlatformEvent[] = [];
    const handler = vi.fn(async (evt: PlatformEvent) => {
      receivedEvents.push(evt);
    });

    // Simulate XREADGROUP returning one event, then blocking
    mockSubscriber.xreadgroup
      .mockResolvedValueOnce([
        ['stream:bookings', [['msg-flow-1', ['data', JSON.stringify(event)]]]],
      ]);

    const stop = await bus.subscribe(
      STREAMS.BOOKINGS,
      'cg:flow-test',
      'consumer-flow-1',
      handler
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(receivedEvents[0]).toEqual(event);
    expect(receivedEvents[0].payload).toEqual({ bookingId: 'bk-001', guestName: 'Test Guest' });

    // Verify acknowledgment was sent
    expect(mockPublisher.xack).toHaveBeenCalledWith(
      'stream:bookings',
      'cg:flow-test',
      'msg-flow-1'
    );

    stop();
  });

  it('multiple events emitted sequentially are all processed in order', async () => {
    const events: PlatformEvent[] = [
      {
        id: '110e8400-e29b-41d4-a716-446655440001',
        type: 'booking.created',
        version: 1,
        timestamp: '2024-06-15T10:00:00.000Z',
        source: 'bookings',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        correlationId: '770e8400-e29b-41d4-a716-446655440002',
        actor: { userId: '880e8400-e29b-41d4-a716-446655440003', role: 'Agency_Admin' },
        payload: { seq: 1 },
        metadata: { retryCount: 0, maxRetries: 3, priority: 'normal' },
      },
      {
        id: '220e8400-e29b-41d4-a716-446655440002',
        type: 'payment.completed',
        version: 1,
        timestamp: '2024-06-15T10:01:00.000Z',
        source: 'payments',
        tenantId: '660e8400-e29b-41d4-a716-446655440001',
        correlationId: '770e8400-e29b-41d4-a716-446655440002',
        actor: { userId: '880e8400-e29b-41d4-a716-446655440003', role: 'Guest' },
        payload: { seq: 2 },
        metadata: { retryCount: 0, maxRetries: 3, priority: 'high' },
      },
    ];

    const processedOrder: number[] = [];
    const handler = vi.fn(async (evt: PlatformEvent) => {
      processedOrder.push((evt.payload as { seq: number }).seq);
    });

    // Simulate both events arriving in one batch
    mockSubscriber.xreadgroup
      .mockResolvedValueOnce([
        ['stream:bookings', [
          ['msg-1', ['data', JSON.stringify(events[0])]],
          ['msg-2', ['data', JSON.stringify(events[1])]],
        ]],
      ]);

    const stop = await bus.subscribe(
      STREAMS.BOOKINGS,
      'cg:order-test',
      'consumer-order-1',
      handler
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(processedOrder).toEqual([1, 2]);
    expect(mockPublisher.xack).toHaveBeenCalledTimes(2);

    stop();
  });

  it('subscribe handles concurrent subscriptions to different streams', async () => {
    const bookingHandler = vi.fn(async () => {});
    const paymentHandler = vi.fn(async () => {});

    const bookingEvent: PlatformEvent = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      type: 'booking.created',
      version: 1,
      timestamp: '2024-06-15T10:00:00.000Z',
      source: 'bookings',
      tenantId: '660e8400-e29b-41d4-a716-446655440001',
      correlationId: '770e8400-e29b-41d4-a716-446655440002',
      actor: { userId: '880e8400-e29b-41d4-a716-446655440003', role: 'Agency_Admin' },
      payload: { type: 'booking' },
      metadata: { retryCount: 0, maxRetries: 3, priority: 'normal' },
    };

    // First subscribe call gets booking event, second blocks
    let callCount = 0;
    mockSubscriber.xreadgroup.mockImplementation(async (...args: unknown[]) => {
      callCount++;
      if (callCount === 1) {
        return [['stream:bookings', [['msg-b1', ['data', JSON.stringify(bookingEvent)]]]]];
      }
      return new Promise(() => {}); // Block
    });

    const stopBookings = await bus.subscribe(
      STREAMS.BOOKINGS,
      'cg:booking-agent',
      'consumer-1',
      bookingHandler
    );

    const stopPayments = await bus.subscribe(
      STREAMS.PAYMENTS,
      'cg:payment-agent',
      'consumer-2',
      paymentHandler
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(bookingHandler).toHaveBeenCalled();
    expect(bus.isRunning).toBe(true);

    stopBookings();
    stopPayments();
  });
});
