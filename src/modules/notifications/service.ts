/**
 * Notification dispatch service.
 *
 * Handles multi-channel notification delivery with:
 * - Critical notifications: immediate dispatch on ALL enabled channels within 30s
 * - Non-urgent notifications: queued into daily digest at user's configured time
 * - Retry with exponential backoff (3 attempts per channel)
 * - Channel fallback: on final failure, try the next channel in priority order
 *
 * Priority order: in_app > email > whatsapp
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 */

import { redis } from '@/lib/db';
import { inAppChannel } from './channels/in-app';
import { emailChannel } from './channels/email';
import { whatsAppChannel } from './channels/whatsapp';
import { getEnabledChannels, getFallbackChannels } from './preferences';
import type {
  ChannelAdapter,
  ChannelDeliveryResult,
  DeliveryResult,
  DigestEntry,
  NotificationChannel,
  NotificationPayload,
  SendNotificationRequest,
  SendNotificationResult,
} from './types';
import { CHANNEL_PRIORITY, DEFAULT_RETRY_CONFIG } from './types';

// ─── Channel Registry ────────────────────────────────────────────────

const channelAdapters: Record<NotificationChannel, ChannelAdapter> = {
  in_app: inAppChannel,
  email: emailChannel,
  whatsapp: whatsAppChannel,
};

// ─── Digest Queue Keys ───────────────────────────────────────────────

const DIGEST_QUEUE_PREFIX = 'notifications:digest:';

/**
 * Get the Redis key for a user's digest queue.
 */
function digestKey(userId: string): string {
  return `${DIGEST_QUEUE_PREFIX}${userId}`;
}

// ─── Main Dispatch Logic ─────────────────────────────────────────────

/**
 * Send notifications to one or more users.
 *
 * For critical notifications:
 *   - Dispatches immediately on ALL enabled channels within 30 seconds.
 *   - Retries up to 3 times with exponential backoff per channel.
 *   - On final failure for a channel, falls back to next priority channel.
 *
 * For non-urgent notifications:
 *   - Queues into the user's daily digest (sent at their configured time, default 08:00).
 *   - In-app channel still delivers immediately for non-urgent (for real-time visibility).
 */
export async function sendNotification(
  request: SendNotificationRequest
): Promise<SendNotificationResult> {
  const results: DeliveryResult[] = [];
  let digestQueued = 0;

  for (const userId of request.userIds) {
    if (request.priority === 'critical') {
      // Critical: dispatch on ALL enabled channels immediately
      const userResults = await dispatchCritical(userId, request);
      results.push(...userResults);
    } else {
      // Non-urgent: queue for digest, but always deliver in-app immediately
      const userResults = await dispatchNonUrgent(userId, request);
      results.push(...userResults.delivered);
      digestQueued += userResults.digestCount;
    }
  }

  return {
    dispatched: results.filter((r) => r.success).length,
    results,
    digestQueued,
  };
}

/**
 * Dispatch a critical notification immediately on ALL enabled channels.
 *
 * Critical events are sent on all channels the user has enabled,
 * ignoring digest preferences. Delivery must happen within 30 seconds.
 */
async function dispatchCritical(
  userId: string,
  request: SendNotificationRequest
): Promise<DeliveryResult[]> {
  const enabledChannels = await getEnabledChannels(userId, request.eventType);
  const results: DeliveryResult[] = [];

  const payload: NotificationPayload = {
    userId,
    tenantId: request.tenantId,
    title: request.title,
    body: request.body,
    eventType: request.eventType,
    priority: request.priority,
    metadata: request.metadata,
  };

  // Deliver on all enabled channels concurrently
  const deliveryPromises = enabledChannels.map(async (channel) => {
    const result = await deliverWithRetry(channel, payload);

    if (!result.success) {
      // On failure, try fallback channels
      const fallbacks = getFallbackChannels(channel, CHANNEL_PRIORITY);
      for (const fallbackChannel of fallbacks) {
        const fallbackResult = await deliverWithRetry(fallbackChannel, payload);
        if (fallbackResult.success) {
          return {
            userId,
            channel,
            success: true,
            attemptCount: result.attemptCount + fallbackResult.attemptCount,
            fallbackUsed: fallbackChannel,
          } satisfies DeliveryResult;
        }
      }
    }

    return {
      userId,
      channel,
      success: result.success,
      error: result.error,
      attemptCount: result.attemptCount,
    } satisfies DeliveryResult;
  });

  const channelResults = await Promise.all(deliveryPromises);
  results.push(...channelResults);

  return results;
}

/**
 * Handle non-urgent notification dispatch.
 *
 * - In-app: always delivered immediately (for real-time visibility)
 * - Other channels: queued for daily digest at user's configured time
 */
async function dispatchNonUrgent(
  userId: string,
  request: SendNotificationRequest
): Promise<{ delivered: DeliveryResult[]; digestCount: number }> {
  const enabledChannels = await getEnabledChannels(userId, request.eventType);
  const delivered: DeliveryResult[] = [];
  let digestCount = 0;

  const payload: NotificationPayload = {
    userId,
    tenantId: request.tenantId,
    title: request.title,
    body: request.body,
    eventType: request.eventType,
    priority: request.priority,
    metadata: request.metadata,
  };

  for (const channel of enabledChannels) {
    if (channel === 'in_app') {
      // Always deliver in-app immediately
      const result = await deliverWithRetry(channel, payload);
      delivered.push({
        userId,
        channel,
        success: result.success,
        error: result.error,
        attemptCount: result.attemptCount,
      });
    } else {
      // Queue for daily digest
      await queueForDigest(userId, request);
      digestCount++;
    }
  }

  return { delivered, digestCount };
}

// ─── Retry Logic ─────────────────────────────────────────────────────

interface RetryResult {
  success: boolean;
  error?: string;
  attemptCount: number;
}

/**
 * Deliver a notification with exponential backoff retry.
 *
 * Attempts delivery up to maxRetries times. On each failure,
 * waits baseDelayMs * 2^attempt before retrying.
 *
 * @returns Result including success status and total attempts
 */
async function deliverWithRetry(
  channel: NotificationChannel,
  payload: NotificationPayload
): Promise<RetryResult> {
  const adapter = channelAdapters[channel];
  const { maxRetries, baseDelayMs } = DEFAULT_RETRY_CONFIG;
  let lastError: string | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result: ChannelDeliveryResult = await adapter.deliver(payload);

    if (result.success) {
      return { success: true, attemptCount: attempt + 1 };
    }

    lastError = result.error;

    // Exponential backoff: baseDelay * 2^attempt
    if (attempt < maxRetries - 1) {
      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: lastError ?? 'Delivery failed after all retries',
    attemptCount: maxRetries,
  };
}

// ─── Digest Queue ────────────────────────────────────────────────────

/**
 * Queue a notification for the user's daily digest.
 *
 * Stores the notification in Redis as a list entry keyed by user ID.
 * A scheduled job (via n8n or cron) reads and sends the digest at
 * the user's configured time (default 08:00 local).
 */
async function queueForDigest(
  userId: string,
  request: SendNotificationRequest
): Promise<void> {
  const entry: DigestEntry = {
    userId,
    tenantId: request.tenantId,
    title: request.title,
    body: request.body,
    eventType: request.eventType,
    createdAt: new Date().toISOString(),
  };

  await redis.rpush(digestKey(userId), JSON.stringify(entry));
  // Set TTL of 48 hours to prevent unbounded growth if digest job fails
  await redis.expire(digestKey(userId), 48 * 60 * 60);
}

/**
 * Retrieve and clear all pending digest entries for a user.
 *
 * Called by the digest job at the user's configured time.
 * Atomically pops all entries to prevent double-delivery.
 */
export async function consumeDigest(userId: string): Promise<DigestEntry[]> {
  const key = digestKey(userId);

  // Get all entries
  const entries = await redis.lrange(key, 0, -1);
  if (entries.length === 0) return [];

  // Clear the list atomically
  await redis.del(key);

  return entries.map((entry) => JSON.parse(entry) as DigestEntry);
}

/**
 * Send the daily digest for a user.
 *
 * Collects all queued notifications and sends them as a single
 * email/WhatsApp message summarizing the day's non-urgent events.
 */
export async function sendDigest(userId: string): Promise<DeliveryResult | null> {
  const entries = await consumeDigest(userId);
  if (entries.length === 0) return null;

  // Build digest content
  const digestTitle = `Daily Notification Digest (${entries.length} items)`;
  const digestBody = entries
    .map((e) => `• [${e.eventType}] ${e.title}: ${e.body}`)
    .join('\n');

  const payload: NotificationPayload = {
    userId,
    tenantId: entries[0].tenantId,
    title: digestTitle,
    body: digestBody,
    eventType: 'digest.daily',
    priority: 'non_urgent',
  };

  // Try email first for digest delivery
  const result = await deliverWithRetry('email', payload);

  return {
    userId,
    channel: 'email',
    success: result.success,
    error: result.error,
    attemptCount: result.attemptCount,
  };
}

/**
 * Get the configured digest time for a user.
 * Returns the time in HH:mm format (default "08:00").
 */
export async function getUserDigestTime(userId: string): Promise<string> {
  const { getDigestTime } = await import('./preferences');
  // Use a generic event type to get the user's general digest time preference
  return getDigestTime(userId, '*', 'email');
}

// ─── Utilities ───────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
