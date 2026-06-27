/**
 * Tenant-scoped query helper.
 *
 * Executes queries within a specific tenant's PostgreSQL schema
 * by setting the search_path before running the query.
 * This ensures each tenant's data is isolated at the database level.
 */

import type { QueryResult, QueryResultRow } from 'pg';
import { pool } from './pool';

/**
 * Validates a tenant schema name to prevent SQL injection.
 * Schema names must be alphanumeric with underscores only.
 */
function validateSchemaName(schemaName: string): boolean {
  return /^[a-z][a-z0-9_]{0,62}$/.test(schemaName);
}

/**
 * Derives the PostgreSQL schema name for a given tenant ID.
 * Convention: `tenant_<tenantId>` with dashes replaced by underscores.
 */
export function getTenantSchemaName(tenantId: string): string {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
}

/**
 * Executes a SQL query scoped to a specific tenant's schema.
 *
 * Acquires a client from the pool, sets the search_path to
 * the tenant's schema (with public as fallback), executes
 * the query, then releases the client.
 *
 * @param tenantId - The tenant's unique identifier
 * @param text - SQL query text (use $1, $2... for parameters)
 * @param params - Query parameters (prevents SQL injection)
 * @returns Query result
 * @throws Error if tenant schema name is invalid
 */
export async function tenantQuery<T extends QueryResultRow = QueryResultRow>(
  tenantId: string,
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const schemaName = getTenantSchemaName(tenantId);

  if (!validateSchemaName(schemaName)) {
    throw new Error(`Invalid tenant schema name: ${schemaName}`);
  }

  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${schemaName}, public`);
    const result = await client.query<T>(text, params);
    return result;
  } finally {
    // Reset search_path before returning client to pool
    await client.query('SET search_path TO public').catch(() => {
      // Swallow errors during cleanup — client will be discarded
    });
    client.release();
  }
}

/**
 * Executes a query against the public schema (shared tables).
 *
 * Used for cross-tenant operations like user lookups, tenant registry,
 * and audit logs.
 *
 * @param text - SQL query text
 * @param params - Query parameters
 * @returns Query result
 */
export async function publicQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
