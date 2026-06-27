import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ioredis to avoid loading the full module (prevents OOM in test workers)
vi.mock('ioredis', () => ({ default: vi.fn() }));

import { STREAMS } from './streams';
import { EventValidationError } from './validation';
import type { PlatformEvent } from './types';
import { EventBus } from './event-bus';

/** Helper to create a valid PlatformEvent */
function makeEvent(overrides: Partial<PlatformEvent> = {}): PlatformEvent {
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

/** Create a mock Redis client with the methods used by EventBus */
function createMockRedis() {
  return {
    xadd: vi.fn().mockResolvedValue('1234567890123-0'),
    xack: vi.fn().mockResolvedValue(1),
    xgroup: vi.fn().mockResolvedValue('OK'),
    xreadgroup: vi.fn().mockResolvedValue(null),
    xautoclaim: vi.fn().mockResolvedValue(['0-0', [], []]),
    xpending: vi.fn().mockResolvedValue([0, null, null, null]),
  };
}

describe('EventBus', () => {
  let bus: EventBus;
  let mockPublisher: ReturnType<typeof createMockRedis>;
  let mockSubscriber: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockPublisher = createMockRedis();
    mockSubscriber = createMockRedis();
    // Default: xreadgroup blocks forever (simulates BLOCK behavior)
    mockSubscriber.xreadgroup.mockImplementation(() => new Promise(() => {}));
    bus = new EventBus({
      publisher: mockPublisher as any,
      subscriber: mockSubscriber as any,
    });
  });

  describe('emit()', () => {
    it('publishes a valid event to the specified stream', async () => {
      const event = makeEvent();
      const messageId = await bus.emit(STREAMS.BOOKINGS, event);

      expect(messageId).toBe('1234567890123-0');
      expect(mockPublisher.xadd).toHaveBeenCalledWith(
        'stream:bookings',
        '*',
        'data',
        JSON.stringify(event)
      );
    });

    it('rejects an invalid event with EventValidationError', async () => {
      const invalidEvent = { id: 'not-valid' } as unknown as PlatformEvent;

      await expect(bus.emit(STREAMS.BOOKINGS, invalidEvent)).rejects.toThrow(
        EventValidationError
      );
      expect(mockPublisher.xadd).not.toHaveBeenCalled();
    });

    it('publishes to the correct stream', async () => {
      const event = makeEvent({ type: 'payment.completed', source: 'payments' });
      await bus.emit(STREAMS.PAYMENTS, event);

      expect(mockPublisher.xadd).toHaveBeenCalledWith(
        'stream:payments',
        '*',
        'data',
        expect.any(String)
      );
    });

    it('serializes the event payload as JSON in the data field', async () => {
      const event = makeEvent({ payload: { amount: 150.00, currency: 'USD' } });
      await bus.emit(STREAMS.BOOKINGS, event);

      const serialized = mockPublisher.xadd.mock.calls[0][3];
      const parsed = JSON.parse(serialized);
      expect(parsed.payload).toEqual({ amount: 150.00, currency: 'USD' });
    });

    it('validates the event has the correct metadata priority values', async () => {
      const event = makeEvent();
      (event.metadata as Record<string, unknown>).priority = 'urgent';

      await expect(bus.emit(STREAMS.BOOKINGS, event)).rejects.toThrow(
        EventValidationError
      );
    });
  });

  describe('acknowledge()', () => {
    it('sends XACK for the message', async () => {
      await bus.acknowledge(STREAMS.BOOKINGS, 'cg:booking-agent', '1234567890123-0');

      expect(mockPublisher.xack).toHaveBeenCalledWith(
        'stream:bookings',
        'cg:booking-agent',
        '1234567890123-0'
      );
    });
  });

  describe('ensureConsumerGroup()', () => {
    it('creates a consumer group with MKSTREAM', async () => {
      await bus.ensureConsumerGroup(STREAMS.BOOKINGS, 'cg:booking-agent');

      expect(mockPublisher.xgroup).toHaveBeenCalledWith(
        'CREATE',
        'stream:bookings',
        'cg:booking-agent',
        '0',
        'MKSTREAM'
      );
    });

    it('silently handles BUSYGROUP error (group already exists)', async () => {
      mockPublisher.xgroup.mockRejectedValueOnce(new Error('BUSYGROUP Consumer Group name already exists'));

      await expect(
        bus.ensureConsumerGroup(STREAMS.BOOKINGS, 'cg:booking-agent')
      ).resolves.toBeUndefined();
    });

    it('throws on non-BUSYGROUP errors', async () => {
      mockPublisher.xgroup.mockRejectedValueOnce(new Error('NOPERM no permission'));

      await expect(
        bus.ensureConsumerGroup(STREAMS.BOOKINGS, 'cg:booking-agent')
      ).rejects.toThrow('NOPERM');
    });
  });

  describe('moveToDeadLetterQueue()', () => {
    it('publishes a DLQ entry to the dead letter queue stream', async () => {
      const event = makeEvent({ metadata: { retryCount: 3, maxRetries: 3, priority: 'high' } });

      await bus.moveToDeadLetterQueue(
        event,
        'Exceeded max retries (3)',
        'booking-agent-1',
        'Connection timeout'
      );

      expect(mockPublisher.xadd).toHaveBeenCalledWith(
        'stream:dead-letter-queue',
        '*',
        'data',
        expect.any(String)
      );

      const serialized = mockPublisher.xadd.mock.calls[0][3];
      const dlqEntry = JSON.parse(serialized);
      expect(dlqEntry.originalEvent.id).toBe(event.id);
      expect(dlqEntry.failureReason).toBe('Exceeded max retries (3)');
      expect(dlqEntry.failedAgent).toBe('booking-agent-1');
      expect(dlqEntry.lastError).toBe('Connection timeout');
      expect(dlqEntry.retryAttempts).toBe(3);
      expect(dlqEntry.resolution).toBe('pending');
      expect(dlqEntry.failedAt).toBeDefined();
    });
  });

  describe('subscribe()', () => {
    it('creates the consumer group before starting consumption', async () => {
      const stop = await bus.subscribe(
        STREAMS.BOOKINGS,
        'cg:booking-agent',
        'consumer-1',
        async () => {}
      );

      expect(mockPublisher.xgroup).toHaveBeenCalledWith(
        'CREATE',
        'stream:bookings',
        'cg:booking-agent',
        '0',
        'MKSTREAM'
      );

      stop();
    });

    it('returns a stop function that can be called to terminate subscription', async () => {
      const stop = await bus.subscribe(
        STREAMS.BOOKINGS,
        'cg:booking-agent',
        'consumer-1',
        async () => {}
      );

      expect(typeof stop).toBe('function');
      stop();
    });

    it('processes events from XREADGROUP and acknowledges them', async () => {
      const event = makeEvent();
      const handler = vi.fn().mockResolvedValue(undefined);

      // Simulate one message, then block indefinitely (simulating BLOCK behavior)
      mockSubscriber.xreadgroup
        .mockResolvedValueOnce([
          ['stream:bookings', [['1234567890123-0', ['data', JSON.stringify(event)]]]],
        ]);
      // After first call, it goes back to default (blocks forever)

      const stop = await bus.subscribe(
        STREAMS.BOOKINGS,
        'cg:booking-agent',
        'consumer-1',
        handler
      );

      // Give the consume loop time to process
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalledWith(event, {
        messageId: '1234567890123-0',
        stream: 'stream:bookings',
      });
      expect(mockPublisher.xack).toHaveBeenCalledWith(
        'stream:bookings',
        'cg:booking-agent',
        '1234567890123-0'
      );

      stop();
    });

    it('moves event to DLQ when handler fails and max retries exceeded', async () => {
      const event = makeEvent({ metadata: { retryCount: 2, maxRetries: 3, priority: 'normal' } });
      const handler = vi.fn().mockRejectedValue(new Error('Processing failed'));

      mockSubscriber.xreadgroup
        .mockResolvedValueOnce([
          ['stream:bookings', [['msg-001', ['data', JSON.stringify(event)]]]],
        ]);
      // After first call, goes back to default (blocks forever)

      const stop = await bus.subscribe(
        STREAMS.BOOKINGS,
        'cg:booking-agent',
        'consumer-1',
        handler
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // retryCount (2) + 1 = 3 >= maxRetries (3), so it should go to DLQ
      expect(mockPublisher.xadd).toHaveBeenCalledWith(
        'stream:dead-letter-queue',
        '*',
        'data',
        expect.any(String)
      );

      // Original message should be acknowledged (removed from PEL)
      expect(mockPublisher.xack).toHaveBeenCalledWith(
        'stream:bookings',
        'cg:booking-agent',
        'msg-001'
      );

      stop();
    });

    it('leaves message pending when retries not yet exhausted', async () => {
      const event = makeEvent({ metadata: { retryCount: 0, maxRetries: 3, priority: 'normal' } });
      const handler = vi.fn().mockRejectedValue(new Error('Transient failure'));

      mockSubscriber.xreadgroup
        .mockResolvedValueOnce([
          ['stream:bookings', [['msg-002', ['data', JSON.stringify(event)]]]],
        ]);
      // After first call, goes back to default (blocks forever)

      const stop = await bus.subscribe(
        STREAMS.BOOKINGS,
        'cg:booking-agent',
        'consumer-1',
        handler
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // retryCount (0) + 1 = 1 < maxRetries (3), should NOT go to DLQ
      // Should NOT acknowledge (leave in PEL for retry)
      expect(mockPublisher.xadd).not.toHaveBeenCalled();
      expect(mockPublisher.xack).not.toHaveBeenCalled();

      stop();
    });

    it('acknowledges and skips corrupt messages that cannot be deserialized', async () => {
      mockSubscriber.xreadgroup
        .mockResolvedValueOnce([
          ['stream:bookings', [['msg-003', ['data', '{invalid json///']]]],
        ]);
      // After first call, goes back to default (blocks forever)

      const handler = vi.fn();

      const stop = await bus.subscribe(
        STREAMS.BOOKINGS,
        'cg:booking-agent',
        'consumer-1',
        handler
      );

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Handler should not be called for corrupt messages
      expect(handler).not.toHaveBeenCalled();
      // But the message should be acknowledged to avoid reprocessing
      expect(mockPublisher.xack).toHaveBeenCalledWith(
        'stream:bookings',
        'cg:booking-agent',
        'msg-003'
      );

      stop();
    });
  });

  describe('claimPendingMessages()', () => {
    it('calls XAUTOCLAIM with correct parameters', async () => {
      mockPublisher.xautoclaim.mockResolvedValueOnce([
        '0-0',
        [['msg-100', ['data', '{}']], ['msg-101', ['data', '{}']]],
        [],
      ]);

      const claimed = await bus.claimPendingMessages(
        STREAMS.BOOKINGS,
        'cg:booking-agent',
        'consumer-2',
        60000,
        5
      );

      expect(mockPublisher.xautoclaim).toHaveBeenCalledWith(
        'stream:bookings',
        'cg:booking-agent',
        'consumer-2',
        60000,
        '0-0',
        'COUNT',
        5
      );
      expect(claimed).toEqual(['msg-100', 'msg-101']);
    });

    it('returns empty array when no messages to claim', async () => {
      mockPublisher.xautoclaim.mockResolvedValueOnce(['0-0', [], []]);

      const claimed = await bus.claimPendingMessages(
        STREAMS.BOOKINGS,
        'cg:booking-agent',
        'consumer-2',
        60000,
        5
      );

      expect(claimed).toEqual([]);
    });
  });

  describe('getPendingCount()', () => {
    it('returns the number of pending messages', async () => {
      mockPublisher.xpending.mockResolvedValueOnce([42, '1-0', '100-0', [['consumer-1', '42']]]);

      const count = await bus.getPendingCount(STREAMS.BOOKINGS, 'cg:booking-agent');
      expect(count).toBe(42);
    });

    it('returns 0 when no pending messages', async () => {
      mockPublisher.xpending.mockResolvedValueOnce([0, null, null, null]);

      const count = await bus.getPendingCount(STREAMS.BOOKINGS, 'cg:booking-agent');
      expect(count).toBe(0);
    });
  });

  describe('shutdown()', () => {
    it('stops all active subscriptions', async () => {
      const handler = vi.fn();

      await bus.subscribe(STREAMS.BOOKINGS, 'cg:agent-1', 'c1', handler);
      await bus.subscribe(STREAMS.PAYMENTS, 'cg:agent-2', 'c2', handler);

      expect(bus.isRunning).toBe(true);

      await bus.shutdown();

      expect(bus.isRunning).toBe(false);
    });
  });
});
