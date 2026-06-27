/**
 * Tests for GET /api/health endpoint
 *
 * Verifies that the health check endpoint correctly reports
 * service status and responds with appropriate HTTP codes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock implementations that can be controlled per-test
let mockPoolConnect: ReturnType<typeof vi.fn<() => Promise<{ release: () => void }>>>;
let mockPoolEnd: ReturnType<typeof vi.fn<() => Promise<void>>>;
let mockRedisConnect: ReturnType<typeof vi.fn<() => Promise<void>>>;
let mockRedisPing: ReturnType<typeof vi.fn<() => Promise<string>>>;
let mockRedisQuit: ReturnType<typeof vi.fn<() => Promise<void>>>;

vi.mock('pg', () => {
  return {
    Pool: class MockPool {
      connect() { return mockPoolConnect(); }
      end() { return mockPoolEnd(); }
    },
  };
});

vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      constructor() {}
      connect() { return mockRedisConnect(); }
      ping() { return mockRedisPing(); }
      quit() { return mockRedisQuit(); }
    },
  };
});

// Mock global fetch for MinIO health check
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.MINIO_ENDPOINT = 'localhost';
    process.env.MINIO_PORT = '9000';

    // Reset to healthy defaults
    mockPoolConnect = vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
      release: vi.fn(),
    });
    mockPoolEnd = vi.fn().mockResolvedValue(undefined);
    mockRedisConnect = vi.fn().mockResolvedValue(undefined);
    mockRedisPing = vi.fn().mockResolvedValue('PONG');
    mockRedisQuit = vi.fn().mockResolvedValue(undefined);
    mockFetch.mockResolvedValue({ ok: true });
  });

  it('returns 200 with healthy status when all services are up', async () => {
    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.services.postgres.status).toBe('healthy');
    expect(body.services.redis.status).toBe('healthy');
    expect(body.services.minio.status).toBe('healthy');
    expect(body.timestamp).toBeDefined();
    expect(body.uptime).toBeTypeOf('number');
    expect(body.version).toBeDefined();
  });

  it('returns 503 when a critical service (postgres) is unhealthy', async () => {
    mockPoolConnect = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('unhealthy');
    expect(body.services.postgres.status).toBe('unhealthy');
    expect(body.services.postgres.message).toContain('Connection refused');
  });

  it('returns 503 when Redis is unhealthy', async () => {
    mockRedisConnect = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('unhealthy');
    expect(body.services.redis.status).toBe('unhealthy');
    expect(body.services.redis.message).toContain('ECONNREFUSED');
  });

  it('returns 200 with degraded status when non-critical service (minio) is down', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503 });

    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('degraded');
    expect(body.services.minio.status).toBe('unhealthy');
    expect(body.services.postgres.status).toBe('healthy');
    expect(body.services.redis.status).toBe('healthy');
  });

  it('includes service latency measurements', async () => {
    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(body.services.postgres.latency).toBeTypeOf('number');
    expect(body.services.redis.latency).toBeTypeOf('number');
    expect(body.services.minio.latency).toBeTypeOf('number');
  });

  it('returns version and uptime in response', async () => {
    const { GET } = await import('./route');
    const response = await GET();
    const body = await response.json();

    expect(body.version).toEqual(expect.any(String));
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
