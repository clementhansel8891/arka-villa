/**
 * Guest Messaging Service
 *
 * Core logic for guest communication within booking context.
 * Handles message sending, validation, messaging window enforcement,
 * notification delivery to assigned employees, and message retrieval.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { randomUUID } from 'crypto';
import { tenantQuery } from '@/lib/db';
import { EventBus, STREAMS } from '@/lib/events';
import type { PlatformEvent } from '@/lib/events';
import type {
  SendMessageRequest,
  ListMessagesFilter,
  ListMessagesResult,
  GuestCommunication,
  GuestCommunicationRow,
  BookingDateContext,
  MessageAttachment,
  MessagingErrorCode,
} from './types';
import { MESSAGE_CONSTRAINTS } from './types';

/**
 * Custom error for messaging operations.
 */
export class MessagingError extends Error {
  readonly code: MessagingErrorCode;
  readonly statusCode: number;

  constructor(message: string, code: MessagingErrorCode, statusCode = 400) {
    super(message);
    this.name = 'MessagingError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Validate that the current time is within the allowed messaging window
 * (7 days before check-in through 7 days after checkout).
 */
export function isWithinMessagingWindow(
  bookingDates: BookingDateContext,
  now: Date = new Date()
): boolean {
  const windowStart = new Date(bookingDates.checkInDate);
  windowStart.setDate(
    windowStart.getDate() - MESSAGE_CONSTRAINTS.MESSAGING_WINDOW_BEFORE_DAYS
  );

  const windowEnd = new Date(bookingDates.checkOutDate);
  windowEnd.setDate(
    windowEnd.getDate() + MESSAGE_CONSTRAINTS.MESSAGING_WINDOW_AFTER_DAYS
  );

  return now >= windowStart && now <= windowEnd;
}

/**
 * Validate message content and attachments against constraints.
 */
export function validateMessage(request: SendMessageRequest): void {
  if (!request.message || request.message.trim().length === 0) {
    throw new MessagingError(
      'Message text is required',
      'VALIDATION_ERROR'
    );
  }

  if (request.message.length > MESSAGE_CONSTRAINTS.MAX_TEXT_LENGTH) {
    throw new MessagingError(
      `Message exceeds maximum length of ${MESSAGE_CONSTRAINTS.MAX_TEXT_LENGTH} characters`,
      'MESSAGE_TOO_LONG'
    );
  }

  if (request.attachments && request.attachments.length > MESSAGE_CONSTRAINTS.MAX_ATTACHMENTS) {
    throw new MessagingError(
      `Maximum ${MESSAGE_CONSTRAINTS.MAX_ATTACHMENTS} attachments allowed per message`,
      'TOO_MANY_ATTACHMENTS'
    );
  }

  if (request.attachments) {
    for (const attachment of request.attachments) {
      validateAttachment(attachment);
    }
  }
}

/**
 * Validate a single attachment (must be an image, max 5MB).
 */
function validateAttachment(attachment: MessageAttachment): void {
  if (attachment.sizeBytes > MESSAGE_CONSTRAINTS.MAX_ATTACHMENT_SIZE_BYTES) {
    throw new MessagingError(
      `Attachment "${attachment.filename}" exceeds maximum size of 5MB`,
      'ATTACHMENT_TOO_LARGE'
    );
  }

  if (!attachment.mimeType.startsWith('image/')) {
    throw new MessagingError(
      `Attachment "${attachment.filename}" must be an image (received: ${attachment.mimeType})`,
      'INVALID_ATTACHMENT_TYPE'
    );
  }
}

/**
 * Fetch booking date context for messaging window validation.
 */
async function getBookingDates(
  tenantId: string,
  bookingId: string
): Promise<BookingDateContext | null> {
  const result = await tenantQuery<{ check_in_date: Date; check_out_date: Date }>(
    tenantId,
    `SELECT check_in_date, check_out_date FROM bookings WHERE id = $1`,
    [bookingId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    checkInDate: result.rows[0].check_in_date,
    checkOutDate: result.rows[0].check_out_date,
  };
}

/**
 * Get the assigned employee for a villa (tenant).
 * Returns the employee's user ID or null if none assigned.
 */
async function getAssignedEmployee(
  tenantId: string
): Promise<{ userId: string; notificationEnabled: boolean } | null> {
  const result = await tenantQuery<{ user_id: string; notification_enabled: boolean }>(
    tenantId,
    `SELECT user_id, COALESCE(notification_enabled, true) as notification_enabled
     FROM staff_assignments
     WHERE role = 'guest_communication' AND active = true
     ORDER BY assigned_at DESC
     LIMIT 1`,
    []
  );

  if (result.rows.length === 0) {
    return null;
  }

  return {
    userId: result.rows[0].user_id,
    notificationEnabled: result.rows[0].notification_enabled,
  };
}

/**
 * Send a guest message and trigger notifications.
 *
 * Validates the messaging window, message constraints, stores the message,
 * and emits a notification event for delivery to the assigned employee
 * (with fallback to Agency_Admin).
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */
export async function sendMessage(
  tenantId: string,
  request: SendMessageRequest,
  actorUserId: string,
  actorRole: string,
  eventBus?: EventBus
): Promise<GuestCommunication> {
  // Validate message content
  validateMessage(request);

  // Fetch booking dates for window check
  const bookingDates = await getBookingDates(tenantId, request.bookingId);
  if (!bookingDates) {
    throw new MessagingError(
      'Booking not found',
      'BOOKING_NOT_FOUND',
      404
    );
  }

  // Enforce messaging window
  if (!isWithinMessagingWindow(bookingDates)) {
    throw new MessagingError(
      'Messaging is only available from 7 days before check-in through 7 days after checkout',
      'OUTSIDE_MESSAGING_WINDOW',
      403
    );
  }

  const messageId = randomUUID();
  const attachmentsJson = JSON.stringify(request.attachments ?? []);

  // Insert message into per-tenant guest_communications table
  const insertResult = await tenantQuery<GuestCommunicationRow>(
    tenantId,
    `INSERT INTO guest_communications (id, booking_id, guest_id, direction, channel, message, attachments, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
     RETURNING *`,
    [
      messageId,
      request.bookingId,
      request.guestId,
      request.direction,
      request.channel,
      request.message,
      attachmentsJson,
    ]
  );

  const row = insertResult.rows[0];
  const communication = mapRowToCommunication(row);

  // Emit notification event for inbound guest messages
  if (request.direction === 'inbound' && eventBus) {
    await emitMessageNotification(
      eventBus,
      tenantId,
      communication,
      actorUserId,
      actorRole
    );
  }

  return communication;
}

/**
 * Emit a notification event when a guest sends a message.
 * Delivers to assigned Employee; falls back to Agency_Admin if no employee
 * is assigned or delivery fails.
 *
 * Requirements: 12.2, 12.3
 */
async function emitMessageNotification(
  eventBus: EventBus,
  tenantId: string,
  message: GuestCommunication,
  actorUserId: string,
  actorRole: string
): Promise<void> {
  const assignedEmployee = await getAssignedEmployee(tenantId);

  // Determine notification target
  const targetUserId = assignedEmployee?.userId ?? null;
  const fallbackToAdmin = !assignedEmployee || !assignedEmployee.notificationEnabled;

  const event: PlatformEvent<{
    messageId: string;
    bookingId: string;
    guestId: string;
    targetUserId: string | null;
    fallbackToAdmin: boolean;
    channel: string;
    preview: string;
  }> = {
    id: randomUUID(),
    type: 'notification.send_requested',
    version: 1,
    timestamp: new Date().toISOString(),
    source: 'notifications/messaging',
    tenantId,
    correlationId: message.bookingId,
    actor: {
      userId: actorUserId,
      role: actorRole,
    },
    payload: {
      messageId: message.id,
      bookingId: message.bookingId,
      guestId: message.guestId,
      targetUserId,
      fallbackToAdmin,
      channel: message.channel,
      preview: message.message.slice(0, 100),
    },
    metadata: {
      retryCount: 0,
      maxRetries: 3,
      priority: 'high',
    },
  };

  await eventBus.emit(STREAMS.NOTIFICATIONS, event);
}

/**
 * List guest communications for a booking or guest.
 *
 * Requirement: 12.4
 */
export async function listMessages(
  tenantId: string,
  filter: ListMessagesFilter
): Promise<ListMessagesResult> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filter.bookingId) {
    conditions.push(`booking_id = $${paramIndex++}`);
    params.push(filter.bookingId);
  }

  if (filter.guestId) {
    conditions.push(`guest_id = $${paramIndex++}`);
    params.push(filter.guestId);
  }

  if (filter.direction) {
    conditions.push(`direction = $${paramIndex++}`);
    params.push(filter.direction);
  }

  if (filter.channel) {
    conditions.push(`channel = $${paramIndex++}`);
    params.push(filter.channel);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;

  // Count total matching messages
  const countResult = await tenantQuery<{ count: string }>(
    tenantId,
    `SELECT COUNT(*) as count FROM guest_communications ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0].count, 10);

  // Fetch paginated messages
  const dataResult = await tenantQuery<GuestCommunicationRow>(
    tenantId,
    `SELECT * FROM guest_communications ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  const messages = dataResult.rows.map(mapRowToCommunication);

  return { messages, total };
}

/**
 * Mark a message as read.
 */
export async function markMessageRead(
  tenantId: string,
  messageId: string
): Promise<void> {
  await tenantQuery(
    tenantId,
    `UPDATE guest_communications SET read_at = NOW() WHERE id = $1 AND read_at IS NULL`,
    [messageId]
  );
}

/**
 * Map a database row to a GuestCommunication domain object.
 */
function mapRowToCommunication(row: GuestCommunicationRow): GuestCommunication {
  return {
    id: row.id,
    bookingId: row.booking_id,
    guestId: row.guest_id,
    direction: row.direction,
    channel: row.channel,
    message: row.message,
    attachments: typeof row.attachments === 'string'
      ? JSON.parse(row.attachments)
      : row.attachments,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
