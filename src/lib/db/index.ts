/**
 * Database layer exports.
 *
 * Provides PostgreSQL connection pool, tenant-scoped query helpers,
 * Redis client setup, migration runner, and retention policy enforcement.
 */

export { pool, closePool } from './pool';
export { tenantQuery, publicQuery, getTenantSchemaName } from './tenant-query';
export { redis, createRedisClient, closeRedis } from './redis';
export { runMigrations, getMigrationStatus } from './migration-runner';
export {
  enforceRetentionPolicies,
  getRetentionPolicies,
  getRetentionPolicy,
  getRetentionMetrics,
  getCutoffDate,
  RETENTION_POLICIES,
} from './retention-policies';
export type { MigrationFile, MigrationResult, MigrationStatus } from './migration-runner';
export type { RetentionPolicy, RetentionResult, RetentionReport } from './retention-policies';
