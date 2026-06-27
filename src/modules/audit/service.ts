/**
 * Audit service — business logic for logging operations, querying logs,
 * anomaly detection, and retention management.
 *
 * Requirements: 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.7, 30.5
 */

import { v4 as uuidv4 } from 'uuid';

import { detectAnomalies } from './anomaly';
import {
  bufferEntry,
  getBufferedEntries,
  clearBuffer,
  registerFlushCallback,
  startFlushLoop,
} from './buffer';
import {
  appendEvent,
  getLatestStreamVersion,
  insertAuditLog,
  queryAuditLogs,
} from './repository';
import type {
  AnomalyAlert,
  AuditLogEntry,
  AuditQuery,
  AuditQueryResult,
  BufferedAuditEntry,
  LogAuditEventInput,
} from './types';

// ─── Anomaly alert handler (pluggable) ────────────────────────────────────────

type AnomalyAlertHandler = (alerts: AnomalyAlert[]) => void | Promise<void>;

let anomalyAlertHandler: AnomalyAlertHandler = () => {
  // Default: no-op. Integrate with notification module in production.
};

/**
 * Register a handler for anomaly alerts.
 * In production this connects to the notification service.
 */
export function onAnomalyDetected(handler: AnomalyAlertHandler): void {
  anomalyAlertHandler = handler;
}

// ─── Core logging function (Requirement 31.1, 31.2, 31.4, 31.7) ──────────────

/**
 * Log a significant operation to the audit system.
 *
 * Writes to both the audit_logs table (for queryable logs) and
 * the event_store (for immutable event trail).
 *
 * If the database is unavailable, entries are buffered locally
 * (up to 1000 entries) and flushed when connectivity recovers.
 */
export async function logAuditEvent(input: LogAuditEventInput): Promise<AuditLogEntry | null> {
  // Run anomaly detection (Requirement 31.6)
  const anomalies = detectAnomalies(input);
  if (anomalies.length > 0) {
    // Fire-and-forget alert dispatch
    Promise.resolve(anomalyAlertHandler(anomalies)).catch(() => {
      // Swallow handler errors to avoid impacting audit logging
    });
  }

  try {
    // Write to audit_logs table (Requirement 31.1, 31.4)
    const auditEntry = await insertAuditLog({
      timestamp: new Date(),
      userId: input.userId,
      actionType: input.actionType,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      tenantId: input.tenantId ?? null,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
      ipAddress: input.ipAddress ?? null,
      outcome: input.outcome ?? 'success',
    });

    // Write to event_store for immutable trail (Requirement 31.2)
    const streamName = `audit.${input.category}`;
    const version = await getLatestStreamVersion(streamName) + 1;

    await appendEvent({
      eventId: uuidv4(),
      streamName,
      eventType: `audit.${input.actionType}`,
      version,
      tenantId: input.tenantId ?? null,
      correlationId: input.correlationId ?? null,
      causationId: input.causationId ?? null,
      actorUserId: input.userId,
      payload: {
        actionType: input.actionType,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        previousValue: input.previousValue,
        newValue: input.newValue,
        outcome: input.outcome ?? 'success',
      },
      metadata: {
        category: input.category,
        ipAddress: input.ipAddress,
        ...input.metadata,
      },
    });

    return auditEntry;
  } catch (error) {
    // Database unavailable — buffer the entry (Requirement 31.7)
    bufferEntry(input);
    return null;
  }
}

// ─── Query audit logs (Requirement 31.5) ──────────────────────────────────────

/**
 * Query audit logs with search and filter capabilities.
 * Supports date range, user, action type, and resource filters.
 * Returns results within 5 seconds for 90-day queries.
 */
export async function searchAuditLogs(query: AuditQuery): Promise<AuditQueryResult> {
  return queryAuditLogs(query);
}

// ─── Buffer flush initialization (Requirement 31.7) ───────────────────────────

/**
 * Initialize the buffer flush mechanism.
 * Registers a callback that attempts to re-write buffered entries to the DB.
 */
export function initializeAuditBuffer(): void {
  registerFlushCallback(async (entries: BufferedAuditEntry[]) => {
    try {
      for (const buffered of entries) {
        await logAuditEvent(buffered.entry);
      }
      return true;
    } catch {
      return false;
    }
  });

  startFlushLoop();
}

// ─── Retention policy helpers (Requirement 31.3) ──────────────────────────────

/**
 * Get the retention cutoff date for a given category.
 * Financial operations: 7 years, all others: 2 years.
 */
export function getRetentionCutoff(category: string): Date {
  const years = category === 'financial_operation' ? 7 : 2;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return cutoff;
}

// ─── Convenience logging functions for specific operation categories ───────────

/**
 * Log an authentication event.
 */
export async function logAuthEvent(
  userId: string | null,
  actionType: string,
  outcome: 'success' | 'failure' | 'denied',
  ipAddress?: string | null,
  metadata?: Record<string, unknown>
): Promise<AuditLogEntry | null> {
  return logAuditEvent({
    userId,
    actionType,
    category: 'auth',
    resourceType: 'session',
    outcome,
    ipAddress,
    metadata,
  });
}

/**
 * Log a data modification event (Requirement 31.4).
 */
export async function logDataModification(
  userId: string,
  actionType: string,
  resourceType: string,
  resourceId: string,
  previousValue: unknown,
  newValue: unknown,
  tenantId?: string | null,
  ipAddress?: string | null
): Promise<AuditLogEntry | null> {
  return logAuditEvent({
    userId,
    actionType,
    category: 'data_modification',
    resourceType,
    resourceId,
    tenantId,
    previousValue,
    newValue,
    ipAddress,
    outcome: 'success',
  });
}

/**
 * Log a booking transaction.
 */
export async function logBookingTransaction(
  userId: string,
  actionType: string,
  resourceId: string,
  tenantId: string,
  metadata?: Record<string, unknown>
): Promise<AuditLogEntry | null> {
  return logAuditEvent({
    userId,
    actionType,
    category: 'booking_transaction',
    resourceType: 'booking',
    resourceId,
    tenantId,
    metadata,
    outcome: 'success',
  });
}

/**
 * Log a financial operation (7-year retention).
 */
export async function logFinancialOperation(
  userId: string,
  actionType: string,
  resourceType: string,
  resourceId: string,
  previousValue: unknown | null,
  newValue: unknown | null,
  tenantId?: string | null,
  ipAddress?: string | null
): Promise<AuditLogEntry | null> {
  return logAuditEvent({
    userId,
    actionType,
    category: 'financial_operation',
    resourceType,
    resourceId,
    tenantId,
    previousValue,
    newValue,
    ipAddress,
    outcome: 'success',
  });
}

/**
 * Log a staff action.
 */
export async function logStaffAction(
  userId: string,
  actionType: string,
  resourceType: string,
  resourceId?: string | null,
  tenantId?: string | null,
  metadata?: Record<string, unknown>
): Promise<AuditLogEntry | null> {
  return logAuditEvent({
    userId,
    actionType,
    category: 'staff_action',
    resourceType,
    resourceId,
    tenantId,
    metadata,
    outcome: 'success',
  });
}

/**
 * Log a system error.
 */
export async function logSystemError(
  actionType: string,
  resourceType: string,
  metadata?: Record<string, unknown>
): Promise<AuditLogEntry | null> {
  return logAuditEvent({
    userId: null,
    actionType,
    category: 'system_error',
    resourceType,
    outcome: 'failure',
    metadata,
  });
}
