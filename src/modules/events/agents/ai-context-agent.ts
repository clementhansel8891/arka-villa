/**
 * AI Context Preparation Agent
 *
 * Event-driven consumer that collects platform events and maintains
 * a rolling context per tenant for AI/LLM consumption.
 * Subscribes to `stream:bookings`, `stream:maintenance`, `stream:staff`,
 * and `stream:iot` via the EventBus.
 *
 * Responsibilities:
 * - Collect and summarize platform events for AI context window
 * - Maintain rolling 30-day context per tenant in Redis sorted set
 * - Prune old context entries to stay within 8000 token limit per tenant
 * - Prepare structured summaries for LLM consumption
 * - Index recent events for fast AI retrieval
 *
 * Requirements: 35.5, 35.6, 7.1, 7.6, 28.2, 28.3, 28.4
 */

import { v4 as uuidv4 } from 'uuid';

import { EventBus } from '@/lib/events/event-bus';
import { STREAMS, type StreamName } from '@/lib/events/streams';
import type {
  PlatformEvent,
  AgentConfig,
  AgentLifecycle,
  AgentHealthStatus,
  AgentMetrics,
  ProcessingResult,
} from '@/lib/events/types';
import { createRedisClient, redis } from '@/lib/db/redis';

// ─── Agent Configuration ──────────────────────────────────────────────────────

const AGENT_NAME = 'ai-context-agent';
const CONSUMER_GROUP = 'cg:ai-context-agent';
const CONSUMER_NAME = `${AGENT_NAME}-${process.pid}`;

/** Context window: 30 days in milliseconds */
const CONTEXT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Maximum tokens per tenant context */
const MAX_TOKENS_PER_TENANT = 8000;

/** Prune schedule: every 6 hours in milliseconds */
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Approximate characters per token (conservative estimate for English text) */
const CHARS_PER_TOKEN = 4;

/** Maximum character budget per tenant (tokens * chars/token) */
const MAX_CHARS_PER_TENANT = MAX_TOKENS_PER_TENANT * CHARS_PER_TOKEN;

/** Redis key prefix for tenant context sorted sets */
const CONTEXT_KEY_PREFIX = 'ai:context:';

/** Redis key prefix for tenant context summaries */
const SUMMARY_KEY_PREFIX = 'ai:summary:';

/** Redis key prefix for event index (by type) */
const INDEX_KEY_PREFIX = 'ai:index:';

/** Default configuration for the AI Context Preparation Agent */
const DEFAULT_CONFIG: AgentConfig = {
  name: AGENT_NAME,
  consumerGroup: CONSUMER_GROUP,
  streams: [STREAMS.BOOKINGS, STREAMS.MAINTENANCE, STREAMS.STAFF, STREAMS.IOT],
  concurrency: 5,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryBaseDelay: 5000,
  healthCheckInterval: 30_000,
  idleTimeout: 300_000,
};

// ─── Context Entry Interface ──────────────────────────────────────────────────

/** A summarized context entry stored in the per-tenant sorted set */
interface ContextEntry {
  /** Original event ID */
  eventId: string;
  /** Event type (dot notation) */
  type: string;
  /** Human-readable summary of the event */
  summary: string;
  /** Event timestamp */
  timestamp: string;
  /** Source module */
  source: string;
  /** Key entities referenced */
  entities: Record<string, string>;
  /** Approximate token count of this entry */
  tokenEstimate: number;
}

/** Structured summary for LLM consumption */
interface TenantContextSummary {
  tenantId: string;
  generatedAt: string;
  totalEntries: number;
  totalTokens: number;
  recentBookings: string[];
  recentMaintenance: string[];
  recentStaffActivity: string[];
  recentIoTAlerts: string[];
  contextWindow: { start: string; end: string };
}

// ─── AI Context Preparation Agent Implementation ─────────────────────────────

/**
 * AIContextAgent implements the AgentLifecycle interface and maintains
 * a rolling 30-day context per tenant in Redis sorted sets.
 * Prunes entries to stay within the 8000-token limit per tenant.
 */
export class AIContextAgent implements AgentLifecycle {
  private config: AgentConfig = DEFAULT_CONFIG;
  private eventBus: EventBus | null = null;
  private stopFunctions: Array<() => void> = [];
  private healthCheckIntervalRef: ReturnType<typeof setInterval> | null = null;
  private pruneIntervalRef: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private startedAt: Date | null = null;

  // Metrics
  private eventsProcessed = 0;
  private eventsFailed = 0;
  private totalProcessingTimeMs = 0;
  private lastProcessedAt: Date = new Date();
  private recentErrors: number[] = [];

  // ─── AgentLifecycle Implementation ──────────────────────────────────

  register(config: AgentConfig): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.started) return;

    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    this.eventBus = new EventBus({ publisher, subscriber });

    // Subscribe to all relevant streams
    for (const stream of this.config.streams) {
      const stop = await this.eventBus.subscribe(
        stream as StreamName,
        this.config.consumerGroup,
        CONSUMER_NAME,
        async (event) => { await this.processEvent(event); },
      );
      this.stopFunctions.push(stop);
    }

    // Start health check interval
    this.healthCheckIntervalRef = setInterval(() => {
      this.healthCheck();
    }, this.config.healthCheckInterval);

    // Start prune schedule (every 6 hours)
    this.pruneIntervalRef = setInterval(
      () => this.pruneAllTenantContexts(),
      PRUNE_INTERVAL_MS,
    );

    this.started = true;
    this.startedAt = new Date();
  }

  async stop(graceful: boolean): Promise<void> {
    if (!this.started) return;

    for (const stop of this.stopFunctions) {
      stop();
    }
    this.stopFunctions = [];

    if (this.healthCheckIntervalRef) {
      clearInterval(this.healthCheckIntervalRef);
      this.healthCheckIntervalRef = null;
    }
    if (this.pruneIntervalRef) {
      clearInterval(this.pruneIntervalRef);
      this.pruneIntervalRef = null;
    }

    if (this.eventBus) {
      await this.eventBus.shutdown();
      this.eventBus = null;
    }

    this.started = false;
  }

  healthCheck(): AgentHealthStatus {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    this.recentErrors = this.recentErrors.filter((t) => t > fiveMinutesAgo);
    const errorRate = this.recentErrors.length / 5;

    let status: AgentHealthStatus['status'] = 'healthy';
    if (errorRate > 10) {
      status = 'unhealthy';
    } else if (errorRate > 3) {
      status = 'degraded';
    }

    const lag = now - this.lastProcessedAt.getTime();
    return { status, lastProcessedAt: this.lastProcessedAt, pendingEvents: 0, errorRate, lag };
  }

  getMetrics(): AgentMetrics {
    const uptime = this.startedAt
      ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
      : 0;

    return {
      eventsProcessed: this.eventsProcessed,
      eventsFailed: this.eventsFailed,
      averageProcessingTime:
        this.eventsProcessed > 0
          ? Math.round(this.totalProcessingTimeMs / this.eventsProcessed)
          : 0,
      uptime,
    };
  }

  async processEvent(event: PlatformEvent): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      await this.addEventToContext(event);

      const durationMs = Date.now() - startTime;
      this.eventsProcessed++;
      this.totalProcessingTimeMs += durationMs;
      this.lastProcessedAt = new Date();

      return { success: true, durationMs };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      this.eventsFailed++;
      this.recentErrors.push(Date.now());

      const errorMessage = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMessage, durationMs };
    }
  }

  acknowledgeEvent(_eventId: string): void {
    // Handled internally by the EventBus
  }

  rejectEvent(_eventId: string, _reason: string): void {
    // Handled internally by the EventBus
  }

  // ─── Context Collection ──────────────────────────────────────────────

  /**
   * Add an event to the tenant's rolling context.
   * Summarizes the event into a compact representation and stores it
   * in a Redis sorted set with score = event timestamp.
   */
  private async addEventToContext(event: PlatformEvent): Promise<void> {
    const tenantId = event.tenantId;
    if (!tenantId) return;

    // Summarize the event into a context entry
    const entry = this.summarizeEvent(event);
    if (!entry) return;

    const contextKey = `${CONTEXT_KEY_PREFIX}${tenantId}`;
    const timestamp = new Date(event.timestamp).getTime();

    // Add to sorted set (score = timestamp for chronological ordering)
    await redis.zadd(contextKey, timestamp, JSON.stringify(entry));

    // Index by event type for fast retrieval
    const indexKey = `${INDEX_KEY_PREFIX}${tenantId}:${entry.type.split('.')[0]}`;
    await redis.zadd(indexKey, timestamp, JSON.stringify(entry));
    await redis.expire(indexKey, 31 * 24 * 60 * 60); // 31 day TTL

    // Check if we need to prune (token limit)
    await this.pruneContextIfNeeded(tenantId);

    // Emit context updated event
    if (this.eventBus) {
      const contextEvent: PlatformEvent = {
        id: uuidv4(),
        type: 'ai.context_updated',
        version: 1,
        timestamp: new Date().toISOString(),
        source: AGENT_NAME,
        tenantId,
        correlationId: event.correlationId,
        causationId: event.id,
        actor: { userId: 'system', role: 'system' },
        payload: {
          entriesCount: await redis.zcard(contextKey),
          eventType: event.type,
        },
        metadata: { retryCount: 0, maxRetries: 1, priority: 'low' },
      };
      await this.eventBus.emit(STREAMS.AI_CONTEXT as StreamName, contextEvent);
    }
  }

  /**
   * Summarize a platform event into a compact context entry
   * suitable for LLM consumption.
   */
  private summarizeEvent(event: PlatformEvent): ContextEntry | null {
    const payload = event.payload as Record<string, unknown>;
    let summary = '';
    const entities: Record<string, string> = {};

    switch (event.type) {
      // Booking events
      case 'booking.created':
        summary = `New booking created: ${payload.bookingId} for room ${payload.roomId}, check-in ${payload.checkIn}, check-out ${payload.checkOut}`;
        entities.bookingId = String(payload.bookingId ?? '');
        entities.roomId = String(payload.roomId ?? '');
        break;
      case 'booking.confirmed':
        summary = `Booking confirmed: ${payload.bookingId}`;
        entities.bookingId = String(payload.bookingId ?? '');
        break;
      case 'booking.cancelled':
        summary = `Booking cancelled: ${payload.bookingId}. Reason: ${payload.reason ?? 'not specified'}`;
        entities.bookingId = String(payload.bookingId ?? '');
        break;
      case 'booking.completed':
        summary = `Guest checked out: booking ${payload.bookingId}`;
        entities.bookingId = String(payload.bookingId ?? '');
        break;

      // Maintenance events
      case 'maintenance.ticket_created':
        summary = `Maintenance ticket created: ${payload.ticketId} — ${payload.title} (severity: ${payload.severity})`;
        entities.ticketId = String(payload.ticketId ?? '');
        break;
      case 'maintenance.assigned':
        summary = `Maintenance ticket ${payload.ticketId} assigned to ${payload.assignedTo}`;
        entities.ticketId = String(payload.ticketId ?? '');
        entities.staffId = String(payload.assignedTo ?? '');
        break;
      case 'maintenance.completed':
        summary = `Maintenance ticket ${payload.ticketId} completed`;
        entities.ticketId = String(payload.ticketId ?? '');
        break;
      case 'maintenance.escalated':
        summary = `Maintenance ticket ${payload.ticketId} escalated: ${payload.reason ?? ''}`;
        entities.ticketId = String(payload.ticketId ?? '');
        break;

      // Staff events
      case 'staff.task_assigned':
        summary = `Task assigned to staff ${payload.staffId}: ${payload.taskTitle ?? payload.taskId}`;
        entities.staffId = String(payload.staffId ?? '');
        entities.taskId = String(payload.taskId ?? '');
        break;
      case 'staff.task_completed':
        summary = `Staff ${payload.staffId} completed task ${payload.taskId}`;
        entities.staffId = String(payload.staffId ?? '');
        entities.taskId = String(payload.taskId ?? '');
        break;
      case 'staff.task_overdue':
        summary = `Task ${payload.taskId} overdue for staff ${payload.staffId}`;
        entities.staffId = String(payload.staffId ?? '');
        entities.taskId = String(payload.taskId ?? '');
        break;
      case 'staff.clock_in':
        summary = `Staff ${payload.staffId} clocked in`;
        entities.staffId = String(payload.staffId ?? '');
        break;
      case 'staff.clock_out':
        summary = `Staff ${payload.staffId} clocked out`;
        entities.staffId = String(payload.staffId ?? '');
        break;

      // IoT events
      case 'iot.device_online':
        summary = `IoT device ${payload.deviceId} (${payload.deviceType}) came online`;
        entities.deviceId = String(payload.deviceId ?? '');
        break;
      case 'iot.device_offline':
        summary = `IoT device ${payload.deviceId} (${payload.deviceType}) went offline`;
        entities.deviceId = String(payload.deviceId ?? '');
        break;
      case 'iot.alert_triggered':
        summary = `IoT alert: ${payload.message ?? payload.alertType} on device ${payload.deviceId}`;
        entities.deviceId = String(payload.deviceId ?? '');
        break;
      case 'iot.reading_anomaly':
        summary = `Anomalous reading on device ${payload.deviceId}: ${payload.metric}=${payload.value}${payload.unit}`;
        entities.deviceId = String(payload.deviceId ?? '');
        break;

      default:
        // Generic fallback summary
        summary = `Event ${event.type} from ${event.source}`;
        break;
    }

    const tokenEstimate = Math.ceil(summary.length / CHARS_PER_TOKEN);

    return {
      eventId: event.id,
      type: event.type,
      summary,
      timestamp: event.timestamp,
      source: event.source,
      entities,
      tokenEstimate,
    };
  }

  // ─── Context Pruning ─────────────────────────────────────────────────

  /**
   * Prune a tenant's context if it exceeds the 8000-token limit.
   * Removes oldest entries first (lowest scores in the sorted set).
   */
  private async pruneContextIfNeeded(tenantId: string): Promise<void> {
    const contextKey = `${CONTEXT_KEY_PREFIX}${tenantId}`;

    // Get all entries to calculate total tokens
    const entries = await redis.zrangebyscore(contextKey, '-inf', '+inf');
    let totalTokens = 0;

    for (const entryStr of entries) {
      const entry = JSON.parse(entryStr) as ContextEntry;
      totalTokens += entry.tokenEstimate;
    }

    // If within limit, nothing to do
    if (totalTokens <= MAX_TOKENS_PER_TENANT) return;

    // Remove oldest entries until we're within the token budget
    let tokensToRemove = totalTokens - MAX_TOKENS_PER_TENANT;
    let removedCount = 0;

    for (const entryStr of entries) {
      if (tokensToRemove <= 0) break;

      const entry = JSON.parse(entryStr) as ContextEntry;
      tokensToRemove -= entry.tokenEstimate;
      removedCount++;

      // Remove from sorted set
      await redis.zrem(contextKey, entryStr);
    }

    // Emit prune event
    if (this.eventBus && removedCount > 0) {
      const pruneEvent: PlatformEvent = {
        id: uuidv4(),
        type: 'ai.context_pruned',
        version: 1,
        timestamp: new Date().toISOString(),
        source: AGENT_NAME,
        tenantId,
        correlationId: uuidv4(),
        actor: { userId: 'system', role: 'system' },
        payload: {
          removedEntries: removedCount,
          remainingTokens: totalTokens - (totalTokens - MAX_TOKENS_PER_TENANT + tokensToRemove),
        },
        metadata: { retryCount: 0, maxRetries: 1, priority: 'low' },
      };
      await this.eventBus.emit(STREAMS.AI_CONTEXT as StreamName, pruneEvent);
    }
  }

  /**
   * Prune all tenant contexts (scheduled every 6 hours).
   * Removes entries older than 30 days and enforces the token limit.
   */
  private async pruneAllTenantContexts(): Promise<void> {
    try {
      const cutoff = Date.now() - CONTEXT_WINDOW_MS;
      let cursor = '0';

      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `${CONTEXT_KEY_PREFIX}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        for (const contextKey of keys) {
          // Remove entries older than 30 days
          await redis.zremrangebyscore(contextKey, '-inf', cutoff);

          // Extract tenantId from key and enforce token limit
          const tenantId = contextKey.replace(CONTEXT_KEY_PREFIX, '');
          await this.pruneContextIfNeeded(tenantId);
        }
      } while (cursor !== '0');

      // Also prune index keys
      cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `${INDEX_KEY_PREFIX}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        for (const indexKey of keys) {
          await redis.zremrangebyscore(indexKey, '-inf', cutoff);
        }
      } while (cursor !== '0');
    } catch (err: unknown) {
      console.error(`[${AGENT_NAME}] Context prune failed:`, err);
    }
  }

  // ─── Public API for LLM Context Retrieval ────────────────────────────

  /**
   * Get the full rolling context for a tenant (for LLM prompt injection).
   * Returns entries sorted chronologically, within the 8000-token budget.
   */
  async getTenantContext(tenantId: string): Promise<ContextEntry[]> {
    const contextKey = `${CONTEXT_KEY_PREFIX}${tenantId}`;
    const entries = await redis.zrangebyscore(contextKey, '-inf', '+inf');

    return entries.map((e) => JSON.parse(e) as ContextEntry);
  }

  /**
   * Get a structured summary of the tenant's context for LLM consumption.
   * Categorizes events and provides counts.
   */
  async getTenantContextSummary(tenantId: string): Promise<TenantContextSummary> {
    const entries = await this.getTenantContext(tenantId);

    const recentBookings: string[] = [];
    const recentMaintenance: string[] = [];
    const recentStaffActivity: string[] = [];
    const recentIoTAlerts: string[] = [];
    let totalTokens = 0;

    for (const entry of entries) {
      totalTokens += entry.tokenEstimate;

      if (entry.type.startsWith('booking.')) {
        recentBookings.push(entry.summary);
      } else if (entry.type.startsWith('maintenance.')) {
        recentMaintenance.push(entry.summary);
      } else if (entry.type.startsWith('staff.')) {
        recentStaffActivity.push(entry.summary);
      } else if (entry.type.startsWith('iot.')) {
        recentIoTAlerts.push(entry.summary);
      }
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - CONTEXT_WINDOW_MS);

    const summary: TenantContextSummary = {
      tenantId,
      generatedAt: now.toISOString(),
      totalEntries: entries.length,
      totalTokens,
      recentBookings: recentBookings.slice(-10), // Last 10
      recentMaintenance: recentMaintenance.slice(-10),
      recentStaffActivity: recentStaffActivity.slice(-10),
      recentIoTAlerts: recentIoTAlerts.slice(-10),
      contextWindow: {
        start: windowStart.toISOString(),
        end: now.toISOString(),
      },
    };

    // Cache the summary for quick retrieval
    const summaryKey = `${SUMMARY_KEY_PREFIX}${tenantId}`;
    await redis.set(summaryKey, JSON.stringify(summary), 'EX', 3600); // 1h TTL

    return summary;
  }

  /**
   * Get events of a specific domain (booking, maintenance, staff, iot)
   * from the index for fast retrieval.
   */
  async getEventsByDomain(
    tenantId: string,
    domain: 'booking' | 'maintenance' | 'staff' | 'iot',
    limit: number = 20,
  ): Promise<ContextEntry[]> {
    const indexKey = `${INDEX_KEY_PREFIX}${tenantId}:${domain}`;
    const entries = await redis.zrevrangebyscore(indexKey, '+inf', '-inf', 'LIMIT', 0, limit);

    return entries.map((e) => JSON.parse(e) as ContextEntry);
  }

  /**
   * Get the formatted context string for inclusion in an LLM prompt.
   * Returns a text block summarizing recent activity within the token budget.
   */
  async getFormattedContextForLLM(tenantId: string): Promise<string> {
    const summary = await this.getTenantContextSummary(tenantId);

    const sections: string[] = [];
    sections.push(`## Tenant Context (last 30 days, generated ${summary.generatedAt})`);
    sections.push(`Total events tracked: ${summary.totalEntries}`);
    sections.push('');

    if (summary.recentBookings.length > 0) {
      sections.push('### Recent Bookings');
      for (const b of summary.recentBookings) {
        sections.push(`- ${b}`);
      }
      sections.push('');
    }

    if (summary.recentMaintenance.length > 0) {
      sections.push('### Recent Maintenance');
      for (const m of summary.recentMaintenance) {
        sections.push(`- ${m}`);
      }
      sections.push('');
    }

    if (summary.recentStaffActivity.length > 0) {
      sections.push('### Recent Staff Activity');
      for (const s of summary.recentStaffActivity) {
        sections.push(`- ${s}`);
      }
      sections.push('');
    }

    if (summary.recentIoTAlerts.length > 0) {
      sections.push('### Recent IoT Alerts');
      for (const i of summary.recentIoTAlerts) {
        sections.push(`- ${i}`);
      }
      sections.push('');
    }

    return sections.join('\n');
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/** Singleton instance of the AIContextAgent */
export const aiContextAgent = new AIContextAgent();
