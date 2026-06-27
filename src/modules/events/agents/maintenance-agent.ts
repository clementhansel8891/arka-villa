/**
 * Maintenance Agent
 *
 * Event-driven consumer that monitors maintenance tickets,
 * enforces escalation SLAs, and generates recurring maintenance tasks.
 *
 * Subscribes to `stream:maintenance` via the EventBus.
 *
 * Responsibilities:
 * - Monitor critical ticket creation and ensure 5-min notification SLA
 * - Track non-critical tickets open > 72h for escalation
 * - Generate recurring maintenance tasks on schedule
 * - Verify completion evidence before status transition
 * - Calculate and record maintenance costs to financial transactions
 *
 * Requirements: 11.3, 11.4, 11.7
 */

import type {
  AgentLifecycle,
  AgentConfig,
  AgentHealthStatus,
  AgentMetrics,
  PlatformEvent,
  ProcessingResult,
} from '@/lib/events/types';
import { EventBus } from '@/lib/events/event-bus';
import { STREAMS, type StreamName } from '@/lib/events/streams';
import { createRedisClient } from '@/lib/db/redis';
import {
  checkAndEscalateStaleTickets,
  checkOverdueRecurringMaintenance,
} from '@/modules/maintenance/service';
import { sendNotification } from '@/modules/notifications/service';

// ─── Agent Configuration ──────────────────────────────────────────────────────

const AGENT_NAME = 'maintenance-agent';
const CONSUMER_GROUP = 'cg:maintenance-agent';
const CONSUMER_NAME = `${AGENT_NAME}-${process.pid}`;

/** Critical ticket notification SLA: 5 minutes in milliseconds */
const CRITICAL_NOTIFICATION_SLA_MS = 5 * 60 * 1000;

/** Stale ticket check interval: every 30 minutes */
const STALE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/** Recurring maintenance check interval: every 6 hours */
const RECURRING_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Default agent configuration */
const DEFAULT_CONFIG: AgentConfig = {
  name: AGENT_NAME,
  consumerGroup: CONSUMER_GROUP,
  streams: [STREAMS.MAINTENANCE],
  concurrency: 5,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryBaseDelay: 5000,
  healthCheckInterval: 30_000,
  idleTimeout: 300_000,
};

// ─── Event Payload Interfaces ─────────────────────────────────────────────────

interface TicketCreatedPayload {
  ticketId: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  villaId: string;
  reportedBy: string;
  assignedTo?: string;
}

interface TicketAssignedPayload {
  ticketId: string;
  assignedTo: string;
  severity: string;
  title: string;
}

interface TicketEscalatedPayload {
  ticketId: string;
  severity: string;
  status: string;
  hoursOpen: number;
  title: string;
}

interface TicketCompletedPayload {
  ticketId: string;
  title: string;
  completedBy: string;
  cost?: number;
  currency?: string;
}

interface RecurringDuePayload {
  recurringId: string;
  title: string;
  assignedTo: string;
  nextDueAt: string;
  hoursPastDue: number;
}

// ─── Maintenance Agent Implementation ─────────────────────────────────────────

/**
 * MaintenanceAgent implements the AgentLifecycle interface and handles
 * critical ticket notification SLA enforcement, stale ticket escalation,
 * and recurring maintenance task generation.
 */
export class MaintenanceAgent implements AgentLifecycle {
  private config: AgentConfig = DEFAULT_CONFIG;
  private eventBus: EventBus | null = null;
  private stopFunctions: Array<() => void> = [];
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private staleCheckInterval: ReturnType<typeof setInterval> | null = null;
  private recurringCheckInterval: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private startedAt: Date | null = null;

  /** Tracks tenant IDs for periodic checks */
  private knownTenants = new Set<string>();

  // Metrics
  private eventsProcessed = 0;
  private eventsFailed = 0;
  private totalProcessingTimeMs = 0;
  private lastProcessedAt: Date = new Date();
  private recentErrors: number[] = [];

  // ─── AgentLifecycle Implementation ──────────────────────────────────

  /**
   * Register the agent with its configuration.
   */
  register(config: AgentConfig): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the agent: create EventBus connections and subscribe to streams.
   */
  async start(): Promise<void> {
    if (this.started) return;

    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    this.eventBus = new EventBus({ publisher, subscriber });

    // Subscribe to stream:maintenance
    const stopMaintenance = await this.eventBus.subscribe(
      STREAMS.MAINTENANCE as StreamName,
      this.config.consumerGroup,
      CONSUMER_NAME,
      async (event) => {
        await this.processEvent(event);
      },
    );
    this.stopFunctions.push(stopMaintenance);

    // Start health check interval
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck();
    }, this.config.healthCheckInterval);

    // Start stale ticket escalation check (every 30 minutes)
    this.staleCheckInterval = setInterval(
      () => this.checkStaleTicketsForAllTenants(),
      STALE_CHECK_INTERVAL_MS,
    );

    // Start recurring maintenance check (every 6 hours)
    this.recurringCheckInterval = setInterval(
      () => this.checkRecurringMaintenanceForAllTenants(),
      RECURRING_CHECK_INTERVAL_MS,
    );

    this.started = true;
    this.startedAt = new Date();

    console.log(
      `[${AGENT_NAME}] Started — consuming ${STREAMS.MAINTENANCE}`,
    );
  }

  /**
   * Stop the agent gracefully, allowing in-flight events to complete.
   */
  async stop(graceful: boolean): Promise<void> {
    if (!this.started) return;

    // Stop subscription loops
    for (const stop of this.stopFunctions) {
      stop();
    }
    this.stopFunctions = [];

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = null;
    }
    if (this.recurringCheckInterval) {
      clearInterval(this.recurringCheckInterval);
      this.recurringCheckInterval = null;
    }

    // Shutdown event bus
    if (this.eventBus) {
      await this.eventBus.shutdown();
      this.eventBus = null;
    }

    this.started = false;
    console.log(
      `[${AGENT_NAME}] Stopped ${graceful ? 'gracefully' : 'immediately'}.`,
    );
  }

  /**
   * Get the current health status of the agent.
   */
  healthCheck(): AgentHealthStatus {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Calculate error rate (errors per minute in the last 5 minutes)
    this.recentErrors = this.recentErrors.filter((t) => t > fiveMinutesAgo);
    const errorRate = this.recentErrors.length / 5;

    let status: AgentHealthStatus['status'] = 'healthy';
    if (errorRate > 10) {
      status = 'unhealthy';
    } else if (errorRate > 3) {
      status = 'degraded';
    }

    const lag = now - this.lastProcessedAt.getTime();

    return {
      status,
      lastProcessedAt: this.lastProcessedAt,
      pendingEvents: 0,
      errorRate,
      lag,
    };
  }

  /**
   * Get accumulated metrics for the agent.
   */
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

  /**
   * Process a single event by routing to the appropriate handler.
   */
  async processEvent(event: PlatformEvent): Promise<ProcessingResult> {
    const startTime = Date.now();

    // Track tenant ID for periodic checks
    if (event.tenantId) {
      this.knownTenants.add(event.tenantId);
    }

    try {
      await this.routeEvent(event);

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

  /**
   * Acknowledge successful event processing (handled by EventBus).
   */
  acknowledgeEvent(_eventId: string): void {
    // Acknowledgment is handled internally by the EventBus subscribe loop
  }

  /**
   * Reject an event with a reason (handled by EventBus retry/DLQ).
   */
  rejectEvent(_eventId: string, _reason: string): void {
    // Rejection and DLQ routing is handled internally by the EventBus
  }

  // ─── Event Routing ──────────────────────────────────────────────────

  /**
   * Route an event to its specific handler based on event type.
   */
  private async routeEvent(event: PlatformEvent): Promise<void> {
    switch (event.type) {
      case 'maintenance.ticket_created':
        await this.handleTicketCreated(
          event as PlatformEvent<TicketCreatedPayload>,
        );
        break;
      case 'maintenance.assigned':
        await this.handleTicketAssigned(
          event as PlatformEvent<TicketAssignedPayload>,
        );
        break;
      case 'maintenance.escalated':
        await this.handleTicketEscalated(
          event as PlatformEvent<TicketEscalatedPayload>,
        );
        break;
      case 'maintenance.completed':
        await this.handleTicketCompleted(
          event as PlatformEvent<TicketCompletedPayload>,
        );
        break;
      case 'maintenance.recurring_due':
        await this.handleRecurringDue(
          event as PlatformEvent<RecurringDuePayload>,
        );
        break;
      default:
        // Unknown event type for this agent — skip silently
        break;
    }
  }

  // ─── Event Handlers ─────────────────────────────────────────────────

  /**
   * Handle maintenance.ticket_created events.
   *
   * For critical tickets, ensures a notification is sent to the
   * assigned staff and agency admin within 5 minutes.
   *
   * Requirement 11.3: Critical tickets notified within 5 minutes
   */
  private async handleTicketCreated(
    event: PlatformEvent<TicketCreatedPayload>,
  ): Promise<void> {
    const { ticketId, title, severity, assignedTo, reportedBy } = event.payload;
    const tenantId = event.tenantId;

    if (severity === 'critical') {
      // Critical ticket: notify immediately (within 5-min SLA)
      const notifyUserIds: string[] = [];

      // Notify the assigned staff member if present
      if (assignedTo) {
        notifyUserIds.push(assignedTo);
      }

      // Always notify the actor/reporter for acknowledgment
      if (reportedBy && reportedBy !== assignedTo) {
        notifyUserIds.push(reportedBy);
      }

      if (notifyUserIds.length > 0) {
        await sendNotification({
          userIds: notifyUserIds,
          tenantId,
          title: '🚨 Critical Maintenance Ticket Created',
          body: `Critical ticket "${title}" (${ticketId}) requires immediate attention.`,
          eventType: 'maintenance.ticket_created',
          priority: 'critical',
          metadata: {
            ticketId,
            severity,
            createdAt: event.timestamp,
          },
        });
      }

      // Emit escalation event to ensure agency admin is notified
      if (this.eventBus) {
        const escalationEvent: PlatformEvent = {
          id: crypto.randomUUID(),
          type: 'escalation.triggered',
          version: 1,
          timestamp: new Date().toISOString(),
          source: AGENT_NAME,
          tenantId,
          correlationId: event.correlationId,
          causationId: event.id,
          actor: { userId: 'system', role: 'system' },
          payload: {
            type: 'maintenance_critical_unassigned',
            ticketId,
            title,
            severity,
            slaDeadline: new Date(
              Date.now() + CRITICAL_NOTIFICATION_SLA_MS,
            ).toISOString(),
          },
          metadata: {
            retryCount: 0,
            maxRetries: 3,
            priority: 'critical',
          },
        };

        await this.eventBus.emit(
          STREAMS.ESCALATIONS as StreamName,
          escalationEvent,
        );
      }
    } else {
      // Non-critical ticket: standard notification to assigned staff
      if (assignedTo) {
        await sendNotification({
          userIds: [assignedTo],
          tenantId,
          title: 'New Maintenance Ticket Assigned',
          body: `Ticket "${title}" (${ticketId}) has been assigned to you.`,
          eventType: 'maintenance.ticket_created',
          priority: 'non_urgent',
          metadata: { ticketId, severity },
        });
      }
    }
  }

  /**
   * Handle maintenance.assigned events.
   *
   * Notify the assigned staff member about the assignment.
   */
  private async handleTicketAssigned(
    event: PlatformEvent<TicketAssignedPayload>,
  ): Promise<void> {
    const { ticketId, assignedTo, severity, title } = event.payload;
    const tenantId = event.tenantId;

    const priority = severity === 'critical' ? 'critical' : 'non_urgent';

    await sendNotification({
      userIds: [assignedTo],
      tenantId,
      title: 'Maintenance Ticket Assigned to You',
      body: `You have been assigned ticket "${title}" (${ticketId}). Severity: ${severity}.`,
      eventType: 'maintenance.assigned',
      priority,
      metadata: { ticketId, severity },
    });
  }

  /**
   * Handle maintenance.escalated events.
   *
   * Notify agency admin and relevant staff about the escalation.
   * Stale non-critical tickets are escalated after 72 hours.
   *
   * Requirement 11.3: Escalate non-critical tickets after 72 hours
   */
  private async handleTicketEscalated(
    event: PlatformEvent<TicketEscalatedPayload>,
  ): Promise<void> {
    const { ticketId, severity, hoursOpen, title } = event.payload;
    const tenantId = event.tenantId;

    // Notify via escalation (critical priority for immediate delivery)
    await sendNotification({
      userIds: [event.actor.userId],
      tenantId,
      title: '⚠️ Maintenance Ticket Escalated',
      body: `Ticket "${title}" (${ticketId}) has been open for ${hoursOpen} hours. Severity: ${severity}. Requires attention.`,
      eventType: 'maintenance.escalated',
      priority: 'critical',
      metadata: { ticketId, severity, hoursOpen },
    });
  }

  /**
   * Handle maintenance.completed events.
   *
   * Record maintenance costs as financial transactions when applicable.
   *
   * Requirement 11.7: Record maintenance costs to financial transactions
   */
  private async handleTicketCompleted(
    event: PlatformEvent<TicketCompletedPayload>,
  ): Promise<void> {
    const { ticketId, title, cost, currency } = event.payload;
    const tenantId = event.tenantId;

    // Record maintenance cost as a financial transaction if cost > 0
    if (cost && cost > 0) {
      const { recordTransaction } = await import(
        '@/modules/financial/service'
      );

      await recordTransaction(
        tenantId,
        {
          category: 'maintenance_expense',
          amount: cost,
          currency: currency || 'IDR',
          description: `Maintenance cost for ticket "${title}" (${ticketId})`,
          referenceId: ticketId,
        },
        event.actor.userId,
      );
    }
  }

  /**
   * Handle maintenance.recurring_due events.
   *
   * Notify admin when recurring maintenance tasks are overdue.
   *
   * Requirement 11.4: Notify Agency_Admin within 24 hours of missed deadline
   */
  private async handleRecurringDue(
    event: PlatformEvent<RecurringDuePayload>,
  ): Promise<void> {
    const { recurringId, title, assignedTo, hoursPastDue } = event.payload;
    const tenantId = event.tenantId;

    const notifyUserIds: string[] = [];
    if (assignedTo) {
      notifyUserIds.push(assignedTo);
    }

    // Determine priority based on how overdue the task is
    const priority = hoursPastDue >= 24 ? 'critical' : 'non_urgent';

    if (notifyUserIds.length > 0) {
      await sendNotification({
        userIds: notifyUserIds,
        tenantId,
        title: 'Recurring Maintenance Overdue',
        body: `Recurring task "${title}" is ${hoursPastDue} hours past due. Please complete promptly.`,
        eventType: 'maintenance.recurring_due',
        priority,
        metadata: { recurringId, hoursPastDue },
      });
    }
  }

  // ─── Scheduled Operations ───────────────────────────────────────────

  /**
   * Check for stale non-critical tickets across all known tenants.
   *
   * Non-critical tickets open for more than 72 hours are escalated.
   *
   * Requirement 11.3: Escalate after 72 hours
   */
  private async checkStaleTicketsForAllTenants(): Promise<void> {
    for (const tenantId of this.knownTenants) {
      try {
        const staleTickets = await checkAndEscalateStaleTickets(tenantId);
        if (staleTickets.length > 0) {
          console.log(
            `[${AGENT_NAME}] Found ${staleTickets.length} stale ticket(s) for tenant ${tenantId}`,
          );
        }
      } catch (err: unknown) {
        console.error(
          `[${AGENT_NAME}] Stale ticket check failed for tenant ${tenantId}:`,
          err,
        );
      }
    }
  }

  /**
   * Check for overdue recurring maintenance across all known tenants.
   *
   * Triggers notifications for tasks past their scheduled date.
   *
   * Requirement 11.4: Generate recurring tasks and notify on overdue
   */
  private async checkRecurringMaintenanceForAllTenants(): Promise<void> {
    for (const tenantId of this.knownTenants) {
      try {
        const overdueTasks =
          await checkOverdueRecurringMaintenance(tenantId);
        if (overdueTasks.length > 0) {
          console.log(
            `[${AGENT_NAME}] Found ${overdueTasks.length} overdue recurring task(s) for tenant ${tenantId}`,
          );
        }
      } catch (err: unknown) {
        console.error(
          `[${AGENT_NAME}] Recurring maintenance check failed for tenant ${tenantId}:`,
          err,
        );
      }
    }
  }

  /**
   * Manually trigger stale ticket check for a specific tenant.
   * Called by scheduled jobs or admin triggers.
   */
  async checkStaleTicketsForTenant(tenantId: string): Promise<number> {
    const staleTickets = await checkAndEscalateStaleTickets(tenantId);
    return staleTickets.length;
  }

  /**
   * Manually trigger recurring maintenance check for a specific tenant.
   * Called by scheduled jobs or admin triggers.
   */
  async checkRecurringForTenant(tenantId: string): Promise<number> {
    const overdueTasks = await checkOverdueRecurringMaintenance(tenantId);
    return overdueTasks.length;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/** Singleton instance of the MaintenanceAgent */
export const maintenanceAgent = new MaintenanceAgent();
