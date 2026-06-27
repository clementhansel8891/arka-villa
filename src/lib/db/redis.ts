/**
 * Redis client setup.
 *
 * Provides a shared Redis client for sessions, caching,
 * and the event bus (Redis Streams).
 */

import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB ?? 0),
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | null {
    if (times > 10) {
      return null; // Stop retrying after 10 attempts
    }
    return Math.min(times * 200, 5000); // Exponential backoff up to 5s
  },
  lazyConnect: true,
};

/**
 * Primary Redis client for general operations (sessions, caching).
 */
export const redis = new Redis(redisConfig);

/**
 * Creates a dedicated Redis client for pub/sub or stream consumers.
 * Each consumer needs its own connection since subscribed connections
 * cannot execute other commands.
 */
export function createRedisClient(): Redis {
  return new Redis(redisConfig);
}

/**
 * Gracefully close the primary Redis connection.
 * Call during application shutdown.
 */
export async function closeRedis(): Promise<void> {
  await redis.quit();
}
