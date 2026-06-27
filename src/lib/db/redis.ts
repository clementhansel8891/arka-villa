/**
 * Redis client setup.
 *
 * Provides a shared Redis client for sessions, caching,
 * and the event bus (Redis Streams).
 *
 * In demo/standalone mode (no Redis available), the client
 * fails silently and all operations are no-ops.
 */

import Redis from 'ioredis';

const REDIS_ENABLED = process.env.REDIS_HOST || process.env.REDIS_URL;

const redisConfig = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB ?? 0),
  maxRetriesPerRequest: 1,
  retryStrategy(times: number): number | null {
    // In demo mode, stop retrying immediately
    if (!REDIS_ENABLED) return null;
    if (times > 3) return null;
    return Math.min(times * 500, 3000);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
};

/**
 * Primary Redis client for general operations (sessions, caching).
 * Suppresses connection errors in demo mode.
 */
export const redis = new Redis(redisConfig);

// Suppress unhandled error events (prevents crash when Redis is unavailable)
redis.on('error', (err) => {
  if (!REDIS_ENABLED) return; // Silent in demo mode
  console.warn('[Redis] Connection error (non-fatal):', err.message);
});

/**
 * Creates a dedicated Redis client for pub/sub or stream consumers.
 */
export function createRedisClient(): Redis {
  const client = new Redis(redisConfig);
  client.on('error', () => {}); // Suppress errors
  return client;
}

/**
 * Gracefully close the primary Redis connection.
 */
export async function closeRedis(): Promise<void> {
  try {
    await redis.quit();
  } catch {
    // Already disconnected
  }
}
