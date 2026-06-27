/**
 * Audit module types.
 *
 * Requirements: 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.7
 */

// ─── Action categories for structured logging (Requirement 31.1) ──────────────

export type ActionCategory =
  | 'auth'
  | 'data_modification'
  | 'booking_transaction'
  | 'financial_operation'
  | 'staff_action'
  | 'system_error';

export type AuditOutcome = 'success' | 'failure' | 'denied';

// ─── Core audit log entry (maps to audit_logs table) ──────────────────────────

export interface AuditLogEntry {
  id?: string;
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
}

// ─── Event store entry (maps to event_store table) ─────────────────────────────

export interface EventStoreEntry {
  id?: string;
  eventId?: string;
  streamName: string;
  eventType: string;
  version: number;
  tenantId: string | null;
  correlationId: string | null;
  causationId: string | null;
  actorUserId: string | null;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt?: Date;
}

// ─── Input for logging an audit event ─────────────────────────────────────────

export interface LogAuditEventInput {
  userId: string | null;
  actionType: string;
  category: ActionCategory;
  resourceType: string;
  resourceId?: string | null;
  tenantId?: string | null;
  previousValue?: unknown | null;
  newValue?: unknown | null;
  ipAddress?: string | null;
  outcome?: AuditOutcome;
  correlationId?: string | null;
  causationId?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Query parameters for GET /api/v1/audit/logs (Requirement 31.5) ───────────

export interface AuditQuery {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  actionType?: string;
  resourceType?: string;
  resourceId?: string;
  tenantId?: string;
  outcome?: AuditOutcome;
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  logs: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Retention policy (Requirement 31.3) ──────────────────────────────────────

export interface RetentionPolicy {
  category: ActionCategory;
  retentionYears: number;
}

export const RETENTION_POLICIES: RetentionPolicy[] = [
  { category: 'financial_operation', retentionYears: 7 },
  { category: 'auth', retentionYears: 2 },
  { category: 'data_modification', retentionYears: 2 },
  { category: 'booking_transaction', retentionYears: 2 },
  { category: 'staff_action', retentionYears: 2 },
  { category: 'system_error', retentionYears: 2 },
];

// ─── Anomaly detection types (Requirement 31.6) ───────────────────────────────

export type AnomalyType =
  | 'new_geo_login'
  | 'bulk_export'
  | 'unusual_financial_modification'
  | 'after_hours_admin_action';

export interface AnomalyAlert {
  type: AnomalyType;
  userId: string;
  description: string;
  detectedAt: Date;
  metadata: Record<string, unknown>;
}

// ─── Buffer entry (Requirement 31.7) ──────────────────────────────────────────

export interface BufferedAuditEntry {
  entry: LogAuditEventInput;
  bufferedAt: Date;
}
