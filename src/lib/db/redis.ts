/**
 * Redis client for production.
 * Connects to the Redis service defined in docker-compose.
 * Used for rate limiting, session caching, and tenant resolution.
 */

import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB ?? 0),
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | null {
    if (times > 10) return null;
    return Math.min(times * 200, 5000);
  },
  lazyConnect: true,
  enableOfflineQueue: true,
};

/**
 * Primary Redis client.
 */
export const redis = new Redis(redisConfig);

redis.on('error', (err) => {
  // Log once, don't crash the process
  if (process.env.NODE_ENV === 'production') {
    console.error('[Redis] Error:', err.message);
  }
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

/**
 * Creates a dedicated Redis client for pub/sub or stream consumers.
 */
export function createRedisClient(): Redis {
  const client = new Redis(redisConfig);
  client.on('error', (err) => {
    console.error('[Redis] Client error:', err.message);
  });
  return client;
}

/**
 * Gracefully close the primary Redis connection.
 */
export async function closeRedis(): Promise<void> {
  await redis.quit();
}
