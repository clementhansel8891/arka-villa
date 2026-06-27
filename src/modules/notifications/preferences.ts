/**
 * Notification preferences management.
 *
 * Handles per-user, per-channel, per-event-type preference lookups
 * and updates. Preferences are stored in the public schema
 * notification_preferences table.
 */

import { publicQuery } from '@/lib/db';
import type {
  ChannelPreference,
  NotificationChannel,
  NotificationPreferenceRow,
  UserPreferences,
} from './types';
import { CHANNEL_PRIORITY, DEFAULT_DIGEST_TIME } from './types';

/**
 * Get all notification preferences for a user.
 *
 * Returns a structured map of eventType -> channel -> preference.
 * If no preferences exist for a given event type + channel combination,
 * in_app is enabled by default (per requirement 15.3).
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const result = await publicQuery<NotificationPreferenceRow>(
    `SELECT id, user_id AS "userId", channel, event_type AS "eventType", enabled, digest_time AS "digestTime"
     FROM notification_preferences
     WHERE user_id = $1`,
    [userId]
  );

  const preferences = new Map<string, Map<NotificationChannel, ChannelPreference>>();

  for (const row of result.rows) {
    if (!preferences.has(row.eventType)) {
      preferences.set(row.eventType, new Map());
    }
    const channelMap = preferences.get(row.eventType)!;
    channelMap.set(row.channel, {
      enabled: row.enabled,
      digestTime: row.digestTime || DEFAULT_DIGEST_TIME,
    });
  }

  return { userId, preferences };
}

/**
 * Get enabled channels for a user for a specific event type.
 *
 * Returns the channels in priority order (in_app > email > whatsapp)
 * that the user has enabled for the given event type.
 *
 * If no preferences are configured for the event type,
 * in_app is enabled by default (per requirement 15.3).
 */
export async function getEnabledChannels(
  userId: string,
  eventType: string
): Promise<NotificationChannel[]> {
  const result = await publicQuery<{ channel: NotificationChannel }>(
    `SELECT channel
     FROM notification_preferences
     WHERE user_id = $1 AND event_type = $2 AND enabled = true`,
    [userId, eventType]
  );

  if (result.rows.length === 0) {
    // Default: in_app enabled for all event types (requirement 15.3)
    return ['in_app'];
  }

  // Return in priority order
  const enabledSet = new Set(result.rows.map((r) => r.channel));
  return CHANNEL_PRIORITY.filter((ch) => enabledSet.has(ch));
}

/**
 * Get the user's configured digest time for a specific event type and channel.
 *
 * Returns the configured time in HH:mm format, or the default (08:00).
 */
export async function getDigestTime(
  userId: string,
  eventType: string,
  channel: NotificationChannel
): Promise<string> {
  const result = await publicQuery<{ digest_time: string | null }>(
    `SELECT digest_time
     FROM notification_preferences
     WHERE user_id = $1 AND event_type = $2 AND channel = $3`,
    [userId, eventType, channel]
  );

  return result.rows[0]?.digest_time || DEFAULT_DIGEST_TIME;
}

/**
 * Upsert a notification preference for a user.
 *
 * Creates or updates the preference for a specific user + event type + channel.
 */
export async function upsertPreference(
  userId: string,
  eventType: string,
  channel: NotificationChannel,
  enabled: boolean,
  digestTime?: string
): Promise<void> {
  await publicQuery(
    `INSERT INTO notification_preferences (user_id, channel, event_type, enabled, digest_time)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, channel, event_type)
     DO UPDATE SET enabled = EXCLUDED.enabled, digest_time = EXCLUDED.digest_time`,
    [userId, channel, eventType, enabled, digestTime || DEFAULT_DIGEST_TIME]
  );
}

/**
 * Get all channels (in priority order) for fallback delivery.
 *
 * Used when the primary channel fails — returns the next preferred
 * channels in order: in_app > email > whatsapp.
 */
export function getFallbackChannels(
  failedChannel: NotificationChannel,
  enabledChannels: NotificationChannel[]
): NotificationChannel[] {
  const failedIndex = CHANNEL_PRIORITY.indexOf(failedChannel);
  return CHANNEL_PRIORITY.filter(
    (ch, idx) => idx > failedIndex && enabledChannels.includes(ch)
  );
}
