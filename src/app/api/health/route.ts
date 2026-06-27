/**
 * GET /api/health
 *
 * Platform health check endpoint.
 * Returns status of the Next.js application and its dependent services
 * (PostgreSQL, Redis, MinIO). Used by the deployment pipeline for
 * zero-downtime rolling updates and automated rollback detection.
 *
 * Requirements: 38.3, 38.4 (health checks with auto-rollback)
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import Redis from 'ioredis';

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  message?: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  services: Record<string, ServiceHealth>;
}

const startTime = Date.now();

/**
 * Check PostgreSQL connectivity using the pg library
 */
async function checkPostgres(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3000,
      max: 1,
    });
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    await pool.end();
    return { status: 'healthy', latency: Date.now() - start };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    return { status: 'healthy', latency: Date.now() - start };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Check MinIO connectivity
 */
async function checkMinio(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const endpoint = process.env.MINIO_ENDPOINT || 'minio';
    const port = process.env.MINIO_PORT || '9000';
    const url = `http://${endpoint}:${port}/minio/health/live`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (response.ok) {
      return { status: 'healthy', latency: Date.now() - start };
    }
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message: `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [postgres, redis, minio] = await Promise.allSettled([
    checkPostgres(),
    checkRedis(),
    checkMinio(),
  ]);

  const services: Record<string, ServiceHealth> = {
    postgres:
      postgres.status === 'fulfilled'
        ? postgres.value
        : { status: 'unhealthy', message: 'Check failed' },
    redis:
      redis.status === 'fulfilled'
        ? redis.value
        : { status: 'unhealthy', message: 'Check failed' },
    minio:
      minio.status === 'fulfilled'
        ? minio.value
        : { status: 'unhealthy', message: 'Check failed' },
  };

  // Critical services: postgres and redis must be healthy
  const criticalHealthy =
    services.postgres.status === 'healthy' &&
    services.redis.status === 'healthy';

  // Non-critical services being unhealthy results in degraded status
  const allHealthy = Object.values(services).every(
    (s) => s.status === 'healthy'
  );

  let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  if (!criticalHealthy) {
    overallStatus = 'unhealthy';
  } else if (!allHealthy) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services,
  };

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, { status: statusCode });
}
