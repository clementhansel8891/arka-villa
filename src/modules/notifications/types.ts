/**
 * Notifications module types.
 *
 * Defines notification channels, priorities, preferences,
 * delivery results, and the send request shape.
 */

// ─── Channel & Priority ─────────────────────────────────────────────

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp';

export type NotificationPriority = 'critical' | 'non_urgent';

/**
 * Ordered channel priority for fallback delivery.
 * in_app > email > whatsapp
 */
export const CHANNEL_PRIORITY: NotificationChannel[] = [
  'in_app',
  'email',
  'whatsapp',
];

// ─── Notification ────────────────────────────────────────────────────

export interface Notification {
  id: string;
  userId: string;
  tenantId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  eventType: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  deliveredAt: Date | null;
  createdAt: Date;
}

// ─── Preferences ─────────────────────────────────────────────────────

export interface NotificationPreferenceRow {
  id: string;
  userId: string;
  channel: NotificationChannel;
  eventType: string;
  enabled: boolean;
  digestTime: string; // HH:mm format, default "08:00"
}

export interface UserPreferences {
  userId: string;
  /** Map of eventType -> channel -> preference */
  preferences: Map<string, Map<NotificationChannel, ChannelPreference>>;
}

export interface ChannelPreference {
  enabled: boolean;
  digestTime: string;
}

// ─── Send Request ────────────────────────────────────────────────────

export interface SendNotificationRequest {
  /** Target user IDs */
  userIds: string[];
  /** Tenant context */
  tenantId: string;
  /** Event type that triggered this notification (e.g., "booking.cancelled") */
  eventType: string;
  /** Notification priority classification */
  priority: NotificationPriority;
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Optional metadata attached to the notification */
  metadata?: Record<string, unknown>;
}

// ─── Delivery Result ─────────────────────────────────────────────────

export interface DeliveryResult {
  userId: string;
  channel: NotificationChannel;
  success: boolean;
  error?: string;
  attemptCount: number;
  fallbackUsed?: NotificationChannel;
}

export interface SendNotificationResult {
  /** Total notifications dispatched */
  dispatched: number;
  /** Delivery results per user per channel */
  results: DeliveryResult[];
  /** Notifications queued for digest (non_urgent) */
  digestQueued: number;
}

// ─── Channel Adapter Interface ───────────────────────────────────────

export interface ChannelAdapter {
  readonly channel: NotificationChannel;
  /**
   * Deliver a notification to a user on this channel.
   * @returns true if delivery was successful, false otherwise
   */
  deliver(notification: NotificationPayload): Promise<ChannelDeliveryResult>;
}

export interface NotificationPayload {
  userId: string;
  tenantId: string;
  title: string;
  body: string;
  eventType: string;
  priority: NotificationPriority;
  metadata?: Record<string, unknown>;
}

export interface ChannelDeliveryResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

// ─── Digest ──────────────────────────────────────────────────────────

export interface DigestEntry {
  userId: string;
  tenantId: string;
  title: string;
  body: string;
  eventType: string;
  createdAt: string;
}

// ─── Retry Configuration ─────────────────────────────────────────────

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 5000,
};

export const DEFAULT_DIGEST_TIME = '08:00';
