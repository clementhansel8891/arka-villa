/**
 * Escalation Agent
 *
 * Event-driven consumer that monitors SLA breaches and coordinates
 * escalation across the platform. Subscribes to `stream:escalations`,
 * `stream:staff`, `stream:maintenance`, and `stream:notifications`.
 *
 * Responsibilities:
 * - Monitor task deadlines (15-min overdue SLA)
 * - Monitor unresponded guest messages (30-min during business hours)
 * - Monitor maintenance SLA breaches (72h non-critical, 5min critical)
 * - Monitor expense approval timeouts (48h owner response)
 * - Track escalation acknowledgment and re-escalate after 2 hours
 * - Emit `escalation.triggered` events to `stream:escalations`
 *
 * Requirements: 10.4, 11.7, 12.5, 4.5
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
import { createRedisClient } from '@/lib/db/redis';
import { publicQuery, tenantQuery } from '@/lib/db';
import { checkAndEscalateOverdueTasks } from '@/modules/staff/service';
import { checkAndEscalateStaleTickets } from '@/modules/maintenance/service';
import { runEscalationCheckAllTenants } from '@/modules/notifications/messaging/escalation';

// ─── Agent Configuration ──────────────────────────────────────────────────────

const AGENT_NAME = 'escalation-agent';
const CONSUMER_GROUP = 'cg:escalation-agent';
const CONSUMER_NAME = `${AGENT_NAME}-${process.pid}`;

/** Polling interval for escalation checks: 1 minute */
const POLLING_INTERVAL_MS = 60 * 1000;

/** Re-escalation timeout for unacknowledged escalations: 2 hours */
const RE_ESCALATION_TIMEOUT_MS = 2 * 60 * 60 * 1000;

/** Expense approval timeout: 48 hours */
const EXPENSE_APPROVAL_TIMEOUT_HOURS = 48;

/** Critical maintenance unassigned threshold: 5 minutes */
const CRITICAL_UNASSIGNED_THRESHOLD_MINUTES = 5;

/** Default configuration for the Escalation Agent */
const DEFAULT_CONFIG: AgentConfig = {
  name: AGENT_NAME,
  consumerGroup: CONSUMER_GROUP,
  streams: [STREAMS.ESCALATIONS, STREAMS.STAFF, STREAMS.MAINTENANCE, STREAMS.NOTIFICATIONS],
  concurrency: 3,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryBaseDelay: 5000,
  healthCheckInterval: 30_000,
  idleTimeout: 300_000,
};

// ─── Event Payload Interfaces ─────────────────────────────────────────────────

interface EscalationTriggeredPayload {
  escalationType: string;
  targetId: string;
  tenantId: string;
  reason: string;
  targets: string[];
  details: Record<string, unknown>;
}

interface EscalationAcknowledgedPayload {
  escalationId: string;
  acknowledgedBy: string;
}

interface ExpenseApprovalPayload {
  expenseId: string;
  tenantId: string;
  amount: number;
  requestedAt: string;
  ownerId: string;
}

/** In-memory tracking of unacknowledged escalations for re-escalation */
interface TrackedEscalation {
  escalationId: string;
  tenantId: string;
  triggeredAt: Date;
  type: string;
  targetId: string;
  reason: string;
  acknowledged: boolean;
}

// ─── Escalation Agent Implementation ──────────────────────────────────────────

/**
 * EscalationAgent implements the AgentLifecycle interface and coordinates
 * all platform escalation monitoring on a 1-minute polling schedule.
 *
 * It delegates to existing service functions:
 * - `checkAndEscalateOverdueTasks()` for task deadlines
 * - `checkAndEscalateStaleTickets()` for maintenance SLA
 * - `runEscalationCheckAllTenants()` for guest message escalation
 *
 * Additionally, it monitors:
 * - Critical maintenance tickets unassigned for 5+ minutes
 * - Expense approvals without owner response for 48+ hours
 * - Unacknowledged escalations for re-escalation after 2 hours
 */
export class EscalationAgent implements AgentLifecycle {
  private config: AgentConfig = DEFAULT_CONFIG;
  private eventBus: EventBus | null = null;
  private stopFunctions: Array<() => void> = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private startedAt: Date | null = null;

  // Tracked unacknowledged escalations for re-escalation
  private trackedEscalations: Map<string, TrackedEscalation> = new Map();

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
   * Start the agent: create EventBus connections, subscribe to streams,
   * and begin the periodic escalation polling loop.
   */
  async start(): Promise<void> {
    if (this.started) return;

    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    this.eventBus = new EventBus({ publisher, subscriber });

    // Subscribe to stream:escalations
    const stopEscalations = await this.eventBus.subscribe(
      STREAMS.ESCALATIONS as StreamName,
      this.config.consumerGroup,
      CONSUMER_NAME,
      async (event) => { await this.processEvent(event); },
    );
    this.stopFunctions.push(stopEscalations);

    // Subscribe to stream:staff
    const stopStaff = await this.eventBus.subscribe(
      STREAMS.STAFF as StreamName,
      this.config.consumerGroup,
      CONSUMER_NAME,
      async (event) => { await this.processEvent(event); },
    );
    this.stopFunctions.push(stopStaff);

    // Subscribe to stream:maintenance
    const stopMaintenance = await this.eventBus.subscribe(
      STREAMS.MAINTENANCE as StreamName,
      this.config.consumerGroup,
      CONSUMER_NAME,
      async (event) => { await this.processEvent(event); },
    );
    this.stopFunctions.push(stopMaintenance);

    // Subscribe to stream:notifications
    const stopNotifications = await this.eventBus.subscribe(
      STREAMS.NOTIFICATIONS as StreamName,
      this.config.consumerGroup,
      CONSUMER_NAME,
      async (event) => { await this.processEvent(event); },
    );
    this.stopFunctions.push(stopNotifications);

    // Start the periodic escalation check (every 1 minute)
    this.pollingInterval = setInterval(
      () => { void this.runPeriodicEscalationChecks(); },
      POLLING_INTERVAL_MS,
    );

    // Start health check interval
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck();
    }, this.config.healthCheckInterval);

    this.started = true;
    this.startedAt = new Date();
  }

  /**
   * Stop the agent gracefully.
   */
  async stop(graceful: boolean): Promise<void> {
    if (!this.started) return;

    // Stop subscription loops
    for (const stop of this.stopFunctions) {
      stop();
    }
    this.stopFunctions = [];

    // Clear intervals
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Shutdown event bus
    if (this.eventBus) {
      await this.eventBus.shutdown();
      this.eventBus = null;
    }

    this.trackedEscalations.clear();
    this.started = false;
  }

  /**
   * Get current health status.
   */
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

    return {
      status,
      lastProcessedAt: this.lastProcessedAt,
      pendingEvents: 0,
      errorRate,
      lag,
    };
  }

  /**
   * Get accumulated metrics.
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
      case 'escalation.acknowledged':
        this.handleEscalationAcknowledged(event as PlatformEvent<EscalationAcknowledgedPayload>);
        break;
      case 'escalation.resolved':
        this.handleEscalationResolved(event as PlatformEvent<EscalationAcknowledgedPayload>);
        break;
      case 'staff.task_overdue':
        await this.handleTaskOverdue(event);
        break;
      case 'maintenance.ticket_created':
        await this.handleMaintenanceTicketCreated(event);
        break;
      case 'maintenance.escalated':
        await this.trackEscalation(event);
        break;
      default:
        // Unknown event type for this agent — skip silently
        break;
    }
  }

  // ─── Event Handlers ─────────────────────────────────────────────────

  /**
   * Handle escalation acknowledgment — mark tracked escalation as acknowledged.
   */
  private handleEscalationAcknowledged(
    event: PlatformEvent<EscalationAcknowledgedPayload>,
  ): void {
    const { escalationId } = event.payload;
    const tracked = this.trackedEscalations.get(escalationId);
    if (tracked) {
      tracked.acknowledged = true;
    }
  }

  /**
   * Handle escalation resolved — remove from tracking.
   */
  private handleEscalationResolved(
    event: PlatformEvent<EscalationAcknowledgedPayload>,
  ): void {
    const { escalationId } = event.payload;
    this.trackedEscalations.delete(escalationId);
  }

  /**
   * Handle overdue task events emitted by the staff service.
   * Track for re-escalation if not acknowledged within 2 hours.
   */
  private async handleTaskOverdue(event: PlatformEvent): Promise<void> {
    await this.trackEscalation(event);
  }

  /**
   * Handle critical maintenance ticket creation — monitor for
   * unassigned state beyond 5-minute threshold.
   */
  private async handleMaintenanceTicketCreated(event: PlatformEvent): Promise<void> {
    // Track critical tickets for the 5-min unassigned check
    const payload = event.payload as { severity?: string; ticketId?: string; title?: string };
    if (payload.severity === 'critical') {
      await this.trackEscalation(event);
    }
  }

  /**
   * Track an escalation event for re-escalation monitoring.
   */
  private async trackEscalation(event: PlatformEvent): Promise<void> {
    const escalationId = event.id;
    const payload = event.payload as Record<string, unknown>;

    this.trackedEscalations.set(escalationId, {
      escalationId,
      tenantId: event.tenantId,
      triggeredAt: new Date(),
      type: event.type,
      targetId: (payload.taskId ?? payload.ticketId ?? payload.messageId ?? '') as string,
      reason: (payload.reason ?? event.type) as string,
      acknowledged: false,
    });
  }

  // ─── Periodic Escalation Checks ────────────────────────────────────

  /**
   * Run all periodic escalation checks across all active tenants.
   * Executed every 1 minute.
   *
   * Coordinates:
   * 1. Task deadline escalations (15-min overdue)
   * 2. Guest message escalations (30-min during business hours)
   * 3. Maintenance SLA escalations (72h non-critical)
   * 4. Critical maintenance unassigned (5-min)
   * 5. Expense approval timeouts (48h)
   * 6. Re-escalation of unacknowledged escalations (2h)
   */
  async runPeriodicEscalationChecks(): Promise<void> {
    try {
      const tenants = await this.getActiveTenants();

      for (const tenantId of tenants) {
        await this.checkTaskDeadlines(tenantId);
        await this.checkMaintenanceSLA(tenantId);
        await this.checkCriticalMaintenanceUnassigned(tenantId);
        await this.checkExpenseApprovalTimeouts(tenantId);
      }

      // Guest message escalation runs across all tenants at once
      await this.checkGuestMessageEscalations();

      // Re-escalation check (not tenant-specific, uses in-memory tracking)
      await this.checkUnacknowledgedEscalations();
    } catch (err: unknown) {
      console.error(
        `[${AGENT_NAME}] Periodic escalation check failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Check task deadlines — tasks overdue by 15+ minutes.
   * Delegates to existing staff service function.
   *
   * Requirement: 10.4
   */
  private async checkTaskDeadlines(tenantId: string): Promise<void> {
    try {
      await checkAndEscalateOverdueTasks(tenantId);
    } catch (err: unknown) {
      console.error(
        `[${AGENT_NAME}] Task deadline check failed for tenant ${tenantId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Check guest message escalations — unresponded 30+ minutes during business hours.
   * Delegates to existing notification messaging escalation function.
   *
   * Requirement: 12.5
   */
  private async checkGuestMessageEscalations(): Promise<void> {
    try {
      await runEscalationCheckAllTenants(this.eventBus ?? undefined);
    } catch (err: unknown) {
      console.error(
        `[${AGENT_NAME}] Guest message escalation check failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Check maintenance SLA — non-critical tickets stale for 72+ hours.
   * Delegates to existing maintenance service function.
   *
   * Requirement: 11.7
   */
  private async checkMaintenanceSLA(tenantId: string): Promise<void> {
    try {
      await checkAndEscalateStaleTickets(tenantId);
    } catch (err: unknown) {
      console.error(
        `[${AGENT_NAME}] Maintenance SLA check failed for tenant ${tenantId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Check for critical maintenance tickets that remain unassigned
   * for more than 5 minutes.
   *
   * Requirement: 11.3 (critical ticket notification within 5 min)
   */
  private async checkCriticalMaintenanceUnassigned(tenantId: string): Promise<void> {
    try {
      const result = await tenantQuery<{
        id: string;
        title: string;
        severity: string;
        created_at: string;
      }>(
        tenantId,
        `SELECT id, title, severity, created_at
         FROM maintenance_tickets
         WHERE severity = 'critical'
           AND status = 'open'
           AND assigned_to IS NULL
           AND created_at < NOW() - INTERVAL '${CRITICAL_UNASSIGNED_THRESHOLD_MINUTES} minutes'`,
        [],
      );

      for (const ticket of result.rows) {
        await this.emitEscalationEvent(tenantId, {
          escalationType: 'maintenance_critical_unassigned',
          targetId: ticket.id,
          tenantId,
          reason: `Critical maintenance ticket "${ticket.title}" unassigned for 5+ minutes`,
          targets: ['agency_admin', 'maintenance_staff'],
          details: {
            ticketId: ticket.id,
            title: ticket.title,
            severity: ticket.severity,
            createdAt: ticket.created_at,
          },
        });
      }
    } catch (err: unknown) {
      console.error(
        `[${AGENT_NAME}] Critical maintenance unassigned check failed for tenant ${tenantId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Check for expense approvals pending owner response for 48+ hours.
   * Escalates to Agency_Admin if owner has not responded.
   *
   * Requirement: 4.5
   */
  private async checkExpenseApprovalTimeouts(tenantId: string): Promise<void> {
    try {
      const result = await tenantQuery<{
        id: string;
        amount: number;
        requested_at: string;
        owner_id: string;
        description: string;
      }>(
        tenantId,
        `SELECT id, amount, requested_at, owner_id, description
         FROM expense_approvals
         WHERE status = 'pending'
           AND requested_at < NOW() - INTERVAL '${EXPENSE_APPROVAL_TIMEOUT_HOURS} hours'`,
        [],
      );

      for (const expense of result.rows) {
        await this.emitEscalationEvent(tenantId, {
          escalationType: 'expense_approval_timeout',
          targetId: expense.id,
          tenantId,
          reason: `Expense approval (${expense.description}) awaiting owner response for 48+ hours`,
          targets: ['agency_admin'],
          details: {
            expenseId: expense.id,
            amount: expense.amount,
            requestedAt: expense.requested_at,
            ownerId: expense.owner_id,
            description: expense.description,
          },
        });
      }
    } catch (err: unknown) {
      console.error(
        `[${AGENT_NAME}] Expense approval timeout check failed for tenant ${tenantId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Re-escalate any tracked escalations that remain unacknowledged
   * after 2 hours.
   *
   * Requirement: Escalation Agent rule — re-escalate after 2h
   */
  private async checkUnacknowledgedEscalations(): Promise<void> {
    const now = Date.now();

    for (const [id, tracked] of this.trackedEscalations) {
      if (tracked.acknowledged) continue;

      const elapsedMs = now - tracked.triggeredAt.getTime();
      if (elapsedMs >= RE_ESCALATION_TIMEOUT_MS) {
        try {
          await this.emitEscalationEvent(tracked.tenantId, {
            escalationType: 'escalation_unacknowledged',
            targetId: tracked.targetId,
            tenantId: tracked.tenantId,
            reason: `Escalation unacknowledged for 2+ hours: ${tracked.reason}`,
            targets: ['agency_admin'],
            details: {
              originalEscalationId: tracked.escalationId,
              originalType: tracked.type,
              triggeredAt: tracked.triggeredAt.toISOString(),
              hoursUnacknowledged: Math.round(elapsedMs / (1000 * 60 * 60)),
            },
          });

          // Remove from tracking after re-escalation to avoid infinite loops
          // The new escalation event will be tracked if needed
          this.trackedEscalations.delete(id);
        } catch (err: unknown) {
          console.error(
            `[${AGENT_NAME}] Re-escalation failed for ${id}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  /**
   * Emit an escalation.triggered event to stream:escalations.
   */
  private async emitEscalationEvent(
    tenantId: string,
    payload: EscalationTriggeredPayload,
  ): Promise<void> {
    if (!this.eventBus) return;

    const event: PlatformEvent<EscalationTriggeredPayload> = {
      id: uuidv4(),
      type: 'escalation.triggered',
      version: 1,
      timestamp: new Date().toISOString(),
      source: AGENT_NAME,
      tenantId,
      correlationId: payload.targetId || uuidv4(),
      actor: {
        userId: 'system',
        role: 'system',
      },
      payload,
      metadata: {
        retryCount: 0,
        maxRetries: 3,
        priority: 'high',
      },
    };

    await this.eventBus.emit(STREAMS.ESCALATIONS as StreamName, event);

    // Track the emitted escalation for re-escalation monitoring
    this.trackedEscalations.set(event.id, {
      escalationId: event.id,
      tenantId,
      triggeredAt: new Date(),
      type: payload.escalationType,
      targetId: payload.targetId,
      reason: payload.reason,
      acknowledged: false,
    });
  }

  /**
   * Fetch all active tenant IDs from the public schema.
   */
  private async getActiveTenants(): Promise<string[]> {
    try {
      const result = await publicQuery<{ id: string }>(
        `SELECT id FROM tenants WHERE status = 'active'`,
      );
      return result.rows.map((row) => row.id);
    } catch (err: unknown) {
      console.error(
        `[${AGENT_NAME}] Failed to fetch active tenants:`,
        err instanceof Error ? err.message : err,
      );
      return [];
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/** Singleton instance of the EscalationAgent */
export const escalationAgent = new EscalationAgent();
