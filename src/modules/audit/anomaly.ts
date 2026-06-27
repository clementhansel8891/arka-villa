/**
 * Anomaly detection rules for the audit system.
 *
 * Detects suspicious patterns and generates alerts:
 * - Login attempts from new geographic locations
 * - Bulk data exports
 * - Unusual financial modifications
 * - After-hours administrative actions
 *
 * Requirement: 31.6
 */

import type { AnomalyAlert, AnomalyType, LogAuditEventInput } from './types';

// ─── Configuration ────────────────────────────────────────────────────────────

/** Business hours (UTC). Adjust per deployment timezone. */
const BUSINESS_HOURS_START = 6; // 06:00 UTC
const BUSINESS_HOURS_END = 22; // 22:00 UTC

/** Threshold for bulk export detection (actions in a 5-minute window). */
const BULK_EXPORT_THRESHOLD = 10;

/** Threshold for unusual financial modifications (per hour). */
const FINANCIAL_MOD_THRESHOLD = 20;

// ─── In-memory tracking for rate-based anomaly detection ──────────────────────

interface RateTracker {
  userId: string;
  count: number;
  windowStart: Date;
}

const exportTrackers: Map<string, RateTracker> = new Map();
const financialModTrackers: Map<string, RateTracker> = new Map();
const knownGeoLocations: Map<string, Set<string>> = new Map();

// ─── Anomaly detection rules ──────────────────────────────────────────────────

/**
 * Evaluate an audit event against all anomaly detection rules.
 * Returns an array of detected anomalies (may be empty).
 */
export function detectAnomalies(event: LogAuditEventInput): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];

  const geoAlert = checkNewGeoLogin(event);
  if (geoAlert) alerts.push(geoAlert);

  const bulkAlert = checkBulkExport(event);
  if (bulkAlert) alerts.push(bulkAlert);

  const financialAlert = checkUnusualFinancialMods(event);
  if (financialAlert) alerts.push(financialAlert);

  const afterHoursAlert = checkAfterHoursAdmin(event);
  if (afterHoursAlert) alerts.push(afterHoursAlert);

  return alerts;
}

/**
 * Detect login from a new geographic location.
 * Tracks known IP addresses per user and flags new ones on auth events.
 */
function checkNewGeoLogin(event: LogAuditEventInput): AnomalyAlert | null {
  if (event.category !== 'auth' || !event.ipAddress || !event.userId) {
    return null;
  }

  // Only check successful login events
  if (!event.actionType.includes('login') || event.outcome === 'failure') {
    return null;
  }

  const userId = event.userId;
  const ipAddress = event.ipAddress;

  if (!knownGeoLocations.has(userId)) {
    // First login ever recorded — establish baseline, no alert
    knownGeoLocations.set(userId, new Set([ipAddress]));
    return null;
  }

  const knownIps = knownGeoLocations.get(userId)!;
  if (knownIps.has(ipAddress)) {
    return null; // Known IP, no anomaly
  }

  // New IP detected — flag anomaly and add to known set
  knownIps.add(ipAddress);

  return {
    type: 'new_geo_login' as AnomalyType,
    userId,
    description: `Login from new IP address: ${ipAddress}`,
    detectedAt: new Date(),
    metadata: {
      ipAddress,
      knownIpCount: knownIps.size,
      actionType: event.actionType,
    },
  };
}

/**
 * Detect bulk data export patterns.
 * Flags when a user performs more than the threshold number of
 * export-type actions within a 5-minute window.
 */
function checkBulkExport(event: LogAuditEventInput): AnomalyAlert | null {
  if (!event.userId) return null;

  // Check if this is an export-related action
  const isExport = event.actionType.includes('export') || event.actionType.includes('download');
  if (!isExport) return null;

  const userId = event.userId;
  const now = new Date();
  const windowMs = 5 * 60 * 1000; // 5 minutes

  const tracker = exportTrackers.get(userId);

  if (!tracker || now.getTime() - tracker.windowStart.getTime() > windowMs) {
    // Start new window
    exportTrackers.set(userId, { userId, count: 1, windowStart: now });
    return null;
  }

  // Increment count within window
  tracker.count++;

  if (tracker.count >= BULK_EXPORT_THRESHOLD) {
    // Reset tracker after alert
    exportTrackers.delete(userId);
    return {
      type: 'bulk_export' as AnomalyType,
      userId,
      description: `Bulk export detected: ${tracker.count} exports in 5 minutes`,
      detectedAt: now,
      metadata: {
        exportCount: tracker.count,
        windowStart: tracker.windowStart.toISOString(),
        resourceType: event.resourceType,
      },
    };
  }

  return null;
}

/**
 * Detect unusual financial modifications.
 * Flags when a user performs more than the threshold number of
 * financial modifications within a 1-hour window.
 */
function checkUnusualFinancialMods(event: LogAuditEventInput): AnomalyAlert | null {
  if (event.category !== 'financial_operation' || !event.userId) {
    return null;
  }

  const userId = event.userId;
  const now = new Date();
  const windowMs = 60 * 60 * 1000; // 1 hour

  const tracker = financialModTrackers.get(userId);

  if (!tracker || now.getTime() - tracker.windowStart.getTime() > windowMs) {
    financialModTrackers.set(userId, { userId, count: 1, windowStart: now });
    return null;
  }

  tracker.count++;

  if (tracker.count >= FINANCIAL_MOD_THRESHOLD) {
    financialModTrackers.delete(userId);
    return {
      type: 'unusual_financial_modification' as AnomalyType,
      userId,
      description: `Unusual financial activity: ${tracker.count} modifications in 1 hour`,
      detectedAt: now,
      metadata: {
        modificationCount: tracker.count,
        windowStart: tracker.windowStart.toISOString(),
        actionType: event.actionType,
        resourceType: event.resourceType,
      },
    };
  }

  return null;
}

/**
 * Detect after-hours administrative actions.
 * Flags admin actions performed outside business hours (06:00–22:00 UTC).
 */
function checkAfterHoursAdmin(event: LogAuditEventInput): AnomalyAlert | null {
  if (!event.userId) return null;

  // Only applies to admin-level actions
  const isAdminAction = event.actionType.includes('admin') ||
    event.category === 'staff_action' ||
    event.resourceType === 'system_config';
  if (!isAdminAction) return null;

  const now = new Date();
  const currentHour = now.getUTCHours();

  if (currentHour >= BUSINESS_HOURS_START && currentHour < BUSINESS_HOURS_END) {
    return null; // Within business hours
  }

  return {
    type: 'after_hours_admin_action' as AnomalyType,
    userId: event.userId,
    description: `Administrative action performed outside business hours at ${now.toISOString()}`,
    detectedAt: now,
    metadata: {
      hour: currentHour,
      actionType: event.actionType,
      resourceType: event.resourceType,
      businessHours: `${BUSINESS_HOURS_START}:00-${BUSINESS_HOURS_END}:00 UTC`,
    },
  };
}

/**
 * Reset all tracking state (for testing purposes).
 */
export function resetAnomalyTrackers(): void {
  exportTrackers.clear();
  financialModTrackers.clear();
  knownGeoLocations.clear();
}
