/**
 * Redis Streams Event Bus.
 *
 * Provides at-least-once delivery with consumer group semantics,
 * dead letter queue handling, and event acknowledgment.
 *
 * Key features:
 * - emit(): Publish a validated PlatformEvent to a stream
 * - subscribe(): Consume events with consumer group semantics
 * - Consumer group creation/management
 * - Event acknowledgment (XACK)
 * - Dead letter queue: move events to DLQ after max retries exceeded
 */

import type Redis from 'ioredis';
import type { PlatformEvent } from './types';
import { STREAMS, type StreamName } from './streams';
import { assertValidEvent, EventValidationError } from './validation';

/** Handler function invoked when an event is received from a stream. */
export type EventHandler<T = unknown> = (
  event: PlatformEvent<T>,
  metadata: EventMetadata
) => Promise<void>;

/** Metadata about the consumed event from Redis. */
export interface EventMetadata {
  /** Redis Stream message ID (e.g., "1234567890123-0") */
  messageId: string;
  /** Stream the event was consumed from */
  stream: StreamName;
}

/** Options for subscribing to a stream. */
export interface SubscribeOptions {
  /** Number of events to read per batch. Default: 10 */
  batchSize?: number;
  /** Block timeout in milliseconds waiting for new events. Default: 5000 */
  blockMs?: number;
  /** Whether to start reading from the beginning ("0") or only new messages (">"). Default: ">" */
  startId?: string;
}

/** Entry stored in the dead letter queue. */
export interface DeadLetterEntry {
  originalEvent: PlatformEvent;
  failedAt: string;
  failureReason: string;
  failedAgent: string;
  retryAttempts: number;
  lastError: string;
  resolution: 'pending' | 'manual_retry' | 'discarded' | 'resolved';
}

/** Options for creating an EventBus instance. */
export interface EventBusOptions {
  /** Redis client for publishing (commands). */
  publisher: Redis;
  /** Redis client for consuming (blocking reads need a dedicated connection). */
  subscriber: Redis;
}

/**
 * Redis Streams-backed event bus.
 *
 * Provides persistent, replayable event delivery with consumer group
 * semantics, at-least-once delivery guarantees, and dead letter queue handling.
 */
export class EventBus {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;
  private running = false;
  private subscriptionAbortControllers: AbortController[] = [];

  constructor(options: EventBusOptions) {
    this.publisher = options.publisher;
    this.subscriber = options.subscriber;
  }

  /**
   * Publish a PlatformEvent to the specified stream.
   *
   * Validates the event envelope before publishing. The event is serialized
   * as a single "data" field in the Redis Stream message.
   *
   * @param stream - Target stream name
   * @param event - The event to publish (must conform to PlatformEvent schema)
   * @returns The Redis Stream message ID assigned to the event
   * @throws EventValidationError if the event envelope is invalid
   */
  async emit(stream: StreamName, event: PlatformEvent): Promise<string> {
    assertValidEvent(event);

    const messageId = await this.publisher.xadd(
      stream,
      '*', // auto-generate message ID
      'data',
      JSON.stringify(event)
    );

    if (!messageId) {
      throw new Error(`Failed to emit event to stream ${stream}: no message ID returned`);
    }

    return messageId;
  }

  /**
   * Subscribe to events on a stream using consumer group semantics.
   *
   * Creates the consumer group if it doesn't exist. Events are processed
   * by the handler and must be explicitly acknowledged. If processing fails
   * and retries are exhausted, the event is moved to the dead letter queue.
   *
   * @param stream - Stream to consume from
   * @param consumerGroup - Consumer group name (e.g., "cg:booking-agent")
   * @param consumerName - Unique consumer name within the group
   * @param handler - Async function to process each event
   * @param options - Subscription options (batchSize, blockMs, startId)
   * @returns A stop function that gracefully terminates the subscription
   */
  async subscribe<T = unknown>(
    stream: StreamName,
    consumerGroup: string,
    consumerName: string,
    handler: EventHandler<T>,
    options: SubscribeOptions = {}
  ): Promise<() => void> {
    const { batchSize = 10, blockMs = 5000, startId = '>' } = options;

    // Ensure the consumer group exists
    await this.ensureConsumerGroup(stream, consumerGroup);

    const abortController = new AbortController();
    this.subscriptionAbortControllers.push(abortController);
    this.running = true;

    // Start the consumption loop (non-blocking — runs in background)
    const consumeLoop = this.consumeLoop<T>(
      stream,
      consumerGroup,
      consumerName,
      handler,
      batchSize,
      blockMs,
      startId,
      abortController.signal
    );

    // Return a stop function
    const stop = () => {
      abortController.abort();
      const idx = this.subscriptionAbortControllers.indexOf(abortController);
      if (idx >= 0) this.subscriptionAbortControllers.splice(idx, 1);
    };

    // Keep the consume loop reference so it doesn't get GC'd
    consumeLoop.catch(() => {
      // Swallow errors from aborted loops
    });

    return stop;
  }

  /**
   * Acknowledge successful processing of an event.
   *
   * Removes the message from the consumer's pending entries list (PEL).
   */
  async acknowledge(
    stream: StreamName,
    consumerGroup: string,
    messageId: string
  ): Promise<void> {
    await this.publisher.xack(stream, consumerGroup, messageId);
  }

  /**
   * Move a failed event to the dead letter queue.
   *
   * Called when an event has exceeded its maximum retry count.
   * The original event plus failure metadata is stored in the DLQ stream.
   */
  async moveToDeadLetterQueue(
    event: PlatformEvent,
    failureReason: string,
    failedAgent: string,
    lastError: string
  ): Promise<string> {
    const dlqEntry: DeadLetterEntry = {
      originalEvent: event,
      failedAt: new Date().toISOString(),
      failureReason,
      failedAgent,
      retryAttempts: event.metadata.retryCount,
      lastError,
      resolution: 'pending',
    };

    const messageId = await this.publisher.xadd(
      STREAMS.DEAD_LETTER_QUEUE,
      '*',
      'data',
      JSON.stringify(dlqEntry)
    );

    if (!messageId) {
      throw new Error('Failed to write to dead letter queue: no message ID returned');
    }

    return messageId;
  }

  /**
   * Ensure a consumer group exists for a stream.
   *
   * Creates the group starting from the beginning of the stream ("0").
   * If the group already exists, the BUSYGROUP error is silently ignored.
   */
  async ensureConsumerGroup(
    stream: StreamName,
    consumerGroup: string
  ): Promise<void> {
    try {
      await this.publisher.xgroup('CREATE', stream, consumerGroup, '0', 'MKSTREAM');
    } catch (err: unknown) {
      // BUSYGROUP means the group already exists — that's fine
      if (err instanceof Error && err.message.includes('BUSYGROUP')) {
        return;
      }
      throw err;
    }
  }

  /**
   * Claim pending messages that have been idle too long (stuck consumers).
   *
   * Useful for recovering events from consumers that crashed mid-processing.
   *
   * @param stream - Stream to claim from
   * @param consumerGroup - Consumer group
   * @param consumerName - Consumer to claim messages for
   * @param minIdleMs - Minimum idle time in ms before a message can be claimed
   * @param count - Maximum number of messages to claim
   * @returns Array of claimed message IDs
   */
  async claimPendingMessages(
    stream: StreamName,
    consumerGroup: string,
    consumerName: string,
    minIdleMs: number,
    count: number
  ): Promise<string[]> {
    // XAUTOCLAIM automatically claims messages idle longer than minIdleMs
    const result = await this.publisher.xautoclaim(
      stream,
      consumerGroup,
      consumerName,
      minIdleMs,
      '0-0',
      'COUNT',
      count
    );

    // result format: [nextStartId, [[id, fields], ...], deletedIds]
    if (!Array.isArray(result) || !Array.isArray(result[1])) {
      return [];
    }

    return (result[1] as Array<[string, string[]]>).map(([id]) => id);
  }

  /**
   * Get information about pending messages in a consumer group.
   *
   * @returns Number of pending messages (entries in the PEL)
   */
  async getPendingCount(
    stream: StreamName,
    consumerGroup: string
  ): Promise<number> {
    const info = await this.publisher.xpending(stream, consumerGroup);
    // XPENDING summary: [count, smallestId, largestId, [[consumer, count], ...]]
    if (Array.isArray(info) && typeof info[0] === 'number') {
      return info[0];
    }
    return 0;
  }

  /**
   * Stop all active subscriptions gracefully.
   */
  async shutdown(): Promise<void> {
    this.running = false;
    for (const controller of this.subscriptionAbortControllers) {
      controller.abort();
    }
    this.subscriptionAbortControllers = [];
  }

  /** Whether the event bus is actively consuming events. */
  get isRunning(): boolean {
    return this.running;
  }

  // ─── Private Methods ───────────────────────────────────────────────

  /**
   * Internal consumption loop using XREADGROUP.
   *
   * Reads batches of events, deserializes them, invokes the handler,
   * and handles acknowledgment or DLQ routing on failure.
   */
  private async consumeLoop<T>(
    stream: StreamName,
    consumerGroup: string,
    consumerName: string,
    handler: EventHandler<T>,
    batchSize: number,
    blockMs: number,
    startId: string,
    signal: AbortSignal
  ): Promise<void> {
    while (!signal.aborted) {
      try {
        const results = await this.subscriber.xreadgroup(
          'GROUP',
          consumerGroup,
          consumerName,
          'COUNT',
          batchSize,
          'BLOCK',
          blockMs,
          'STREAMS',
          stream,
          startId
        );

        if (!results || signal.aborted) continue;

        for (const [, messages] of results as Array<[string, Array<[string, string[]]>]>) {
          for (const [messageId, fields] of messages) {
            if (signal.aborted) break;

            const event = this.deserializeEvent<T>(fields);
            if (!event) {
              // Invalid/corrupt message — acknowledge and skip
              await this.acknowledge(stream, consumerGroup, messageId);
              continue;
            }

            try {
              await handler(event, { messageId, stream });
              await this.acknowledge(stream, consumerGroup, messageId);
            } catch (err: unknown) {
              const errorMessage = err instanceof Error ? err.message : String(err);
              await this.handleProcessingFailure(
                event,
                stream,
                consumerGroup,
                messageId,
                consumerName,
                errorMessage
              );
            }
          }
        }
      } catch (err: unknown) {
        // If aborted, exit cleanly
        if (signal.aborted) break;

        // Log and continue on transient errors
        // In production, this would use a proper logger
        console.error(`[EventBus] Error in consume loop for ${stream}/${consumerGroup}:`, err);

        // Brief pause before retrying to avoid tight error loops
        await this.sleep(1000);
      }
    }
  }

  /**
   * Handle a failed event processing attempt.
   *
   * Increments retryCount. If max retries exceeded, moves to DLQ.
   * Otherwise, the message remains pending for retry on next read cycle.
   */
  private async handleProcessingFailure(
    event: PlatformEvent,
    stream: StreamName,
    consumerGroup: string,
    messageId: string,
    consumerName: string,
    errorMessage: string
  ): Promise<void> {
    const retryCount = event.metadata.retryCount + 1;
    const maxRetries = event.metadata.maxRetries;

    if (retryCount >= maxRetries) {
      // Max retries exceeded — move to dead letter queue
      await this.moveToDeadLetterQueue(
        event,
        `Exceeded max retries (${maxRetries})`,
        consumerName,
        errorMessage
      );
      // Acknowledge the original message so it leaves the PEL
      await this.acknowledge(stream, consumerGroup, messageId);
    }
    // Otherwise, leave the message in the PEL for retry
    // (claimed via XAUTOCLAIM or on next XREADGROUP with "0" startId)
  }

  /**
   * Deserialize a Redis Stream message's fields into a PlatformEvent.
   *
   * Expects a "data" field containing JSON.
   */
  private deserializeEvent<T>(fields: string[]): PlatformEvent<T> | null {
    // fields is a flat array: [key1, value1, key2, value2, ...]
    for (let i = 0; i < fields.length; i += 2) {
      if (fields[i] === 'data') {
        try {
          return JSON.parse(fields[i + 1]) as PlatformEvent<T>;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  /** Sleep utility for backoff pauses. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
