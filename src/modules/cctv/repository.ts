/**
 * CCTV repository — tenant-scoped queries for cctv_recordings table.
 *
 * All queries use the tenant-scoped connection helper for data isolation.
 * Recording storage and retention are managed per-villa.
 *
 * Requirements: 36.3, 36.4
 */

import { tenantQuery } from '@/lib/db/tenant-query';
import type { CCTVRecording, CCTVRecordingRow } from './types';
import { DEFAULT_RETENTION_DAYS } from './types';

// ─── Row → Domain Mapper ──────────────────────────────────────────────────────

function mapRecordingRow(row: CCTVRecordingRow): CCTVRecording {
  return {
    id: row.id,
    deviceId: row.device_id,
    startTime: row.start_time,
    endTime: row.end_time,
    storagePath: row.storage_path,
    fileSizeBytes: parseInt(row.file_size_bytes, 10),
    retentionUntil: row.retention_until,
    createdAt: row.created_at,
  };
}

// ─── Recording Queries ────────────────────────────────────────────────────────

/**
 * List recordings for a tenant, with optional filtering by device, date, and time range.
 *
 * Requirement 36.4: Browse by camera, date, time range.
 */
export async function listRecordings(
  tenantId: string,
  filters?: {
    deviceId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
    offset?: number;
  }
): Promise<CCTVRecording[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.deviceId) {
    conditions.push(`device_id = $${paramIndex++}`);
    params.push(filters.deviceId);
  }

  if (filters?.date) {
    // Filter recordings that overlap with the given date
    conditions.push(`start_time::date <= $${paramIndex}::date AND end_time::date >= $${paramIndex}::date`);
    params.push(filters.date);
    paramIndex++;
  }

  if (filters?.startTime) {
    conditions.push(`end_time >= $${paramIndex++}`);
    params.push(filters.startTime);
  }

  if (filters?.endTime) {
    conditions.push(`start_time <= $${paramIndex++}`);
    params.push(filters.endTime);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const result = await tenantQuery<CCTVRecordingRow>(
    tenantId,
    `SELECT id, device_id, start_time, end_time, storage_path, file_size_bytes, retention_until, created_at
     FROM cctv_recordings
     ${whereClause}
     ORDER BY start_time DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return result.rows.map(mapRecordingRow);
}

/**
 * Get a single recording by ID.
 */
export async function getRecordingById(
  tenantId: string,
  recordingId: string
): Promise<CCTVRecording | null> {
  const result = await tenantQuery<CCTVRecordingRow>(
    tenantId,
    `SELECT id, device_id, start_time, end_time, storage_path, file_size_bytes, retention_until, created_at
     FROM cctv_recordings
     WHERE id = $1`,
    [recordingId]
  );

  if (result.rows.length === 0) return null;
  return mapRecordingRow(result.rows[0]);
}

/**
 * Insert a new recording record.
 */
export async function insertRecording(
  tenantId: string,
  deviceId: string,
  startTime: string,
  endTime: string,
  storagePath: string,
  fileSizeBytes: number,
  retentionDays?: number
): Promise<CCTVRecording> {
  const days = retentionDays ?? DEFAULT_RETENTION_DAYS;

  const result = await tenantQuery<CCTVRecordingRow>(
    tenantId,
    `INSERT INTO cctv_recordings (device_id, start_time, end_time, storage_path, file_size_bytes, retention_until)
     VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' days')::INTERVAL)
     RETURNING id, device_id, start_time, end_time, storage_path, file_size_bytes, retention_until, created_at`,
    [deviceId, startTime, endTime, storagePath, fileSizeBytes, days.toString()]
  );

  return mapRecordingRow(result.rows[0]);
}

/**
 * Delete recordings past their retention date.
 * Returns the paths of deleted recordings for file cleanup.
 *
 * Requirement 36.3: Configurable retention 7–90 days.
 */
export async function deleteExpiredRecordings(
  tenantId: string
): Promise<string[]> {
  const result = await tenantQuery<{ storage_path: string }>(
    tenantId,
    `DELETE FROM cctv_recordings
     WHERE retention_until < NOW()
     RETURNING storage_path`
  );

  return result.rows.map((row) => row.storage_path);
}

/**
 * Get the configured retention days for a tenant.
 * Stored in the tenant's villa_settings table; falls back to default.
 */
export async function getRetentionDays(tenantId: string): Promise<number> {
  try {
    const result = await tenantQuery<{ value: string }>(
      tenantId,
      `SELECT value FROM villa_settings WHERE key = 'cctv_retention_days' LIMIT 1`
    );

    if (result.rows.length > 0) {
      const days = parseInt(result.rows[0].value, 10);
      if (!isNaN(days) && days >= 7 && days <= 90) {
        return days;
      }
    }
  } catch {
    // Table might not exist yet; fall back to default
  }

  return DEFAULT_RETENTION_DAYS;
}

/**
 * Set the retention days for a tenant.
 * Upserts into villa_settings.
 */
export async function setRetentionDays(
  tenantId: string,
  days: number
): Promise<void> {
  await tenantQuery(
    tenantId,
    `INSERT INTO villa_settings (key, value)
     VALUES ('cctv_retention_days', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [days.toString()]
  );
}

/**
 * Count recordings for a specific device.
 */
export async function countRecordings(
  tenantId: string,
  deviceId?: string
): Promise<number> {
  let query = `SELECT COUNT(*)::int AS count FROM cctv_recordings`;
  const params: unknown[] = [];

  if (deviceId) {
    query += ` WHERE device_id = $1`;
    params.push(deviceId);
  }

  const result = await tenantQuery<{ count: number }>(tenantId, query, params);
  return result.rows[0].count;
}
