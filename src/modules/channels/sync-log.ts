/**
 * Channel sync event logging.
 *
 * Logs all synchronization events with timestamps, channel ID,
 * operation type, and success/failure status.
 * Retains logs for a minimum of 90 days.
 *
 * Requirements: 6.7
 */

import { randomUUID } from 'crypto';
import { publicQuery } from '@/lib/db';
import type {
  SyncLogEntry,
  SyncOperationType,
  SyncDirection,
} from './types';

/** Retention period for sync logs in days. */
const SYNC_LOG_RETENTION_DAYS = 90;

/**
 * Records a sync event in the persistent log.
 *
 * All sync operations (inbound and outbound) are logged with
 * full metadata for audit and troubleshooting.
 */
export async function logSyncEvent(params: {
  tenantId: string;
  channelId: string;
  channelName: string;
  operation: SyncOperationType;
  direction: SyncDirection;
  status: 'success' | 'failure';
  durationMs: number;
  itemsProcessed?: number;
  errorMessage?: string;
  retryAttempt?: number;
  metadata?: Record<string, unknown>;
}): Promise<SyncLogEntry> {
  const entry: SyncLogEntry = {
    id: randomUUID(),
    tenantId: params.tenantId,
    channelId: params.channelId,
    channelName: params.channelName,
    operation: params.operation,
    direction: params.direction,
    status: params.status,
    timestamp: new Date().toISOString(),
    durationMs: params.durationMs,
    itemsProcessed: params.itemsProcessed,
    errorMessage: params.errorMessage,
    retryAttempt: params.retryAttempt,
    metadata: params.metadata,
  };

  await publicQuery(
    `INSERT INTO channel_sync_logs (
      id, tenant_id, channel_id, channel_name, operation, direction,
      status, timestamp, duration_ms, items_processed, error_message,
      retry_attempt, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      entry.id,
      entry.tenantId,
      entry.channelId,
      entry.channelName,
      entry.operation,
      entry.direction,
      entry.status,
      entry.timestamp,
      entry.durationMs,
      entry.itemsProcessed ?? null,
      entry.errorMessage ?? null,
      entry.retryAttempt ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ]
  );

  return entry;
}

/**
 * Query sync logs for a specific tenant and optional filters.
 */
export async function getSyncLogs(params: {
  tenantId: string;
  channelId?: string;
  operation?: SyncOperationType;
  status?: 'success' | 'failure';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: SyncLogEntry[]; total: number }> {
  const conditions: string[] = ['tenant_id = $1'];
  const values: unknown[] = [params.tenantId];
  let paramIdx = 2;

  if (params.channelId) {
    conditions.push(`channel_id = $${paramIdx}`);
    values.push(params.channelId);
    paramIdx++;
  }

  if (params.operation) {
    conditions.push(`operation = $${paramIdx}`);
    values.push(params.operation);
    paramIdx++;
  }

  if (params.status) {
    conditions.push(`status = $${paramIdx}`);
    values.push(params.status);
    paramIdx++;
  }

  if (params.startDate) {
    conditions.push(`timestamp >= $${paramIdx}`);
    values.push(params.startDate);
    paramIdx++;
  }

  if (params.endDate) {
    conditions.push(`timestamp <= $${paramIdx}`);
    values.push(params.endDate);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');
  const limit = params.limit ?? 100;
  const offset = params.offset ?? 0;

  const countResult = await publicQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM channel_sync_logs WHERE ${whereClause}`,
    values
  );

  const result = await publicQuery<SyncLogRow>(
    `SELECT * FROM channel_sync_logs
     WHERE ${whereClause}
     ORDER BY timestamp DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...values, limit, offset]
  );

  return {
    logs: result.rows.map(mapRowToEntry),
    total: parseInt(countResult.rows[0]?.count ?? '0', 10),
  };
}

/**
 * Purge sync logs older than the retention period.
 * Should be called by a scheduled job (e.g., daily via n8n).
 *
 * @returns Number of rows deleted
 */
export async function purgeSyncLogs(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SYNC_LOG_RETENTION_DAYS);

  const result = await publicQuery(
    `DELETE FROM channel_sync_logs WHERE timestamp < $1`,
    [cutoff.toISOString()]
  );

  return result.rowCount ?? 0;
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

interface SyncLogRow {
  id: string;
  tenant_id: string;
  channel_id: string;
  channel_name: string;
  operation: SyncOperationType;
  direction: SyncDirection;
  status: 'success' | 'failure';
  timestamp: string;
  duration_ms: number;
  items_processed: number | null;
  error_message: string | null;
  retry_attempt: number | null;
  metadata: string | null;
}

function mapRowToEntry(row: SyncLogRow): SyncLogEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    channelId: row.channel_id,
    channelName: row.channel_name,
    operation: row.operation,
    direction: row.direction,
    status: row.status,
    timestamp: row.timestamp,
    durationMs: row.duration_ms,
    itemsProcessed: row.items_processed ?? undefined,
    errorMessage: row.error_message ?? undefined,
    retryAttempt: row.retry_attempt ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}
