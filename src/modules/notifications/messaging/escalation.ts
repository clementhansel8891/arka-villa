/**
 * Guest Message Escalation Service
 *
 * Monitors unresponded guest messages and escalates to Agency_Admin
 * when no response is received within 30 minutes during business hours.
 *
 * Requirement: 12.5
 */

import { randomUUID } from 'crypto';
import { tenantQuery, publicQuery } from '@/lib/db';
import { EventBus, STREAMS } from '@/lib/events';
import type { PlatformEvent } from '@/lib/events';
import type {
  BusinessHoursConfig,
  GuestCommunicationRow,
} from './types';
import { DEFAULT_BUSINESS_HOURS } from './types';

/** Escalation check result for a single message. */
export interface EscalationCandidate {
  messageId: string;
  bookingId: string;
  guestId: string;
  tenantId: string;
  createdAt: Date;
  minutesUnresponded: number;
}

/** Result of an escalation check run. */
export interface EscalationRunResult {
  checked: number;
  escalated: number;
  skippedOutsideBusinessHours: number;
}

/**
 * Check if the current time is within configured business hours
 * for the given timezone.
 */
export function isWithinBusinessHours(
  config: BusinessHoursConfig,
  now: Date = new Date()
): boolean {
  // Convert current time to the villa's timezone
  const timeInTimezone = new Date(
    now.toLocaleString('en-US', { timeZone: config.timezone })
  );
  const currentHour = timeInTimezone.getHours();

  return currentHour >= config.startHour && currentHour < config.endHour;
}

/**
 * Get the business hours configuration for a tenant (villa).
 * Falls back to default (08:00-20:00) if not configured.
 */
export async function getBusinessHours(
  tenantId: string
): Promise<BusinessHoursConfig> {
  try {
    const result = await tenantQuery<{
      business_hours_start: number;
      business_hours_end: number;
      timezone: string;
    }>(
      tenantId,
      `SELECT
        COALESCE(business_hours_start, $1) as business_hours_start,
        COALESCE(business_hours_end, $2) as business_hours_end,
        COALESCE(timezone, $3) as timezone
       FROM villa_settings
       LIMIT 1`,
      [DEFAULT_BUSINESS_HOURS.startHour, DEFAULT_BUSINESS_HOURS.endHour, DEFAULT_BUSINESS_HOURS.timezone]
    );

    if (result.rows.length === 0) {
      return DEFAULT_BUSINESS_HOURS;
    }

    return {
      startHour: result.rows[0].business_hours_start,
      endHour: result.rows[0].business_hours_end,
      timezone: result.rows[0].timezone,
    };
  } catch {
    return DEFAULT_BUSINESS_HOURS;
  }
}

/**
 * Find inbound guest messages that have not received a response
 * within 30 minutes. A message is considered "responded" if there
 * is any outbound message for the same booking created after it.
 */
export async function findUnrespondedMessages(
  tenantId: string,
  thresholdMinutes: number = 30
): Promise<EscalationCandidate[]> {
  const result = await tenantQuery<
    GuestCommunicationRow & { minutes_unresponded: number }
  >(
    tenantId,
    `SELECT gc.*, 
            EXTRACT(EPOCH FROM (NOW() - gc.created_at)) / 60 as minutes_unresponded
     FROM guest_communications gc
     WHERE gc.direction = 'inbound'
       AND gc.created_at < NOW() - INTERVAL '${thresholdMinutes} minutes'
       AND NOT EXISTS (
         SELECT 1 FROM guest_communications reply
         WHERE reply.booking_id = gc.booking_id
           AND reply.direction = 'outbound'
           AND reply.created_at > gc.created_at
       )
       AND NOT EXISTS (
         SELECT 1 FROM message_escalations me
         WHERE me.message_id = gc.id
           AND me.status IN ('escalated', 'resolved')
       )
     ORDER BY gc.created_at ASC`,
    []
  );

  return result.rows.map((row) => ({
    messageId: row.id,
    bookingId: row.booking_id,
    guestId: row.guest_id,
    tenantId,
    createdAt: row.created_at,
    minutesUnresponded: Math.round(row.minutes_unresponded),
  }));
}

/**
 * Record an escalation in the database and emit an escalation event.
 */
export async function escalateMessage(
  tenantId: string,
  candidate: EscalationCandidate,
  eventBus?: EventBus
): Promise<void> {
  const escalationId = randomUUID();

  // Record escalation in per-tenant table
  await tenantQuery(
    tenantId,
    `INSERT INTO message_escalations (id, message_id, booking_id, status, escalated_at)
     VALUES ($1, $2, $3, 'escalated', NOW())
     ON CONFLICT (message_id) DO UPDATE SET status = 'escalated', escalated_at = NOW()`,
    [escalationId, candidate.messageId, candidate.bookingId]
  );

  // Emit escalation event to event bus
  if (eventBus) {
    const event: PlatformEvent<{
      escalationId: string;
      messageId: string;
      bookingId: string;
      guestId: string;
      minutesUnresponded: number;
      reason: string;
    }> = {
      id: randomUUID(),
      type: 'escalation.triggered',
      version: 1,
      timestamp: new Date().toISOString(),
      source: 'notifications/messaging/escalation',
      tenantId,
      correlationId: candidate.bookingId,
      actor: {
        userId: 'system',
        role: 'system',
      },
      payload: {
        escalationId,
        messageId: candidate.messageId,
        bookingId: candidate.bookingId,
        guestId: candidate.guestId,
        minutesUnresponded: candidate.minutesUnresponded,
        reason: 'Guest message unresponded for 30+ minutes during business hours',
      },
      metadata: {
        retryCount: 0,
        maxRetries: 3,
        priority: 'high',
      },
    };

    await eventBus.emit(STREAMS.ESCALATIONS, event);
  }
}

/**
 * Run the escalation check for a single tenant.
 *
 * Checks if current time is within business hours, then finds
 * unresponded messages and escalates them to Agency_Admin.
 *
 * Requirement: 12.5
 */
export async function runEscalationCheck(
  tenantId: string,
  eventBus?: EventBus
): Promise<EscalationRunResult> {
  const businessHours = await getBusinessHours(tenantId);

  // Skip escalation outside business hours
  if (!isWithinBusinessHours(businessHours)) {
    return { checked: 0, escalated: 0, skippedOutsideBusinessHours: 1 };
  }

  const candidates = await findUnrespondedMessages(tenantId);

  let escalated = 0;
  for (const candidate of candidates) {
    await escalateMessage(tenantId, candidate, eventBus);
    escalated++;
  }

  return {
    checked: candidates.length,
    escalated,
    skippedOutsideBusinessHours: 0,
  };
}

/**
 * Run escalation checks across all active tenants.
 *
 * Called by the scheduled job (n8n or internal cron) every minute
 * to detect and escalate unresponded guest messages.
 */
export async function runEscalationCheckAllTenants(
  eventBus?: EventBus
): Promise<{ tenantResults: Record<string, EscalationRunResult> }> {
  // Fetch all active tenants
  const tenantsResult = await publicQuery<{ id: string }>(
    `SELECT id FROM tenants WHERE status = 'active'`
  );

  const tenantResults: Record<string, EscalationRunResult> = {};

  for (const tenant of tenantsResult.rows) {
    try {
      tenantResults[tenant.id] = await runEscalationCheck(tenant.id, eventBus);
    } catch (error) {
      // Log error but continue checking other tenants
      console.error(
        `[Escalation] Error checking tenant ${tenant.id}:`,
        error instanceof Error ? error.message : error
      );
      tenantResults[tenant.id] = { checked: 0, escalated: 0, skippedOutsideBusinessHours: 0 };
    }
  }

  return { tenantResults };
}
