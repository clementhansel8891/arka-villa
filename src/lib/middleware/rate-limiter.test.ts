/**
 * Tests for rate limiting token bucket logic.
 */

import { describe, it, expect } from 'vitest';
import {
  getRateLimitConfig,
  getRateLimitKey,
  checkRateLimit,
  RATE_LIMITS,
} from './rate-limiter';

describe('getRateLimitConfig', () => {
  it('returns STANDARD_USER for authenticated standard API requests', () => {
    expect(getRateLimitConfig('/api/v1/bookings', true)).toEqual(RATE_LIMITS.STANDARD_USER);
    expect(getRateLimitConfig('/api/v1/staff/tasks', true)).toEqual(RATE_LIMITS.STANDARD_USER);
  });

  it('returns INTENSIVE_USER for resource-intensive endpoints', () => {
    expect(getRateLimitConfig('/api/v1/financial/reports', true)).toEqual(RATE_LIMITS.INTENSIVE_USER);
    expect(getRateLimitConfig('/api/v1/ai/chat', true)).toEqual(RATE_LIMITS.INTENSIVE_USER);
    expect(getRateLimitConfig('/api/v1/cctv/stream/123', true)).toEqual(RATE_LIMITS.INTENSIVE_USER);
    expect(getRateLimitConfig('/api/v1/marketing/metrics', true)).toEqual(RATE_LIMITS.INTENSIVE_USER);
  });

  it('returns PUBLIC_IP for unauthenticated public pages', () => {
    expect(getRateLimitConfig('/web/dashboard', false)).toEqual(RATE_LIMITS.PUBLIC_IP);
    expect(getRateLimitConfig('/villas/sunset', false)).toEqual(RATE_LIMITS.PUBLIC_IP);
  });

  it('returns AUTH_IP for unauthenticated auth endpoints', () => {
    expect(getRateLimitConfig('/api/v1/auth/login', false)).toEqual(RATE_LIMITS.AUTH_IP);
    expect(getRateLimitConfig('/api/v1/auth/mfa/verify', false)).toEqual(RATE_LIMITS.AUTH_IP);
  });
});

describe('getRateLimitKey', () => {
  it('creates correct key for IP-based limiting', () => {
    expect(getRateLimitKey('192.168.1.1', 'ip')).toBe('rl:ip:192.168.1.1');
  });

  it('creates correct key for user-based limiting', () => {
    expect(getRateLimitKey('user-uuid-123', 'user')).toBe('rl:user:user-uuid-123');
  });
});

describe('checkRateLimit', () => {
  it('allows request when Redis eval returns allowed=1', async () => {
    const mockRedis = {
      eval: async () => [1, 99, 0] as [number, number, number],
    };

    const result = await checkRateLimit(mockRedis, 'rl:ip:1.2.3.4', RATE_LIMITS.PUBLIC_IP);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(99);
    expect(result.limit).toBe(60);
    expect(result.retryAfter).toBe(0);
  });

  it('denies request when Redis eval returns allowed=0', async () => {
    const mockRedis = {
      eval: async () => [0, 0, 5000] as [number, number, number],
    };

    const result = await checkRateLimit(mockRedis, 'rl:ip:1.2.3.4', RATE_LIMITS.AUTH_IP);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.limit).toBe(10);
    expect(result.retryAfter).toBe(5);
  });

  it('fails open when Redis is unavailable', async () => {
    const mockRedis = {
      eval: async () => { throw new Error('Connection refused'); },
    };

    const result = await checkRateLimit(mockRedis, 'rl:ip:1.2.3.4', RATE_LIMITS.PUBLIC_IP);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(60);
  });

  it('uses correct limit based on config', async () => {
    const mockRedis = {
      eval: async () => [1, 29, 0] as [number, number, number],
    };

    const result = await checkRateLimit(mockRedis, 'rl:user:abc', RATE_LIMITS.INTENSIVE_USER);
    expect(result.limit).toBe(30);
    expect(result.remaining).toBe(29);
  });
});
