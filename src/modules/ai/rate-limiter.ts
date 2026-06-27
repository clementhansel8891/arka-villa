/**
 * AI Chat Rate Limiter — per-user rate limiting using Redis.
 *
 * Enforces per-user message limits on AI_Chat_Interface requests:
 * - Employee, Guest: 30 messages per 15-minute window
 * - Agency_Admin, Villa_Owner: 60 messages per 15-minute window
 *
 * Uses Redis sorted sets with sliding window approach for accurate rate tracking.
 *
 * Requirements: 30.1, 30.2
 */

import { redis } from '@/lib/db';
import type { PlatformRole } from '@/lib/middleware/types';

// ─── Rate Limit Configuration ─────────────────────────────────────

/** Window size in seconds (15 minutes). */
const WINDOW_SECONDS = 15 * 60;

/** Rate limits by role. */
const RATE_LIMITS: Record<PlatformRole, number> = {
  Agency_Admin: 60,
  Villa_Owner: 60,
  Employee: 30,
  Guest: 30,
  Visitor: 0, // Visitors cannot use AI chat
};

/** Redis key prefix for rate limiting. */
const RATE_LIMIT_KEY_PREFIX = 'ai:rate_limit:';

/** Redis key prefix for suspension tracking. */
const SUSPENSION_KEY_PREFIX = 'ai:suspended:';

/** Suspension duration in seconds (1 hour). */
const SUSPENSION_DURATION_SECONDS = 60 * 60;

// ─── Types ────────────────────────────────────────────────────────

/** Result of a rate limit check. */
export interface AIRateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Messages remaining in the current window. */
  remaining: number;
  /** Total limit for the user's role. */
  limit: number;
  /** Seconds until the window resets (for Retry-After header). */
  retryAfter: number;
  /** Whether the user is currently suspended. */
  suspended: boolean;
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Check if a user is allowed to send an AI message based on their rate limit.
 * Uses a sliding window counter stored in a Redis sorted set.
 *
 * @param userId - The user's unique identifier
 * @param role - The user's platform role
 * @returns Rate limit result indicating whether the request is allowed
 */
export async function checkAIRateLimit(
  userId: string,
  role: PlatformRole
): Promise<AIRateLimitResult> {
  const limit = RATE_LIMITS[role];

  // Visitors cannot use AI chat at all
  if (limit === 0) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      retryAfter: 0,
      suspended: false,
    };
  }

  // Check if user is suspended
  const suspensionKey = `${SUSPENSION_KEY_PREFIX}${userId}`;
  const suspensionTTL = await redis.ttl(suspensionKey);
  if (suspensionTTL > 0) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      retryAfter: suspensionTTL,
      suspended: true,
    };
  }

  const now = Date.now();
  const windowStart = now - WINDOW_SECONDS * 1000;
  const key = `${RATE_LIMIT_KEY_PREFIX}${userId}`;

  // Use Redis pipeline for atomic operations:
  // 1. Remove entries outside the current window
  // 2. Count entries in the current window
  // 3. Add the current request (conditionally, below)
  // 4. Set TTL on the key
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zcard(key);

  const results = await pipeline.exec();
  if (!results) {
    // Redis unavailable — fail open (allow the request)
    return { allowed: true, remaining: limit - 1, limit, retryAfter: 0, suspended: false };
  }

  const currentCount = (results[1]?.[1] as number) ?? 0;

  if (currentCount >= limit) {
    // Calculate when the oldest entry will expire from the window
    const oldestEntries = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const oldestTimestamp = oldestEntries.length >= 2 ? Number(oldestEntries[1]) : now;
    const retryAfter = Math.ceil((oldestTimestamp + WINDOW_SECONDS * 1000 - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      limit,
      retryAfter: Math.max(retryAfter, 1),
      suspended: false,
    };
  }

  // Record this request in the sliding window
  await redis
    .pipeline()
    .zadd(key, now.toString(), `${now}:${Math.random().toString(36).slice(2, 8)}`)
    .expire(key, WINDOW_SECONDS)
    .exec();

  return {
    allowed: true,
    remaining: limit - currentCount - 1,
    limit,
    retryAfter: 0,
    suspended: false,
  };
}

/**
 * Suspend a user's AI access for the configured duration (1 hour).
 * Called after 5 consecutive sanitization rejections.
 *
 * @param userId - The user to suspend
 */
export async function suspendAIAccess(userId: string): Promise<void> {
  const suspensionKey = `${SUSPENSION_KEY_PREFIX}${userId}`;
  await redis.setex(suspensionKey, SUSPENSION_DURATION_SECONDS, '1');
}

/**
 * Check if a user is currently suspended from AI access.
 *
 * @param userId - The user to check
 * @returns Whether the user is suspended and remaining seconds
 */
export async function isAISuspended(userId: string): Promise<{ suspended: boolean; remainingSeconds: number }> {
  const suspensionKey = `${SUSPENSION_KEY_PREFIX}${userId}`;
  const ttl = await redis.ttl(suspensionKey);
  return {
    suspended: ttl > 0,
    remainingSeconds: Math.max(ttl, 0),
  };
}

/**
 * Get the rate limit configuration for a given role.
 *
 * @param role - The platform role
 * @returns The max messages and window in seconds
 */
export function getRateLimitConfig(role: PlatformRole): { maxMessages: number; windowSeconds: number } {
  return {
    maxMessages: RATE_LIMITS[role],
    windowSeconds: WINDOW_SECONDS,
  };
}
