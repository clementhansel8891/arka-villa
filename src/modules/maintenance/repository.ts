/**
 * Maintenance repository — tenant-scoped database queries.
 *
 * All queries use the tenant-scoped connection helper to ensure
 * data isolation between tenants.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

import { tenantQuery } from '@/lib/db/tenant-query';
import type {
  MaintenanceTicket,
  MaintenanceTicketRow,
  RecurringMaintenance,
  RecurringMaintenanceRow,
  TicketSeverity,
  TicketStatus,
  CompletionEvidence,
} from './types';

// ─── Row → Domain Mappers ─────────────────────────────────────────────────────

function mapTicketRow(row: MaintenanceTicketRow): MaintenanceTicket {
  const photos =
    typeof row.photos === 'string' ? JSON.parse(row.photos) : row.photos ?? [];
  const completionEvidence =
    typeof row.completion_evidence === 'string'
      ? JSON.parse(row.completion_evidence)
      : row.completion_evidence ?? [];

  return {
    id: row.id,
    reportedBy: row.reported_by,
    assignedTo: row.assigned_to,
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description,
    photos,
    cost: row.cost !== null ? parseFloat(row.cost) : null,
    completedAt: row.completed_at,
    completionEvidence: completionEvidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecurringRow(row: RecurringMaintenanceRow): RecurringMaintenance {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    intervalDays: row.interval_days,
    lastCompletedAt: row.last_completed_at,
    nextDueAt: row.next_due_at,
    assignedTo: row.assigned_to,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Ticket Queries ───────────────────────────────────────────────────────────

/**
 * Create a new maintenance ticket.
 */
export async function createTicket(
  tenantId: string,
  reportedBy: string,
  title: string,
  description: string | null,
  severity: TicketSeverity,
  photos: string[]
): Promise<MaintenanceTicket> {
  const result = await tenantQuery<MaintenanceTicketRow>(
    tenantId,
    `INSERT INTO maintenance_tickets (reported_by, title, description, severity, photos)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, reported_by, assigned_to, severity, status, title, description,
               photos, cost, completed_at, completion_evidence, created_at, updated_at`,
    [reportedBy, title, description, severity, JSON.stringify(photos)]
  );
  return mapTicketRow(result.rows[0]);
}

/**
 * Get a ticket by ID.
 */
export async function getTicketById(
  tenantId: string,
  ticketId: string
): Promise<MaintenanceTicket | null> {
  const result = await tenantQuery<MaintenanceTicketRow>(
    tenantId,
    `SELECT id, reported_by, assigned_to, severity, status, title, description,
            photos, cost, completed_at, completion_evidence, created_at, updated_at
     FROM maintenance_tickets
     WHERE id = $1`,
    [ticketId]
  );
  if (result.rows.length === 0) return null;
  return mapTicketRow(result.rows[0]);
}

/**
 * List tickets with optional filters.
 */
export async function listTickets(
  tenantId: string,
  filters: {
    status?: TicketStatus;
    severity?: TicketSeverity;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }
): Promise<MaintenanceTicket[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }
  if (filters.severity) {
    conditions.push(`severity = $${paramIndex++}`);
    params.push(filters.severity);
  }
  if (filters.assignedTo) {
    conditions.push(`assigned_to = $${paramIndex++}`);
    params.push(filters.assignedTo);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const result = await tenantQuery<MaintenanceTicketRow>(
    tenantId,
    `SELECT id, reported_by, assigned_to, severity, status, title, description,
            photos, cost, completed_at, completion_evidence, created_at, updated_at
     FROM maintenance_tickets
     ${whereClause}
     ORDER BY
       CASE severity
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
       END ASC,
       created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );
  return result.rows.map(mapTicketRow);
}

/**
 * Update ticket status and related fields.
 * If completing, sets completed_at, cost, and completion_evidence.
 * If assigning, sets assigned_to.
 */
export async function updateTicketStatus(
  tenantId: string,
  ticketId: string,
  status: TicketStatus,
  options?: {
    assignedTo?: string;
    cost?: number;
    completionEvidence?: CompletionEvidence[];
  }
): Promise<MaintenanceTicket | null> {
  let query: string;
  let params: unknown[];

  if (status === 'completed') {
    query = `UPDATE maintenance_tickets
             SET status = $1, completed_at = NOW(), cost = $2,
                 completion_evidence = $3, updated_at = NOW()
             WHERE id = $4
             RETURNING id, reported_by, assigned_to, severity, status, title, description,
                       photos, cost, completed_at, completion_evidence, created_at, updated_at`;
    params = [
      status,
      options?.cost ?? null,
      JSON.stringify(options?.completionEvidence ?? []),
      ticketId,
    ];
  } else if (status === 'assigned' && options?.assignedTo) {
    query = `UPDATE maintenance_tickets
             SET status = $1, assigned_to = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING id, reported_by, assigned_to, severity, status, title, description,
                       photos, cost, completed_at, completion_evidence, created_at, updated_at`;
    params = [status, options.assignedTo, ticketId];
  } else {
    query = `UPDATE maintenance_tickets
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, reported_by, assigned_to, severity, status, title, description,
                       photos, cost, completed_at, completion_evidence, created_at, updated_at`;
    params = [status, ticketId];
  }

  const result = await tenantQuery<MaintenanceTicketRow>(tenantId, query, params);
  if (result.rows.length === 0) return null;
  return mapTicketRow(result.rows[0]);
}

/**
 * Get tickets that have been in open/assigned status for over 72 hours.
 * Used by the escalation logic for non-critical tickets.
 * Requirement 11.7
 */
export async function getStaleNonCriticalTickets(
  tenantId: string
): Promise<MaintenanceTicket[]> {
  const result = await tenantQuery<MaintenanceTicketRow>(
    tenantId,
    `SELECT id, reported_by, assigned_to, severity, status, title, description,
            photos, cost, completed_at, completion_evidence, created_at, updated_at
     FROM maintenance_tickets
     WHERE severity != 'critical'
       AND status IN ('open', 'assigned')
       AND created_at < NOW() - INTERVAL '72 hours'
     ORDER BY created_at ASC`
  );
  return result.rows.map(mapTicketRow);
}

/**
 * Get total maintenance costs for a villa (tenant).
 * Requirement 11.5: Track maintenance costs per villa.
 */
export async function getTotalCosts(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  let query = `SELECT COALESCE(SUM(cost), 0) AS total
               FROM maintenance_tickets
               WHERE status = 'completed' AND cost IS NOT NULL`;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (startDate) {
    query += ` AND completed_at >= $${paramIndex++}`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND completed_at <= $${paramIndex}`;
    params.push(endDate);
  }

  const result = await tenantQuery<{ total: string }>(tenantId, query, params);
  return parseFloat(result.rows[0].total);
}

// ─── Recurring Maintenance Queries ────────────────────────────────────────────

/**
 * List recurring maintenance schedules.
 */
export async function listRecurringMaintenance(
  tenantId: string,
  activeOnly: boolean = true,
  limit: number = 50,
  offset: number = 0
): Promise<RecurringMaintenance[]> {
  const whereClause = activeOnly ? 'WHERE is_active = TRUE' : '';

  const result = await tenantQuery<RecurringMaintenanceRow>(
    tenantId,
    `SELECT id, title, description, interval_days, last_completed_at, next_due_at,
            assigned_to, is_active, created_at, updated_at
     FROM recurring_maintenance
     ${whereClause}
     ORDER BY next_due_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows.map(mapRecurringRow);
}

/**
 * Get overdue recurring maintenance tasks (past due and not completed).
 * Requirement 11.4: Notify within 24 hours of missed deadline.
 */
export async function getOverdueRecurringTasks(
  tenantId: string
): Promise<RecurringMaintenance[]> {
  const result = await tenantQuery<RecurringMaintenanceRow>(
    tenantId,
    `SELECT id, title, description, interval_days, last_completed_at, next_due_at,
            assigned_to, is_active, created_at, updated_at
     FROM recurring_maintenance
     WHERE is_active = TRUE
       AND next_due_at < NOW()
     ORDER BY next_due_at ASC`
  );
  return result.rows.map(mapRecurringRow);
}

/**
 * Mark a recurring maintenance task as completed and advance the schedule.
 */
export async function completeRecurringTask(
  tenantId: string,
  recurringId: string
): Promise<RecurringMaintenance | null> {
  const result = await tenantQuery<RecurringMaintenanceRow>(
    tenantId,
    `UPDATE recurring_maintenance
     SET last_completed_at = NOW(),
         next_due_at = NOW() + (interval_days || ' days')::INTERVAL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, description, interval_days, last_completed_at, next_due_at,
               assigned_to, is_active, created_at, updated_at`,
    [recurringId]
  );
  if (result.rows.length === 0) return null;
  return mapRecurringRow(result.rows[0]);
}
