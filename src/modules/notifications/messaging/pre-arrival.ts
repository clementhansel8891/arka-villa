/**
 * Automated Pre-Arrival Messages
 *
 * Sends configurable pre-arrival messages to guests 48 hours before
 * their scheduled check-in time. Templates are configurable per villa.
 *
 * Requirement: 12.6
 */

import { randomUUID } from 'crypto';
import { tenantQuery, publicQuery } from '@/lib/db';
import { EventBus, STREAMS } from '@/lib/events';
import type { PlatformEvent } from '@/lib/events';
import type {
  PreArrivalTemplate,
  PreArrivalTemplateRow,
} from './types';
import { MESSAGE_CONSTRAINTS } from './types';
import { sendMessage } from './service';

/**
 * Booking with guest info for pre-arrival message dispatch.
 */
interface UpcomingBooking {
  id: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  checkInDate: Date;
  roomName: string;
  villaName: string;
}

/**
 * Result of a pre-arrival message dispatch run.
 */
export interface PreArrivalRunResult {
  tenantId: string;
  bookingsProcessed: number;
  messagesSent: number;
  errors: string[];
}

/**
 * Get all active pre-arrival templates for a tenant.
 */
export async function getPreArrivalTemplates(
  tenantId: string
): Promise<PreArrivalTemplate[]> {
  const result = await tenantQuery<PreArrivalTemplateRow>(
    tenantId,
    `SELECT * FROM pre_arrival_templates WHERE enabled = true ORDER BY hours_before_check_in ASC`,
    []
  );

  return result.rows.map(mapTemplateRow);
}

/**
 * Create or update a pre-arrival template for a villa.
 */
export async function upsertPreArrivalTemplate(
  tenantId: string,
  template: Omit<PreArrivalTemplate, 'createdAt' | 'updatedAt'>
): Promise<PreArrivalTemplate> {
  const result = await tenantQuery<PreArrivalTemplateRow>(
    tenantId,
    `INSERT INTO pre_arrival_templates (id, villa_id, tenant_id, name, content, hours_before_check_in, enabled, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       content = EXCLUDED.content,
       hours_before_check_in = EXCLUDED.hours_before_check_in,
       enabled = EXCLUDED.enabled,
       updated_at = NOW()
     RETURNING *`,
    [
      template.id,
      template.villaId,
      tenantId,
      template.name,
      template.content,
      template.hoursBeforeCheckIn,
      template.enabled,
    ]
  );

  return mapTemplateRow(result.rows[0]);
}

/**
 * Find bookings that are within the pre-arrival message window
 * (default: 48 hours before check-in) and have not yet received
 * a pre-arrival message.
 */
export async function findBookingsForPreArrival(
  tenantId: string,
  hoursBeforeCheckIn: number = MESSAGE_CONSTRAINTS.DEFAULT_PRE_ARRIVAL_HOURS
): Promise<UpcomingBooking[]> {
  const result = await tenantQuery<{
    id: string;
    guest_id: string;
    guest_name: string;
    guest_email: string;
    check_in_date: Date;
    room_name: string;
    villa_name: string;
  }>(
    tenantId,
    `SELECT
       b.id,
       b.guest_id,
       COALESCE(g.full_name, g.email) as guest_name,
       g.email as guest_email,
       b.check_in_date,
       COALESCE(r.name, 'Room') as room_name,
       COALESCE(vs.villa_name, 'Villa') as villa_name
     FROM bookings b
     LEFT JOIN guests g ON g.id = b.guest_id
     LEFT JOIN rooms r ON r.id = b.room_id
     LEFT JOIN villa_settings vs ON true
     WHERE b.status IN ('confirmed', 'paid')
       AND b.check_in_date > NOW()
       AND b.check_in_date <= NOW() + INTERVAL '${hoursBeforeCheckIn} hours'
       AND NOT EXISTS (
         SELECT 1 FROM guest_communications gc
         WHERE gc.booking_id = b.id
           AND gc.direction = 'outbound'
           AND gc.message LIKE '%[pre-arrival]%'
       )
     ORDER BY b.check_in_date ASC`,
    []
  );

  return result.rows.map((row) => ({
    id: row.id,
    guestId: row.guest_id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    checkInDate: row.check_in_date,
    roomName: row.room_name,
    villaName: row.villa_name,
  }));
}

/**
 * Replace template placeholders with booking-specific values.
 */
export function renderTemplate(
  templateContent: string,
  booking: UpcomingBooking
): string {
  const checkInFormatted = booking.checkInDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return templateContent
    .replace(/\{\{guest_name\}\}/g, booking.guestName)
    .replace(/\{\{check_in_date\}\}/g, checkInFormatted)
    .replace(/\{\{room_name\}\}/g, booking.roomName)
    .replace(/\{\{villa_name\}\}/g, booking.villaName)
    .replace(/\{\{booking_id\}\}/g, booking.id);
}

/**
 * Send pre-arrival messages for a single tenant.
 *
 * Fetches active templates, finds eligible bookings, renders messages,
 * and sends them as outbound communications.
 *
 * Requirement: 12.6
 */
export async function sendPreArrivalMessages(
  tenantId: string,
  eventBus?: EventBus
): Promise<PreArrivalRunResult> {
  const result: PreArrivalRunResult = {
    tenantId,
    bookingsProcessed: 0,
    messagesSent: 0,
    errors: [],
  };

  // Get active templates for this tenant
  const templates = await getPreArrivalTemplates(tenantId);
  if (templates.length === 0) {
    return result;
  }

  // For each template, find bookings in its window and send messages
  for (const template of templates) {
    const bookings = await findBookingsForPreArrival(
      tenantId,
      template.hoursBeforeCheckIn
    );

    result.bookingsProcessed += bookings.length;

    for (const booking of bookings) {
      try {
        const messageContent = `[pre-arrival] ${renderTemplate(template.content, booking)}`;

        await sendMessage(
          tenantId,
          {
            bookingId: booking.id,
            guestId: booking.guestId,
            direction: 'outbound',
            channel: 'in_app',
            message: messageContent,
          },
          'system',
          'system',
          eventBus
        );

        result.messagesSent++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(
          `Failed to send pre-arrival to booking ${booking.id}: ${errorMsg}`
        );
      }
    }
  }

  return result;
}

/**
 * Run pre-arrival message dispatch across all active tenants.
 *
 * Called by the scheduled job (n8n workflow or internal cron)
 * every 6 hours to catch bookings entering the 48h window.
 */
export async function runPreArrivalAllTenants(
  eventBus?: EventBus
): Promise<PreArrivalRunResult[]> {
  const tenantsResult = await publicQuery<{ id: string }>(
    `SELECT id FROM tenants WHERE status = 'active'`
  );

  const results: PreArrivalRunResult[] = [];

  for (const tenant of tenantsResult.rows) {
    try {
      const tenantResult = await sendPreArrivalMessages(tenant.id, eventBus);
      results.push(tenantResult);
    } catch (error) {
      console.error(
        `[PreArrival] Error processing tenant ${tenant.id}:`,
        error instanceof Error ? error.message : error
      );
      results.push({
        tenantId: tenant.id,
        bookingsProcessed: 0,
        messagesSent: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  return results;
}

/**
 * Map a database row to a PreArrivalTemplate domain object.
 */
function mapTemplateRow(row: PreArrivalTemplateRow): PreArrivalTemplate {
  return {
    id: row.id,
    villaId: row.villa_id,
    tenantId: row.tenant_id,
    name: row.name,
    content: row.content,
    hoursBeforeCheckIn: row.hours_before_check_in,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
