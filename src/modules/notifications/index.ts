/**
 * Notifications Module
 *
 * Multi-channel notification dispatch (in-app, email, WhatsApp),
 * preference management, digest scheduling, and delivery tracking.
 *
 * Key features:
 * - Critical notifications: immediate delivery on all channels within 30 seconds
 * - Non-urgent: collected into daily digest at user's configured time (default 08:00)
 * - Retry with exponential backoff (3 retries), fallback to next channel
 * - Priority order: in_app > email > whatsapp
 * - WebSocket real-time delivery for in-app notifications
 */

export * from './types';

export {
  sendNotification,
  consumeDigest,
  sendDigest,
  getUserDigestTime,
} from './service';

export {
  getUserPreferences,
  getEnabledChannels,
  getDigestTime,
  upsertPreference,
  getFallbackChannels,
} from './preferences';

export { subscribeToUserNotifications } from './channels/in-app';

export * from './messaging';
