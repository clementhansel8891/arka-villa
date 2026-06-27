/**
 * Audit repository — append-only writes to audit_logs and event_store tables.
 *
 * The database role (arka_app) has INSERT and SELECT only on these tables;
 * UPDATE and DELETE are revoked at the DB level (005-audit-permissions.sql).
 *
 * Requirements: 31.1, 31.2, 31.4
 */

import { v4 as uuidv4 } from 'uuid';

import { publicQuery } from '@/lib/db';
import type {
  AuditLogEntry,
  AuditOutcome,
  AuditQuery,
  AuditQueryResult,
  EventStoreEntry,
} from './types';

// ─── Audit Logs (append-only) ─────────────────────────────────────────────────

/**
 * Insert a new audit log entry.
 * Append-only: no update/delete operations exposed.
 */
export async function insertAuditLog(entry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry> {
  const result = await publicQuery<AuditLogEntry>(
    `INSERT INTO audit_logs (timestamp, user_id, action_type, resource_type, resource_id, tenant_id, previous_value, new_value, ip_address, outcome)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, timestamp, user_id AS "userId", action_type AS "actionType", resource_type AS "resourceType",
               resource_id AS "resourceId", tenant_id AS "tenantId", previous_value AS "previousValue",
               new_value AS "newValue", ip_address AS "ipAddress", outcome`,
    [
      entry.timestamp,
      entry.userId,
      entry.actionType,
      entry.resourceType,
      entry.resourceId,
      entry.tenantId,
      entry.previousValue ? JSON.stringify(entry.previousValue) : null,
      entry.newValue ? JSON.stringify(entry.newValue) : null,
      entry.ipAddress,
      entry.outcome,
    ]
  );

  return result.rows[0];
}

/**
 * Query audit logs with filters. Designed for efficient retrieval within
 * 5 seconds for 90-day date ranges (Requirement 31.5).
 * Uses indexed columns: timestamp, user_id, action_type, resource_type.
 */
export async function queryAuditLogs(query: AuditQuery): Promise<AuditQueryResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.dateFrom) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    params.push(query.dateFrom);
  }

  if (query.dateTo) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    params.push(query.dateTo);
  }

  if (query.userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(query.userId);
  }

  if (query.actionType) {
    conditions.push(`action_type = $${paramIndex++}`);
    params.push(query.actionType);
  }

  if (query.resourceType) {
    conditions.push(`resource_type = $${paramIndex++}`);
    params.push(query.resourceType);
  }

  if (query.resourceId) {
    conditions.push(`resource_id = $${paramIndex++}`);
    params.push(query.resourceId);
  }

  if (query.tenantId) {
    conditions.push(`tenant_id = $${paramIndex++}`);
    params.push(query.tenantId);
  }

  if (query.outcome) {
    conditions.push(`outcome = $${paramIndex++}`);
    params.push(query.outcome);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(query.limit ?? 50, 200);
  const offset = query.offset ?? 0;

  // Count total matching results
  const countResult = await publicQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Fetch paginated results ordered by timestamp descending
  const dataResult = await publicQuery<{
    id: string;
    timestamp: Date;
    userId: string | null;
    actionType: string;
    resourceType: string;
    resourceId: string | null;
    tenantId: string | null;
    previousValue: unknown | null;
    newValue: unknown | null;
    ipAddress: string | null;
    outcome: AuditOutcome;
  }>(
    `SELECT id, timestamp, user_id AS "userId", action_type AS "actionType",
            resource_type AS "resourceType", resource_id AS "resourceId",
            tenant_id AS "tenantId", previous_value AS "previousValue",
            new_value AS "newValue", ip_address AS "ipAddress", outcome
     FROM audit_logs ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    logs: dataResult.rows,
    total,
    limit,
    offset,
  };
}

// ─── Event Store (append-only) ────────────────────────────────────────────────

/**
 * Append an event to the event store.
 * Provides immutable audit trail with full replay capability.
 */
export async function appendEvent(entry: Omit<EventStoreEntry, 'id' | 'createdAt'>): Promise<EventStoreEntry> {
  const eventId = entry.eventId ?? uuidv4();

  const result = await publicQuery<EventStoreEntry>(
    `INSERT INTO event_store (event_id, stream_name, event_type, version, tenant_id, correlation_id, causation_id, actor_user_id, payload, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, event_id AS "eventId", stream_name AS "streamName", event_type AS "eventType",
               version, tenant_id AS "tenantId", correlation_id AS "correlationId",
               causation_id AS "causationId", actor_user_id AS "actorUserId",
               payload, metadata, created_at AS "createdAt"`,
    [
      eventId,
      entry.streamName,
      entry.eventType,
      entry.version,
      entry.tenantId,
      entry.correlationId,
      entry.causationId,
      entry.actorUserId,
      JSON.stringify(entry.payload),
      JSON.stringify(entry.metadata),
    ]
  );

  return result.rows[0];
}

/**
 * Get the latest event version for a stream.
 * Used for optimistic concurrency control on event append.
 */
export async function getLatestStreamVersion(streamName: string): Promise<number> {
  const result = await publicQuery<{ version: number }>(
    `SELECT COALESCE(MAX(version), 0) AS version FROM event_store WHERE stream_name = $1`,
    [streamName]
  );
  return result.rows[0].version;
}

/**
 * Delete audit logs older than the retention cutoff.
 * Used by the retention cleanup job.
 * NOTE: This requires a privileged role (not arka_app) — run via admin scripts.
 * For the app role, this will be called via a privileged admin connection.
 */
export async function deleteExpiredLogs(
  actionTypes: string[],
  cutoffDate: Date
): Promise<number> {
  if (actionTypes.length === 0) return 0;

  const placeholders = actionTypes.map((_, i) => `$${i + 1}`).join(', ');
  const result = await publicQuery(
    `DELETE FROM audit_logs WHERE action_type IN (${placeholders}) AND timestamp < $${actionTypes.length + 1}`,
    [...actionTypes, cutoffDate]
  );

  return result.rowCount ?? 0;
}
