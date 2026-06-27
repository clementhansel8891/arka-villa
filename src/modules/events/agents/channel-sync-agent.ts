/**
 * Channel Sync Agent
 *
 * Consumes events from `stream:channels` and `stream:availability` to
 * synchronize availability and reservations with connected OTA channels.
 *
 * Responsibilities:
 * - Push availability updates to OTAs within 60 seconds
 * - Poll inbound reservations from OTAs every 60 seconds
 * - Handle per-channel failures independently with retry policy
 * - Mark channels as out-of-sync after 3 failed retries
 * - Emit `channel.sync_completed` or `channel.sync_failed` events
 * - Booking_Engine is the authoritative source for conflict resolution
 *
 * Requirements: 6.1, 6.4, 6.5, 6.6
 */

import type {
  AgentLifecycle,
  AgentConfig,
  AgentHealthStatus,
  AgentMetrics,
  PlatformEvent,
  ProcessingResult,
} from '@/lib/events/types';
import { EventBus, STREAMS } from '@/lib/events';
import {
  pushAvailabilityToChannels,
  pollInboundReservations,
} from '@/modules/channels/service';
import type { RoomAvailability } from '@/modules/channels/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_NAME = 'channel-sync-agent';
const CONSUMER_GROUP = 'cg:channel-sync-agent';
const POLLING_INTERVAL_MS = 60_000; // 60 seconds
const AVAILABILITY_PUSH_TIMEOUT_MS = 60_000; // Must push within 60s
const RETRY_BASE_DELAY_MS = 5_000;
const RETRY_BACKOFF_FACTOR = 2;
const MAX_RETRIES = 3;

// ─── Availability Event Types ─────────────────────────────────────────────────

const AVAILABILITY_EVENT_TYPES = [
  'availability.updated',
  'availability.released',
  'availability.blocked',
] as const;

// ─── Channel Sync Agent Implementation ───────────────────────────────────────

export class ChannelSyncAgent implements AgentLifecycle {
  private config: AgentConfig | null = null;
  private eventBus: EventBus | null = null;
  private running = false;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private stopFunctions: Array<() => void> = [];

  // Metrics tracking
  private startedAt: Date | null = null;
  private lastProcessedAt: Date = new Date();
  private eventsProcessed = 0;
  private eventsFailed = 0;
  private totalProcessingTimeMs = 0;
  private pendingEvents = 0;
  private recentErrors: Date[] = [];

  // Per-channel retry tracking
  private channelRetryCount = new Map<string, number>();

  constructor(private readonly tenantId: string = 'system') {}

  // ─── AgentLifecycle Implementation ─────────────────────────────────

  /**
   * Register the agent with its configuration.
   */
  register(config: AgentConfig): void {
    this.config = config;
  }

  /**
   * Start the agent: subscribe to streams and begin polling loop.
   */
  async start(): Promise<void> {
    if (!this.config) {
      throw new Error(
        `[${AGENT_NAME}] Cannot start without registration. Call register() first.`
      );
    }

    if (this.running) {
      return;
    }

    this.running = true;
    this.startedAt = new Date();

    // Subscribe to stream:channels
    if (this.eventBus) {
      const stopChannels = await this.eventBus.subscribe(
        STREAMS.CHANNELS,
        CONSUMER_GROUP,
        `${AGENT_NAME}-channels`,
        async (event, metadata) => {
          const result = await this.processEvent(event);
          if (result.success) {
            this.acknowledgeEvent(metadata.messageId);
          } else {
            this.rejectEvent(metadata.messageId, result.error ?? 'Unknown error');
          }
        }
      );
      this.stopFunctions.push(stopChannels);

      // Subscribe to stream:availability
      const stopAvailability = await this.eventBus.subscribe(
        STREAMS.AVAILABILITY,
        CONSUMER_GROUP,
        `${AGENT_NAME}-availability`,
        async (event, metadata) => {
          const result = await this.processEvent(event);
          if (result.success) {
            this.acknowledgeEvent(metadata.messageId);
          } else {
            this.rejectEvent(metadata.messageId, result.error ?? 'Unknown error');
          }
        }
      );
      this.stopFunctions.push(stopAvailability);
    }

    // Start the inbound reservation polling loop
    this.startPollingLoop();

    console.log(
      `[${AGENT_NAME}] Started — consuming stream:channels, stream:availability. Polling every ${POLLING_INTERVAL_MS / 1000}s.`
    );
  }

  /**
   * Stop the agent gracefully, waiting for in-flight events if requested.
   */
  async stop(graceful: boolean): Promise<void> {
    this.running = false;

    // Stop the polling loop
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    // Stop all subscriptions
    for (const stopFn of this.stopFunctions) {
      stopFn();
    }
    this.stopFunctions = [];

    if (graceful) {
      // Allow in-flight events to complete (brief pause)
      await sleep(500);
    }

    console.log(
      `[${AGENT_NAME}] Stopped ${graceful ? 'gracefully' : 'immediately'}.`
    );
  }

  /**
   * Get the current health status of the agent.
   */
  healthCheck(): AgentHealthStatus {
    const now = Date.now();

    // Calculate error rate (errors per minute, rolling 5-minute window)
    const fiveMinutesAgo = now - 5 * 60_000;
    this.recentErrors = this.recentErrors.filter(
      (d) => d.getTime() > fiveMinutesAgo
    );
    const errorRate = this.recentErrors.length / 5;

    // Determine overall status
    let status: AgentHealthStatus['status'] = 'healthy';
    if (!this.running) {
      status = 'unhealthy';
    } else if (errorRate > 5) {
      status = 'unhealthy';
    } else if (errorRate > 1) {
      status = 'degraded';
    }

    return {
      status,
      lastProcessedAt: this.lastProcessedAt,
      pendingEvents: this.pendingEvents,
      errorRate,
      lag: now - this.lastProcessedAt.getTime(),
    };
  }

  /**
   * Get accumulated metrics for the agent.
   */
  getMetrics(): AgentMetrics {
    const uptimeSeconds = this.startedAt
      ? (Date.now() - this.startedAt.getTime()) / 1000
      : 0;

    return {
      eventsProcessed: this.eventsProcessed,
      eventsFailed: this.eventsFailed,
      averageProcessingTime:
        this.eventsProcessed > 0
          ? this.totalProcessingTimeMs / this.eventsProcessed
          : 0,
      uptime: uptimeSeconds,
    };
  }

  /**
   * Process a single event from either stream:channels or stream:availability.
   */
  async processEvent(event: PlatformEvent): Promise<ProcessingResult> {
    const startTime = Date.now();
    this.pendingEvents++;

    try {
      const result = await this.handleEvent(event);
      const durationMs = Date.now() - startTime;

      this.eventsProcessed++;
      this.totalProcessingTimeMs += durationMs;
      this.lastProcessedAt = new Date();
      this.pendingEvents--;

      return { success: true, durationMs };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.eventsFailed++;
      this.recentErrors.push(new Date());
      this.pendingEvents--;

      return { success: false, error: errorMessage, durationMs };
    }
  }

  /**
   * Acknowledge successful event processing.
   */
  acknowledgeEvent(eventId: string): void {
    // In a full implementation, this would call eventBus.acknowledge()
    // For now, the subscription handler takes care of acknowledgment
    void eventId;
  }

  /**
   * Reject an event with a reason (will be retried or sent to DLQ).
   */
  rejectEvent(eventId: string, reason: string): void {
    console.warn(
      `[${AGENT_NAME}] Rejected event ${eventId}: ${reason}`
    );
  }

  // ─── Public Configuration ──────────────────────────────────────────

  /**
   * Set the EventBus instance for this agent.
   * Must be called before start().
   */
  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Get the default agent configuration.
   */
  static getDefaultConfig(): AgentConfig {
    return {
      name: AGENT_NAME,
      consumerGroup: CONSUMER_GROUP,
      streams: [STREAMS.CHANNELS, STREAMS.AVAILABILITY],
      concurrency: 5,
      maxRetries: MAX_RETRIES,
      retryBackoff: 'exponential',
      retryBaseDelay: RETRY_BASE_DELAY_MS,
      healthCheckInterval: 30_000,
      idleTimeout: 300_000,
    };
  }

  // ─── Private: Event Handling ───────────────────────────────────────

  /**
   * Route an event to the appropriate handler based on event type.
   */
  private async handleEvent(event: PlatformEvent): Promise<void> {
    const eventType = event.type;

    // Handle availability events — push updates to OTAs
    if (isAvailabilityEvent(eventType)) {
      await this.handleAvailabilityEvent(event);
      return;
    }

    // Handle channel-related events (sync status, etc.)
    switch (eventType) {
      case 'channel.sync_started':
      case 'channel.sync_completed':
      case 'channel.sync_failed':
      case 'channel.reservation_received':
        // These are informational events emitted by the channel service.
        // The agent logs them but doesn't need to take further action.
        break;
      default:
        // Unknown event type — log and skip
        console.debug(
          `[${AGENT_NAME}] Ignoring unhandled event type: ${eventType}`
        );
    }
  }

  /**
   * Handle availability change events by pushing updates to all OTAs.
   *
   * Must complete within 60 seconds (SLA from requirement 6.1).
   * Each channel is processed independently — failure on one does not block others.
   */
  private async handleAvailabilityEvent(event: PlatformEvent): Promise<void> {
    const payload = event.payload as {
      roomId?: string;
      date?: string;
      available?: boolean;
      rooms?: RoomAvailability[];
    };

    // Build the room availability array from event payload
    const rooms: RoomAvailability[] = payload.rooms ?? [];
    if (payload.roomId && payload.date !== undefined) {
      rooms.push({
        roomId: payload.roomId,
        date: payload.date,
        available: payload.available ?? (event.type === 'availability.released'),
      });
    }

    if (rooms.length === 0) {
      return;
    }

    // Push availability with timeout enforcement (60s SLA)
    await withTimeout(
      this.pushAvailabilityWithRetry(event.tenantId, rooms, event),
      AVAILABILITY_PUSH_TIMEOUT_MS,
      `Availability push to OTAs exceeded ${AVAILABILITY_PUSH_TIMEOUT_MS / 1000}s timeout`
    );
  }

  /**
   * Push availability to all channels with per-channel independent retry.
   * After MAX_RETRIES failures, marks the channel as out-of-sync.
   */
  private async pushAvailabilityWithRetry(
    tenantId: string,
    rooms: RoomAvailability[],
    originEvent: PlatformEvent
  ): Promise<void> {
    const results = await pushAvailabilityToChannels(
      tenantId,
      rooms,
      originEvent.actor.userId,
      originEvent.actor.role,
      this.eventBus ?? undefined
    );

    // Track per-channel retry failures
    for (const result of results) {
      if (result.success) {
        // Reset retry count on success
        this.channelRetryCount.delete(result.channelId);
      } else {
        const currentRetries = (this.channelRetryCount.get(result.channelId) ?? 0) + 1;
        this.channelRetryCount.set(result.channelId, currentRetries);

        if (currentRetries >= MAX_RETRIES) {
          await this.markChannelOutOfSync(result.channelId, result.error ?? 'Unknown error');
        }
      }
    }
  }

  /**
   * Mark a channel as out-of-sync after 3 failed retry attempts.
   * Emits a `channel.sync_failed` event to notify Agency_Admin.
   */
  private async markChannelOutOfSync(
    channelId: string,
    error: string
  ): Promise<void> {
    console.warn(
      `[${AGENT_NAME}] Channel ${channelId} marked as out-of-sync after ${MAX_RETRIES} failed retries: ${error}`
    );

    // The pushAvailabilityToChannels function already emits channel.sync_failed
    // and marks the channel out-of-sync via channelSyncStatus map in the service.
    // Reset the local retry counter after marking.
    this.channelRetryCount.delete(channelId);
  }

  // ─── Private: Polling Loop ─────────────────────────────────────────

  /**
   * Start the inbound reservation polling loop.
   * Polls all connected OTA channels every 60 seconds for new reservations.
   */
  private startPollingLoop(): void {
    // Run immediately on start
    void this.pollReservations();

    // Then run on interval
    this.pollingTimer = setInterval(() => {
      if (this.running) {
        void this.pollReservations();
      }
    }, POLLING_INTERVAL_MS);
  }

  /**
   * Poll all OTA channels for inbound reservations.
   * Processes each channel independently — failure on one does not block others.
   */
  private async pollReservations(): Promise<void> {
    try {
      const reservations = await pollInboundReservations(
        this.tenantId,
        'system',
        'system',
        this.eventBus ?? undefined
      );

      if (reservations.length > 0) {
        this.eventsProcessed++;
        this.lastProcessedAt = new Date();
        console.log(
          `[${AGENT_NAME}] Polled ${reservations.length} inbound reservation(s) from OTA channels.`
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.eventsFailed++;
      this.recentErrors.push(new Date());
      console.error(
        `[${AGENT_NAME}] Error during inbound reservation polling: ${errorMessage}`
      );
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrap a promise with a timeout. Rejects if the promise doesn't settle
 * within the specified duration.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Check if an event type is an availability event that triggers OTA push.
 */
function isAvailabilityEvent(eventType: string): boolean {
  return (AVAILABILITY_EVENT_TYPES as readonly string[]).includes(eventType);
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create and configure a ChannelSyncAgent instance with default settings.
 */
export function createChannelSyncAgent(
  tenantId: string,
  eventBus?: EventBus
): ChannelSyncAgent {
  const agent = new ChannelSyncAgent(tenantId);
  const config = ChannelSyncAgent.getDefaultConfig();
  agent.register(config);

  if (eventBus) {
    agent.setEventBus(eventBus);
  }

  return agent;
}
