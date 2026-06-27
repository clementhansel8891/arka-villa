/**
 * In-App notification channel with WebSocket delivery.
 *
 * Stores notifications in the database and publishes to
 * Redis pub/sub for real-time WebSocket push to connected clients.
 */

import { redis } from '@/lib/db';
import { publicQuery } from '@/lib/db';
import type {
  ChannelAdapter,
  ChannelDeliveryResult,
  NotificationPayload,
} from '../types';

/** Redis pub/sub channel prefix for user notifications. */
const WS_CHANNEL_PREFIX = 'ws:notifications:';

/**
 * In-app notification channel adapter.
 *
 * Persists the notification to the database and publishes
 * a real-time event via Redis pub/sub for WebSocket delivery.
 */
export class InAppChannel implements ChannelAdapter {
  readonly channel = 'in_app' as const;

  async deliver(notification: NotificationPayload): Promise<ChannelDeliveryResult> {
    try {
      // Persist the notification record
      const result = await publicQuery<{ id: string }>(
        `INSERT INTO notifications (user_id, tenant_id, channel, priority, event_type, title, body, metadata, read, delivered_at, created_at)
         VALUES ($1, $2, 'in_app', $3, $4, $5, $6, $7, false, NOW(), NOW())
         RETURNING id`,
        [
          notification.userId,
          notification.tenantId,
          notification.priority,
          notification.eventType,
          notification.title,
          notification.body,
          JSON.stringify(notification.metadata ?? {}),
        ]
      );

      const notificationId = result.rows[0]?.id;
      if (!notificationId) {
        return { success: false, error: 'Failed to persist notification' };
      }

      // Publish to Redis pub/sub for real-time WebSocket delivery
      const wsPayload = JSON.stringify({
        id: notificationId,
        type: 'notification',
        channel: 'in_app',
        eventType: notification.eventType,
        priority: notification.priority,
        title: notification.title,
        body: notification.body,
        metadata: notification.metadata,
        createdAt: new Date().toISOString(),
      });

      await redis.publish(
        `${WS_CHANNEL_PREFIX}${notification.userId}`,
        wsPayload
      );

      return { success: true, messageId: notificationId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `In-app delivery failed: ${message}` };
    }
  }
}

/**
 * Subscribe to real-time notifications for a user via Redis pub/sub.
 *
 * Used by WebSocket connection handlers to receive notifications
 * in real-time and push them to connected clients.
 *
 * @param userId - The user ID to subscribe to
 * @param onMessage - Callback invoked when a notification is received
 * @returns An unsubscribe function
 */
export async function subscribeToUserNotifications(
  userId: string,
  onMessage: (payload: string) => void
): Promise<() => Promise<void>> {
  const { createRedisClient } = await import('@/lib/db');
  const subscriber = createRedisClient();

  const channel = `${WS_CHANNEL_PREFIX}${userId}`;

  subscriber.on('message', (_ch: string, message: string) => {
    onMessage(message);
  });

  await subscriber.subscribe(channel);

  return async () => {
    await subscriber.unsubscribe(channel);
    await subscriber.quit();
  };
}

export const inAppChannel = new InAppChannel();
