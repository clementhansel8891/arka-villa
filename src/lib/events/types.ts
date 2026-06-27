/**
 * Core platform event and agent interfaces.
 *
 * These are the foundational types shared across all modules
 * for the event-driven architecture and agent lifecycle.
 */

/**
 * Standard event envelope for all platform events flowing
 * through the Redis Streams event bus.
 */
export interface PlatformEvent<T = unknown> {
  /** UUID v4, unique per event */
  id: string;
  /** Dot-notation event type (e.g., "booking.created") */
  type: string;
  /** Schema version for evolution */
  version: number;
  /** ISO 8601 with timezone */
  timestamp: string;
  /** Producing module name */
  source: string;
  /** Tenant scope */
  tenantId: string;
  /** Links related events in a saga */
  correlationId: string;
  /** ID of the event that caused this one */
  causationId?: string;
  /** Actor who triggered the event */
  actor: {
    userId: string;
    role: string;
  };
  /** Event-specific data */
  payload: T;
  /** Event processing metadata */
  metadata: {
    retryCount: number;
    maxRetries: number;
    priority: 'critical' | 'high' | 'normal' | 'low';
  };
}

/**
 * Configuration for an event-processing agent.
 */
export interface AgentConfig {
  /** Unique agent name */
  name: string;
  /** Redis Streams consumer group name */
  consumerGroup: string;
  /** Streams this agent subscribes to */
  streams: string[];
  /** Parallel event processing slots */
  concurrency: number;
  /** Maximum retry attempts for failed events */
  maxRetries: number;
  /** Backoff strategy for retries */
  retryBackoff: 'exponential' | 'linear' | 'fixed';
  /** Base delay in milliseconds for retry backoff */
  retryBaseDelay: number;
  /** Interval between health checks in milliseconds */
  healthCheckInterval: number;
  /** Idle timeout in milliseconds before scaling down */
  idleTimeout: number;
}

/**
 * Agent lifecycle interface for registration, startup,
 * shutdown, health monitoring, and event processing.
 */
export interface AgentLifecycle {
  /** Register the agent with its configuration */
  register(config: AgentConfig): void;
  /** Start the agent and begin consuming events */
  start(): Promise<void>;
  /** Stop the agent, optionally waiting for in-flight events */
  stop(graceful: boolean): Promise<void>;
  /** Get the current health status of the agent */
  healthCheck(): AgentHealthStatus;
  /** Get accumulated metrics for the agent */
  getMetrics(): AgentMetrics;
  /** Process a single event */
  processEvent(event: PlatformEvent): Promise<ProcessingResult>;
  /** Acknowledge successful event processing */
  acknowledgeEvent(eventId: string): void;
  /** Reject an event with a reason (will be retried or DLQ'd) */
  rejectEvent(eventId: string, reason: string): void;
}

/**
 * Health status snapshot for an agent.
 */
export interface AgentHealthStatus {
  /** Overall health assessment */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** When the agent last processed an event */
  lastProcessedAt: Date;
  /** Number of events awaiting processing */
  pendingEvents: number;
  /** Errors per minute (rolling 5-minute window) */
  errorRate: number;
  /** Milliseconds behind the latest event in the stream */
  lag: number;
}

/**
 * Accumulated metrics for an agent.
 */
export interface AgentMetrics {
  /** Total events successfully processed */
  eventsProcessed: number;
  /** Total events that failed processing */
  eventsFailed: number;
  /** Average processing time in milliseconds */
  averageProcessingTime: number;
  /** Agent uptime in seconds */
  uptime: number;
}

/**
 * Result of processing a single event.
 */
export interface ProcessingResult {
  /** Whether the event was processed successfully */
  success: boolean;
  /** Optional error message if processing failed */
  error?: string;
  /** Duration of processing in milliseconds */
  durationMs: number;
}
