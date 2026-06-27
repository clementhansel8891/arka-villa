/**
 * PostgreSQL connection pool setup.
 *
 * Uses the `pg` library to create a shared connection pool.
 * Connection parameters are loaded from environment variables.
 */

import { Pool, type PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB ?? 'arka_villa',
  user: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? '',
  max: Number(process.env.POSTGRES_POOL_MAX ?? 20),
  idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT ?? 30000),
  connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECT_TIMEOUT ?? 5000),
};

/**
 * Shared PostgreSQL connection pool.
 * Lazily initialized on first import.
 */
export const pool = new Pool(poolConfig);

/**
 * Gracefully shut down the connection pool.
 * Call during application shutdown.
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
