/**
 * Audit Module
 *
 * Append-only event store, audit logging, compliance queries,
 * anomaly detection, retention policies, and local buffering.
 *
 * Requirements: 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.7, 30.5
 */

export * from './types';

// Service (business logic)
export {
  logAuditEvent,
  logAuthEvent,
  logDataModification,
  logBookingTransaction,
  logFinancialOperation,
  logStaffAction,
  logSystemError,
  searchAuditLogs,
  initializeAuditBuffer,
  getRetentionCutoff,
  onAnomalyDetected,
} from './service';

// Repository (direct DB access)
export {
  insertAuditLog,
  queryAuditLogs,
  appendEvent,
  getLatestStreamVersion,
  deleteExpiredLogs,
} from './repository';

// Buffer (local fallback when DB unavailable)
export {
  bufferEntry,
  getBufferSize,
  getBufferedEntries,
  clearBuffer,
  startFlushLoop,
  stopFlushLoop,
  resetBuffer,
} from './buffer';

// Anomaly detection
export {
  detectAnomalies,
  resetAnomalyTrackers,
} from './anomaly';
