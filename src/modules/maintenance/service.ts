/**
 * Maintenance service — business logic orchestration.
 *
 * Coordinates ticket creation, lifecycle transitions, recurring
 * maintenance scheduling, escalation, cost tracking, and event emission.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

import { v4 as uuidv4 } from 'uuid';

import { EventBus } from '@/lib/events/event-bus';
import { STREAMS } from '@/lib/events/streams';
import type { PlatformEvent } from '@/lib/events/types';
import { createRedisClient } from '@/lib/db/redis';
import {
  createTicket,
  getTicketById,
  listTickets,
  updateTicketStatus,
  getStaleNonCriticalTickets,
  getTotalCosts,
  listRecurringMaintenance,
  getOverdueRecurringTasks,
  completeRecurringTask,
} from './repository';
import type {
  MaintenanceTicket,
  RecurringMaintenance,
  TicketSeverity,
  TicketStatus,
  CompletionEvidence,
  CreateTicketRequest,
  UpdateTicketStatusRequest,
  GetTicketsQuery,
  GetScheduleQuery,
  TicketCreatedPayload,
  TicketAssignedPayload,
  TicketCompletedPayload,
  TicketEscalatedPayload,
  RecurringDuePayload,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum description length. Requirement 11.2 */
const MAX_DESCRIPTION_LENGTH = 2000;

/** Maximum photo attachments per ticket. Requirement 11.2 */
const MAX_PHOTOS = 10;

/** Maximum photo size in bytes (10 MB). Requirement 11.2 */
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

/** Hours before non-critical ticket escalation. Requirement 11.7 */
const NON_CRITICAL_ESCALATION_HOURS = 72;

/** Hours within which missed recurring deadline triggers notification. Requirement 11.4 */
const RECURRING_MISSED_DEADLINE_HOURS = 24;

/** Minutes within which critical ticket must notify. Requirement 11.3 */
const CRITICAL_NOTIFICATION_MINUTES = 5;

/** Valid lifecycle transitions. Requirement 11.1 */
const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const VALID_SEVERITIES: TicketSeverity[] = ['critical', 'high', 'medium', 'low'];

// ─── Error Classes ────────────────────────────────────────────────────────────

export class MaintenanceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_ERROR'
      | 'NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'EVIDENCE_REQUIRED'
      | 'INTERNAL_ERROR',
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'MaintenanceError';
  }
}

// ─── Event Emission Helper ────────────────────────────────────────────────────

let eventBusInstance: EventBus | null = null;

async function getEventBus(): Promise<EventBus> {
  if (!eventBusInstance) {
    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    eventBusInstance = new EventBus({ publisher, subscriber });
  }
  return eventBusInstance;
}

async function emitMaintenanceEvent<T>(
  type: string,
  tenantId: string,
  payload: T,
  actorUserId: string,
  actorRole: string,
  priority: 'critical' | 'high' | 'normal' | 'low' = 'normal',
  correlationId?: string
): Promise<void> {
  try {
    const eventBus = await getEventBus();

    const event: PlatformEvent<T> = {
      id: uuidv4(),
      type,
      version: 1,
      timestamp: new Date().toISOString(),
      source: 'maintenance',
      tenantId,
      correlationId: correlationId ?? uuidv4(),
      actor: {
        userId: actorUserId,
        role: actorRole,
      },
      payload,
      metadata: {
        retryCount: 0,
        maxRetries: 3,
        priority,
      },
    };

    await eventBus.emit(STREAMS.MAINTENANCE, event);
  } catch {
    // Event emission failure should not break the maintenance operation flow.
    console.error(`[Maintenance] Failed to emit event: ${type}`);
  }
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Create a new maintenance ticket.
 *
 * Validates:
 * - Severity is valid
 * - Description within 2000 character limit
 * - Photos within 10 attachment limit
 *
 * Emits: maintenance.ticket_created
 * Critical tickets also emit to notifications stream for 5-min SLA.
 *
 * Requirements: 11.1, 11.2, 11.3
 */
export async function createMaintenanceTicket(
  tenantId: string,
  request: CreateTicketRequest,
  actorUserId: string,
  actorRole: string
): Promise<MaintenanceTicket> {
  // Validate title
  if (!request.title || request.title.trim().length === 0) {
    throw new MaintenanceError('title is required', 'VALIDATION_ERROR');
  }

  // Validate severity
  if (!request.severity || !VALID_SEVERITIES.includes(request.severity)) {
    throw new MaintenanceError(
      `severity must be one of: ${VALID_SEVERITIES.join(', ')}`,
      'VALIDATION_ERROR'
    );
  }

  // Validate description length
  if (request.description && request.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new MaintenanceError(
      `description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`,
      'VALIDATION_ERROR'
    );
  }

  // Validate photos count
  const photos = request.photos ?? [];
  if (photos.length > MAX_PHOTOS) {
    throw new MaintenanceError(
      `maximum ${MAX_PHOTOS} photo attachments allowed`,
      'VALIDATION_ERROR'
    );
  }

  // Create ticket
  const ticket = await createTicket(
    tenantId,
    actorUserId,
    request.title.trim(),
    request.description ?? null,
    request.severity,
    photos
  );

  // Emit ticket created event
  const eventPayload: TicketCreatedPayload = {
    ticketId: ticket.id,
    reportedBy: actorUserId,
    severity: ticket.severity,
    title: ticket.title,
  };

  // Critical tickets get high-priority event for 5-min notification SLA
  const eventPriority = ticket.severity === 'critical' ? 'critical' : 'normal';

  await emitMaintenanceEvent(
    'maintenance.ticket_created',
    tenantId,
    eventPayload,
    actorUserId,
    actorRole,
    eventPriority,
    ticket.id
  );

  // For critical tickets, also emit to notifications stream directly
  // to ensure the 5-minute notification SLA (Requirement 11.3)
  if (ticket.severity === 'critical') {
    try {
      const eventBus = await getEventBus();
      const notificationEvent: PlatformEvent<TicketCreatedPayload> = {
        id: uuidv4(),
        type: 'notification.send_requested',
        version: 1,
        timestamp: new Date().toISOString(),
        source: 'maintenance',
        tenantId,
        correlationId: ticket.id,
        actor: { userId: actorUserId, role: actorRole },
        payload: eventPayload,
        metadata: {
          retryCount: 0,
          maxRetries: 3,
          priority: 'critical',
        },
      };
      await eventBus.emit(STREAMS.NOTIFICATIONS, notificationEvent);
    } catch {
      console.error(
        `[Maintenance] Failed to emit critical notification for ticket ${ticket.id}`
      );
    }
  }

  return ticket;
}

/**
 * Update ticket status through the lifecycle.
 *
 * Lifecycle: open → assigned → in_progress → completed → cancelled
 * (cancelled is reachable from any non-terminal state)
 *
 * Requirements: 11.1, 11.5, 11.6
 */
export async function updateMaintenanceTicketStatus(
  tenantId: string,
  request: UpdateTicketStatusRequest,
  actorUserId: string,
  actorRole: string
): Promise<MaintenanceTicket> {
  if (!request.ticketId) {
    throw new MaintenanceError('ticketId is required', 'VALIDATION_ERROR');
  }
  if (!request.status) {
    throw new MaintenanceError('status is required', 'VALIDATION_ERROR');
  }

  // Verify ticket exists
  const existing = await getTicketById(tenantId, request.ticketId);
  if (!existing) {
    throw new MaintenanceError(
      `Ticket not found: ${request.ticketId}`,
      'NOT_FOUND',
      404
    );
  }

  // Validate lifecycle transition
  const allowedTransitions = VALID_TRANSITIONS[existing.status];
  if (!allowedTransitions.includes(request.status)) {
    throw new MaintenanceError(
      `Invalid transition from '${existing.status}' to '${request.status}'. Allowed: ${allowedTransitions.join(', ') || 'none (terminal state)'}`,
      'INVALID_TRANSITION'
    );
  }

  // Requirement 11.6: Completion requires timestamp + photos as evidence
  if (request.status === 'completed') {
    if (!request.completionEvidence || request.completionEvidence.length === 0) {
      throw new MaintenanceError(
        'Completion requires at least one photo as evidence',
        'EVIDENCE_REQUIRED'
      );
    }

    // Validate evidence entries
    for (const item of request.completionEvidence) {
      if (!item.url || item.url.trim().length === 0) {
        throw new MaintenanceError(
          'Completion evidence must include a valid URL',
          'VALIDATION_ERROR'
        );
      }
    }
  }

  // Validate assignment requires assignedTo
  if (request.status === 'assigned' && !request.assignedTo) {
    throw new MaintenanceError(
      'assignedTo is required when transitioning to assigned status',
      'VALIDATION_ERROR'
    );
  }

  // Perform update
  const updated = await updateTicketStatus(tenantId, request.ticketId, request.status, {
    assignedTo: request.assignedTo,
    cost: request.cost,
    completionEvidence: request.completionEvidence,
  });

  if (!updated) {
    throw new MaintenanceError(
      'Failed to update ticket',
      'INTERNAL_ERROR',
      500
    );
  }

  // Emit lifecycle events
  if (request.status === 'assigned' && request.assignedTo) {
    const assignedPayload: TicketAssignedPayload = {
      ticketId: updated.id,
      assignedTo: request.assignedTo,
      severity: updated.severity,
      title: updated.title,
    };
    await emitMaintenanceEvent(
      'maintenance.assigned',
      tenantId,
      assignedPayload,
      actorUserId,
      actorRole,
      updated.severity === 'critical' ? 'critical' : 'normal',
      updated.id
    );
  }

  if (request.status === 'completed') {
    const completedPayload: TicketCompletedPayload = {
      ticketId: updated.id,
      assignedTo: updated.assignedTo,
      completedAt: updated.completedAt ?? new Date().toISOString(),
      cost: updated.cost,
    };
    await emitMaintenanceEvent(
      'maintenance.completed',
      tenantId,
      completedPayload,
      actorUserId,
      actorRole,
      'normal',
      updated.id
    );
  }

  return updated;
}

/**
 * Get maintenance tickets with optional filters.
 */
export async function getMaintenanceTickets(
  tenantId: string,
  query: GetTicketsQuery
): Promise<MaintenanceTicket[]> {
  return listTickets(tenantId, {
    status: query.status,
    severity: query.severity,
    assignedTo: query.assignedTo,
    limit: query.limit,
    offset: query.offset,
  });
}

/**
 * Get a single maintenance ticket by ID.
 */
export async function getMaintenanceTicket(
  tenantId: string,
  ticketId: string
): Promise<MaintenanceTicket> {
  const ticket = await getTicketById(tenantId, ticketId);
  if (!ticket) {
    throw new MaintenanceError(
      `Ticket not found: ${ticketId}`,
      'NOT_FOUND',
      404
    );
  }
  return ticket;
}

/**
 * Get recurring maintenance schedule.
 */
export async function getRecurringSchedule(
  tenantId: string,
  query: GetScheduleQuery
): Promise<RecurringMaintenance[]> {
  return listRecurringMaintenance(
    tenantId,
    query.activeOnly ?? true,
    query.limit ?? 50,
    query.offset ?? 0
  );
}

/**
 * Get maintenance costs for a villa within a date range.
 * Requirement 11.5: Track maintenance costs per villa for financial reports.
 */
export async function getMaintenanceCosts(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<{ total: number }> {
  const total = await getTotalCosts(tenantId, startDate, endDate);
  return { total };
}

/**
 * Check for stale non-critical tickets and trigger escalation.
 *
 * Requirement 11.7: Non-critical tickets in open/assigned status
 * for more than 72 hours trigger escalation to Agency_Admin.
 *
 * This function is called by the escalation agent / scheduled job.
 */
export async function checkAndEscalateStaleTickets(
  tenantId: string
): Promise<MaintenanceTicket[]> {
  const staleTickets = await getStaleNonCriticalTickets(tenantId);

  for (const ticket of staleTickets) {
    const createdAt = new Date(ticket.createdAt);
    const now = new Date();
    const hoursOpen = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursOpen >= NON_CRITICAL_ESCALATION_HOURS) {
      const escalatedPayload: TicketEscalatedPayload = {
        ticketId: ticket.id,
        severity: ticket.severity,
        status: ticket.status,
        hoursOpen: Math.round(hoursOpen),
        title: ticket.title,
      };

      await emitMaintenanceEvent(
        'maintenance.escalated',
        tenantId,
        escalatedPayload,
        'system',
        'system',
        'high',
        ticket.id
      );

      // Also emit to escalations stream
      try {
        const eventBus = await getEventBus();
        const escalationEvent: PlatformEvent<TicketEscalatedPayload> = {
          id: uuidv4(),
          type: 'escalation.triggered',
          version: 1,
          timestamp: new Date().toISOString(),
          source: 'maintenance',
          tenantId,
          correlationId: ticket.id,
          actor: { userId: 'system', role: 'system' },
          payload: escalatedPayload,
          metadata: {
            retryCount: 0,
            maxRetries: 3,
            priority: 'high',
          },
        };
        await eventBus.emit(STREAMS.ESCALATIONS, escalationEvent);
      } catch {
        console.error(
          `[Maintenance] Failed to emit escalation for ticket ${ticket.id}`
        );
      }
    }
  }

  return staleTickets;
}

/**
 * Check for overdue recurring maintenance and trigger notifications.
 *
 * Requirement 11.4: Notify Agency_Admin within 24 hours of missed deadline.
 *
 * This function is called by the maintenance agent / scheduled job.
 */
export async function checkOverdueRecurringMaintenance(
  tenantId: string
): Promise<RecurringMaintenance[]> {
  const overdueTasks = await getOverdueRecurringTasks(tenantId);

  for (const task of overdueTasks) {
    const nextDueAt = new Date(task.nextDueAt);
    const now = new Date();
    const hoursPastDue = (now.getTime() - nextDueAt.getTime()) / (1000 * 60 * 60);

    // Only notify if past due within the 24-hour window
    if (hoursPastDue > 0) {
      const recurringPayload: RecurringDuePayload = {
        recurringId: task.id,
        title: task.title,
        assignedTo: task.assignedTo,
        nextDueAt: task.nextDueAt,
        hoursPastDue: Math.round(hoursPastDue),
      };

      await emitMaintenanceEvent(
        'maintenance.recurring_due',
        tenantId,
        recurringPayload,
        'system',
        'system',
        hoursPastDue >= RECURRING_MISSED_DEADLINE_HOURS ? 'high' : 'normal',
        task.id
      );
    }
  }

  return overdueTasks;
}

/**
 * Mark a recurring maintenance task as completed and advance the schedule.
 */
export async function completeRecurringMaintenanceTask(
  tenantId: string,
  recurringId: string,
  actorUserId: string,
  actorRole: string
): Promise<RecurringMaintenance> {
  const result = await completeRecurringTask(tenantId, recurringId);
  if (!result) {
    throw new MaintenanceError(
      `Recurring maintenance task not found: ${recurringId}`,
      'NOT_FOUND',
      404
    );
  }
  return result;
}
