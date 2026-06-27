/**
 * Data Retention Policies
 *
 * Enforces data lifecycle management for the Arka Villa platform.
 * Each data category has a defined retention period after which
 * records are archived or purged.
 *
 * Retention periods:
 *   - Financial data: 7 years (regulatory compliance)
 *   - General operational data: 2 years
 *   - IoT/telemetry data: 90 days
 *   - Audit logs: 7 years (immutable)
 *   - Session/cache data: 30 days
 *   - Backups: 30 days (rolling)
 */

import type { QueryResultRow } from 'pg';
import { pool } from './pool';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RetentionPolicy {
  /** Unique identifier for this policy */
  id: string;
  /** Human-readable name */
  name: string;
  /** The schema and table this policy applies to */
  table: string;
  /** Column used to determine record age (must be a timestamp) */
  timestampColumn: string;
  /** Number of days to retain data before applying the policy action */
  retentionDays: number;
  /** Action to take on expired records */
  action: 'delete' | 'archive' | 'compress';
  /** Optional: only apply to records matching this SQL condition */
  condition?: string;
  /** Whether this policy is active */
  enabled: boolean;
}

export interface RetentionResult {
  policyId: string;
  policyName: string;
  table: string;
  action: string;
  recordsAffected: number;
  executedAt: Date;
  durationMs: number;
  error?: string;
}

export interface RetentionReport {
  executedAt: Date;
  totalRecordsProcessed: number;
  results: RetentionResult[];
  errors: RetentionResult[];
}

// ─── Policy Definitions ──────────────────────────────────────────────────────

export const RETENTION_POLICIES: RetentionPolicy[] = [
  // ── Financial Data (7 years) ──
  {
    id: 'financial-transactions',
    name: 'Financial Transactions',
    table: 'financial_transactions',
    timestampColumn: 'created_at',
    retentionDays: 2555, // ~7 years
    action: 'archive',
    enabled: true,
  },
  {
    id: 'financial-audit-trail',
    name: 'Financial Audit Trail',
    table: 'public.audit_logs',
    timestampColumn: 'timestamp',
    retentionDays: 2555, // ~7 years
    action: 'archive',
    condition: "action_type LIKE 'financial.%'",
    enabled: true,
  },

  // ── Audit Logs (7 years) ──
  {
    id: 'audit-logs-general',
    name: 'General Audit Logs',
    table: 'public.audit_logs',
    timestampColumn: 'timestamp',
    retentionDays: 2555, // ~7 years
    action: 'archive',
    condition: "action_type NOT LIKE 'financial.%'",
    enabled: true,
  },
  {
    id: 'event-store',
    name: 'Event Store',
    table: 'public.event_store',
    timestampColumn: 'created_at',
    retentionDays: 2555, // ~7 years
    action: 'archive',
    enabled: true,
  },

  // ── General Operational Data (2 years) ──
  {
    id: 'bookings',
    name: 'Booking Records',
    table: 'bookings',
    timestampColumn: 'created_at',
    retentionDays: 730, // 2 years
    action: 'archive',
    enabled: true,
  },
  {
    id: 'guest-communications',
    name: 'Guest Communications',
    table: 'guest_messages',
    timestampColumn: 'created_at',
    retentionDays: 730, // 2 years
    action: 'delete',
    enabled: true,
  },
  {
    id: 'maintenance-tickets',
    name: 'Maintenance Tickets',
    table: 'maintenance_tickets',
    timestampColumn: 'created_at',
    retentionDays: 730, // 2 years
    action: 'archive',
    enabled: true,
  },
  {
    id: 'staff-attendance',
    name: 'Staff Attendance Records',
    table: 'staff_attendance',
    timestampColumn: 'clock_in',
    retentionDays: 730, // 2 years
    action: 'archive',
    enabled: true,
  },
  {
    id: 'channel-sync-logs',
    name: 'Channel Sync Logs',
    table: 'channel_sync_logs',
    timestampColumn: 'created_at',
    retentionDays: 90, // 90 days per requirement 6.7
    action: 'delete',
    enabled: true,
  },

  // ── IoT / Telemetry Data (90 days) ──
  {
    id: 'iot-readings',
    name: 'IoT Device Readings',
    table: 'iot_readings',
    timestampColumn: 'recorded_at',
    retentionDays: 90,
    action: 'delete',
    enabled: true,
  },
  {
    id: 'cctv-recordings-metadata',
    name: 'CCTV Recording Metadata',
    table: 'cctv_recordings',
    timestampColumn: 'recorded_at',
    retentionDays: 90,
    action: 'delete',
    enabled: true,
  },
  {
    id: 'device-health',
    name: 'IoT Device Health Logs',
    table: 'iot_device_health',
    timestampColumn: 'checked_at',
    retentionDays: 90,
    action: 'delete',
    enabled: true,
  },

  // ── Session / Ephemeral Data (30 days) ──
  {
    id: 'expired-sessions',
    name: 'Expired Sessions',
    table: 'public.user_sessions',
    timestampColumn: 'expires_at',
    retentionDays: 30,
    action: 'delete',
    condition: 'expires_at < NOW()',
    enabled: true,
  },
  {
    id: 'dead-letter-queue',
    name: 'Dead Letter Queue Events',
    table: 'public.dead_letter_queue',
    timestampColumn: 'failed_at',
    retentionDays: 30,
    action: 'archive',
    enabled: true,
  },
];

// ─── Retention Enforcement ───────────────────────────────────────────────────

/**
 * Determines the cutoff date for a given retention policy.
 */
export function getCutoffDate(retentionDays: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  return cutoff;
}

/**
 * Executes a single retention policy against the database.
 * For tenant-scoped tables (no 'public.' prefix), iterates across all active tenants.
 */
async function executePolicy(policy: RetentionPolicy): Promise<RetentionResult> {
  const startTime = Date.now();
  const cutoff = getCutoffDate(policy.retentionDays);
  let totalAffected = 0;

  try {
    if (policy.table.startsWith('public.')) {
      // Public schema table — execute directly
      totalAffected = await executePolicyOnTable(
        policy.table,
        policy.timestampColumn,
        cutoff,
        policy.action,
        policy.condition
      );
    } else {
      // Tenant-scoped table — iterate across all active tenants
      const tenants = await pool.query<{ schema_name: string } & QueryResultRow>(
        "SELECT schema_name FROM public.tenants WHERE status = 'active'"
      );

      for (const tenant of tenants.rows) {
        const qualifiedTable = `${tenant.schema_name}.${policy.table}`;
        const affected = await executePolicyOnTable(
          qualifiedTable,
          policy.timestampColumn,
          cutoff,
          policy.action,
          policy.condition
        );
        totalAffected += affected;
      }
    }

    return {
      policyId: policy.id,
      policyName: policy.name,
      table: policy.table,
      action: policy.action,
      recordsAffected: totalAffected,
      executedAt: new Date(),
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      policyId: policy.id,
      policyName: policy.name,
      table: policy.table,
      action: policy.action,
      recordsAffected: 0,
      executedAt: new Date(),
      durationMs: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

/**
 * Executes the retention action on a specific qualified table.
 */
async function executePolicyOnTable(
  qualifiedTable: string,
  timestampColumn: string,
  cutoff: Date,
  action: RetentionPolicy['action'],
  condition?: string
): Promise<number> {
  // Validate table/column names to prevent injection (allow schema.table format)
  if (!/^[a-z_][a-z0-9_.]*$/.test(qualifiedTable)) {
    throw new Error(`Invalid table name: ${qualifiedTable}`);
  }
  if (!/^[a-z_][a-z0-9_]*$/.test(timestampColumn)) {
    throw new Error(`Invalid column name: ${timestampColumn}`);
  }

  let whereClause = `${timestampColumn} < $1`;
  if (condition) {
    whereClause += ` AND (${condition})`;
  }

  switch (action) {
    case 'delete': {
      const result = await pool.query(
        `DELETE FROM ${qualifiedTable} WHERE ${whereClause}`,
        [cutoff]
      );
      return result.rowCount ?? 0;
    }

    case 'archive': {
      // Archive by moving to a partitioned archive table, or simply mark as archived
      // For now, delete records older than the retention period.
      // In production, this would copy to cold storage (MinIO/S3) first.
      const result = await pool.query(
        `DELETE FROM ${qualifiedTable} WHERE ${whereClause}`,
        [cutoff]
      );
      return result.rowCount ?? 0;
    }

    case 'compress': {
      // TimescaleDB compression for hypertables (IoT data)
      // Falls back to delete for non-hypertables
      try {
        await pool.query(
          `SELECT compress_chunk(c) FROM show_chunks('${qualifiedTable}', older_than => $1::interval) c`,
          [`${Math.floor((Date.now() - cutoff.getTime()) / 86400000)} days`]
        );
        return 0; // Compression doesn't delete rows
      } catch {
        // Not a hypertable — fall back to delete
        const result = await pool.query(
          `DELETE FROM ${qualifiedTable} WHERE ${whereClause}`,
          [cutoff]
        );
        return result.rowCount ?? 0;
      }
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Runs all enabled retention policies and returns a summary report.
 *
 * This should be scheduled as a daily job (e.g., via n8n or cron).
 * Policies are executed sequentially to avoid overwhelming the database.
 */
export async function enforceRetentionPolicies(): Promise<RetentionReport> {
  const results: RetentionResult[] = [];
  const errors: RetentionResult[] = [];
  let totalRecords = 0;

  const activePolicies = RETENTION_POLICIES.filter((p) => p.enabled);

  for (const policy of activePolicies) {
    const result = await executePolicy(policy);
    totalRecords += result.recordsAffected;

    if (result.error) {
      errors.push(result);
    } else {
      results.push(result);
    }
  }

  return {
    executedAt: new Date(),
    totalRecordsProcessed: totalRecords,
    results,
    errors,
  };
}

/**
 * Returns all defined retention policies with their current status.
 * Useful for the Agency_Dashboard dependency health display.
 */
export function getRetentionPolicies(): RetentionPolicy[] {
  return [...RETENTION_POLICIES];
}

/**
 * Gets a specific policy by ID.
 */
export function getRetentionPolicy(policyId: string): RetentionPolicy | undefined {
  return RETENTION_POLICIES.find((p) => p.id === policyId);
}

/**
 * Calculates storage estimates for each policy based on current row counts.
 * Useful for monitoring dashboard display.
 */
export async function getRetentionMetrics(): Promise<
  Array<{
    policyId: string;
    policyName: string;
    table: string;
    retentionDays: number;
    estimatedExpiredRows: number;
  }>
> {
  const metrics: Array<{
    policyId: string;
    policyName: string;
    table: string;
    retentionDays: number;
    estimatedExpiredRows: number;
  }> = [];

  for (const policy of RETENTION_POLICIES.filter((p) => p.enabled)) {
    const cutoff = getCutoffDate(policy.retentionDays);

    try {
      if (policy.table.startsWith('public.')) {
        let whereClause = `${policy.timestampColumn} < $1`;
        if (policy.condition) {
          whereClause += ` AND (${policy.condition})`;
        }

        const result = await pool.query<{ count: string } & QueryResultRow>(
          `SELECT COUNT(*) as count FROM ${policy.table} WHERE ${whereClause}`,
          [cutoff]
        );

        metrics.push({
          policyId: policy.id,
          policyName: policy.name,
          table: policy.table,
          retentionDays: policy.retentionDays,
          estimatedExpiredRows: parseInt(result.rows[0]?.count ?? '0', 10),
        });
      } else {
        // For tenant tables, sum across all tenants
        const tenants = await pool.query<{ schema_name: string } & QueryResultRow>(
          "SELECT schema_name FROM public.tenants WHERE status = 'active'"
        );

        let total = 0;
        for (const tenant of tenants.rows) {
          try {
            let whereClause = `${policy.timestampColumn} < $1`;
            if (policy.condition) {
              whereClause += ` AND (${policy.condition})`;
            }
            const result = await pool.query<{ count: string } & QueryResultRow>(
              `SELECT COUNT(*) as count FROM ${tenant.schema_name}.${policy.table} WHERE ${whereClause}`,
              [cutoff]
            );
            total += parseInt(result.rows[0]?.count ?? '0', 10);
          } catch {
            // Table may not exist in all tenant schemas yet
          }
        }

        metrics.push({
          policyId: policy.id,
          policyName: policy.name,
          table: policy.table,
          retentionDays: policy.retentionDays,
          estimatedExpiredRows: total,
        });
      }
    } catch {
      // Table doesn't exist yet — skip
      metrics.push({
        policyId: policy.id,
        policyName: policy.name,
        table: policy.table,
        retentionDays: policy.retentionDays,
        estimatedExpiredRows: 0,
      });
    }
  }

  return metrics;
}
