/**
 * Guest Communication System Types
 *
 * Types for the guest messaging interface, supporting multi-channel
 * communication from 7 days pre-check-in through 7 days post-checkout.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

/** Direction of a guest communication message. */
export type MessageDirection = 'inbound' | 'outbound';

/** Communication channel for guest messages. */
export type MessageChannel = 'in_app' | 'email' | 'whatsapp' | 'telegram';

/** Status of message escalation. */
export type EscalationStatus = 'none' | 'pending' | 'escalated' | 'resolved';

/** Attachment metadata stored in JSONB. */
export interface MessageAttachment {
  /** Unique file identifier */
  id: string;
  /** Original filename */
  filename: string;
  /** MIME type (must be image/*) */
  mimeType: string;
  /** File size in bytes (max 5MB = 5,242,880 bytes) */
  sizeBytes: number;
  /** Storage URL (MinIO or equivalent) */
  url: string;
  /** Upload timestamp */
  uploadedAt: string;
}

/** A guest communication record stored per-tenant. */
export interface GuestCommunication {
  id: string;
  bookingId: string;
  guestId: string;
  direction: MessageDirection;
  channel: MessageChannel;
  message: string;
  attachments: MessageAttachment[];
  readAt: Date | null;
  createdAt: Date;
}

/** Row type matching the per-tenant guest_communications table. */
export interface GuestCommunicationRow {
  id: string;
  booking_id: string;
  guest_id: string;
  direction: MessageDirection;
  channel: MessageChannel;
  message: string;
  attachments: string; // JSONB stored as string
  read_at: Date | null;
  created_at: Date;
}

/** Request to send a new guest message. */
export interface SendMessageRequest {
  bookingId: string;
  guestId: string;
  direction: MessageDirection;
  channel: MessageChannel;
  message: string;
  attachments?: MessageAttachment[];
}

/** Filters for listing guest communications. */
export interface ListMessagesFilter {
  bookingId?: string;
  guestId?: string;
  direction?: MessageDirection;
  channel?: MessageChannel;
  limit?: number;
  offset?: number;
}

/** Result from listing messages. */
export interface ListMessagesResult {
  messages: GuestCommunication[];
  total: number;
}

/** Booking date context for messaging window validation. */
export interface BookingDateContext {
  checkInDate: Date;
  checkOutDate: Date;
}

/** Villa business hours configuration. */
export interface BusinessHoursConfig {
  /** Start hour in 24h format (0-23). Default: 8 */
  startHour: number;
  /** End hour in 24h format (0-23). Default: 20 */
  endHour: number;
  /** IANA timezone string (e.g., "Asia/Makassar") */
  timezone: string;
}

/** Pre-arrival message template configurable per villa. */
export interface PreArrivalTemplate {
  id: string;
  villaId: string;
  tenantId: string;
  /** Template name for admin reference */
  name: string;
  /** Message content (supports placeholder tokens) */
  content: string;
  /** Hours before check-in to send (default: 48) */
  hoursBeforeCheckIn: number;
  /** Whether this template is active */
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Pre-arrival message row from the database. */
export interface PreArrivalTemplateRow {
  id: string;
  villa_id: string;
  tenant_id: string;
  name: string;
  content: string;
  hours_before_check_in: number;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

/** Constants for message validation. */
export const MESSAGE_CONSTRAINTS = {
  /** Maximum message text length in characters */
  MAX_TEXT_LENGTH: 2000,
  /** Maximum number of image attachments per message */
  MAX_ATTACHMENTS: 3,
  /** Maximum file size per attachment in bytes (5MB) */
  MAX_ATTACHMENT_SIZE_BYTES: 5 * 1024 * 1024,
  /** Days before check-in messaging window opens */
  MESSAGING_WINDOW_BEFORE_DAYS: 7,
  /** Days after checkout messaging window closes */
  MESSAGING_WINDOW_AFTER_DAYS: 7,
  /** Default pre-arrival message hours before check-in */
  DEFAULT_PRE_ARRIVAL_HOURS: 48,
} as const;

/** Default business hours configuration. */
export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  startHour: 8,
  endHour: 20,
  timezone: 'Asia/Makassar',
};

/** Error codes for messaging operations. */
export type MessagingErrorCode =
  | 'OUTSIDE_MESSAGING_WINDOW'
  | 'MESSAGE_TOO_LONG'
  | 'TOO_MANY_ATTACHMENTS'
  | 'ATTACHMENT_TOO_LARGE'
  | 'INVALID_ATTACHMENT_TYPE'
  | 'BOOKING_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR';
