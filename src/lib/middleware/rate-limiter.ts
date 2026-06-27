/**
 * Token-bucket rate limiter backed by Redis.
 *
 * Implements per-IP and per-user rate limiting using atomic
 * Redis operations (Lua script) for the token bucket algorithm.
 *
 * Rate limits (from Requirement 34.1, 34.2):
 * - Authenticated users: 100 req/min standard, 30 req/min resource-intensive
 * - Unauthenticated IPs: 60 req/min public, 10 req/min auth endpoints
 */

import type { RateLimitConfig, RateLimitResult } from './types';

/**
 * Predefined rate limit tiers per Requirement 34.1 and 34.2.
 */
export const RATE_LIMITS = {
  /** Standard API endpoints for authenticated users */
  STANDARD_USER: { maxRequests: 100, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Resource-intensive endpoints (reports, uploads, AI) for authenticated users */
  INTENSIVE_USER: { maxRequests: 30, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Public pages for unauthenticated visitors */
  PUBLIC_IP: { maxRequests: 60, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Authentication endpoints for unauthenticated IPs */
  AUTH_IP: { maxRequests: 10, windowSeconds: 60 } satisfies RateLimitConfig,
} as const;

/**
 * Lua script for atomic token bucket rate limiting.
 *
 * KEYS[1] = rate limit key (e.g., "rl:ip:1.2.3.4" or "rl:user:uuid")
 * ARGV[1] = max tokens (bucket capacity)
 * ARGV[2] = refill rate (tokens per second)
 * ARGV[3] = current timestamp in milliseconds
 *
 * Returns: [allowed (0 or 1), remaining tokens, retry-after in ms]
 */
export const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local max_tokens = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

if tokens == nil then
  tokens = max_tokens
  last_refill = now
end

-- Calculate tokens to add based on elapsed time
local elapsed = (now - last_refill) / 1000
local new_tokens = elapsed * refill_rate
tokens = math.min(max_tokens, tokens + new_tokens)
last_refill = now

-- Try to consume a token
local allowed = 0
local retry_after = 0

if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
else
  -- Calculate how long until a token is available
  retry_after = math.ceil((1 - tokens) / refill_rate * 1000)
end

-- Store updated state
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
redis.call('EXPIRE', key, ARGV[2] == '0' and 60 or math.ceil(max_tokens / refill_rate) + 10)

return {allowed, math.floor(tokens), retry_after}
`;

/**
 * Determines which rate limit config applies to a request.
 */
export function getRateLimitConfig(
  pathname: string,
  isAuthenticated: boolean
): RateLimitConfig {
  if (isAuthenticated) {
    if (isResourceIntensivePath(pathname)) {
      return RATE_LIMITS.INTENSIVE_USER;
    }
    return RATE_LIMITS.STANDARD_USER;
  }

  if (isAuthEndpoint(pathname)) {
    return RATE_LIMITS.AUTH_IP;
  }
  return RATE_LIMITS.PUBLIC_IP;
}

/**
 * Builds the Redis key for rate limiting.
 */
export function getRateLimitKey(
  identifier: string,
  type: 'ip' | 'user'
): string {
  return `rl:${type}:${identifier}`;
}

/**
 * Checks rate limit using the token bucket algorithm.
 * Returns result synchronously from Redis script execution.
 *
 * @param redis - Redis client instance (ioredis)
 * @param key - Rate limit key
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis: { eval: (...args: any[]) => Promise<unknown> },
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const refillRate = config.maxRequests / config.windowSeconds;
  const now = Date.now();

  try {
    const result = (await redis.eval(
      TOKEN_BUCKET_SCRIPT,
      1,
      key,
      config.maxRequests,
      refillRate,
      now
    )) as [number, number, number];

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      limit: config.maxRequests,
      retryAfter: Math.ceil(result[2] / 1000),
    };
  } catch {
    // If Redis is unavailable, fail open (allow the request)
    return {
      allowed: true,
      remaining: config.maxRequests,
      limit: config.maxRequests,
      retryAfter: 0,
    };
  }
}

/**
 * Checks if the path is a resource-intensive endpoint.
 */
function isResourceIntensivePath(pathname: string): boolean {
  const intensivePatterns = [
    '/api/v1/financial/reports',
    '/api/v1/ai/',
    '/api/v1/cctv/',
    '/api/v1/marketing/metrics',
  ];
  return intensivePatterns.some((pattern) => pathname.startsWith(pattern));
}

/**
 * Checks if the path is an authentication endpoint.
 */
function isAuthEndpoint(pathname: string): boolean {
  return pathname.startsWith('/api/v1/auth/');
}
