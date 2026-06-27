/**
 * Tenant repository — database queries for the tenant registry.
 *
 * Operates on the `public.tenants` table for CRUD operations.
 * Schema provisioning uses raw client connections to execute DDL.
 */

import { pool } from '@/lib/db/pool';
import { publicQuery } from '@/lib/db/tenant-query';
import type { Tenant, TenantStatus } from './types';

/**
 * Row shape from the public.tenants table.
 */
interface TenantRow {
  id: string;
  name: string;
  slug: string;
  schema_name: string;
  status: TenantStatus;
  created_at: Date;
  updated_at: Date;
}

/**
 * Maps a database row to the Tenant domain object.
 */
function rowToTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    schemaName: row.schema_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Creates a new tenant record in the public.tenants table.
 */
export async function createTenant(
  name: string,
  slug: string,
  schemaName: string
): Promise<Tenant> {
  const result = await publicQuery<TenantRow>(
    `INSERT INTO tenants (name, slug, schema_name, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING *`,
    [name, slug, schemaName]
  );
  return rowToTenant(result.rows[0]);
}

/**
 * Retrieves a tenant by its UUID.
 */
export async function getTenantById(id: string): Promise<Tenant | null> {
  const result = await publicQuery<TenantRow>(
    'SELECT * FROM tenants WHERE id = $1',
    [id]
  );
  return result.rows[0] ? rowToTenant(result.rows[0]) : null;
}

/**
 * Retrieves a tenant by its slug.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const result = await publicQuery<TenantRow>(
    'SELECT * FROM tenants WHERE slug = $1',
    [slug]
  );
  return result.rows[0] ? rowToTenant(result.rows[0]) : null;
}

/**
 * Lists all tenants, optionally filtered by status.
 */
export async function listTenants(status?: TenantStatus): Promise<Tenant[]> {
  if (status) {
    const result = await publicQuery<TenantRow>(
      'SELECT * FROM tenants WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    return result.rows.map(rowToTenant);
  }
  const result = await publicQuery<TenantRow>(
    'SELECT * FROM tenants ORDER BY created_at DESC'
  );
  return result.rows.map(rowToTenant);
}

/**
 * Updates a tenant's name and/or status.
 */
export async function updateTenant(
  id: string,
  updates: { name?: string; status?: TenantStatus }
): Promise<Tenant | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex}`);
    params.push(updates.name);
    paramIndex++;
  }

  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex}`);
    params.push(updates.status);
    paramIndex++;
  }

  if (setClauses.length === 0) {
    return getTenantById(id);
  }

  setClauses.push(`updated_at = NOW()`);
  params.push(id);

  const result = await publicQuery<TenantRow>(
    `UPDATE tenants SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );
  return result.rows[0] ? rowToTenant(result.rows[0]) : null;
}

/**
 * Provisions a dedicated PostgreSQL schema for a tenant.
 * Executes the schema SQL in a single transaction.
 *
 * @param schemaSQL - The complete DDL string for the schema
 * @returns Duration of the provisioning in milliseconds
 */
export async function provisionSchema(schemaSQL: string): Promise<number> {
  const start = Date.now();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schemaSQL);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return Date.now() - start;
}

/**
 * Checks whether a schema already exists in the database.
 */
export async function schemaExists(schemaName: string): Promise<boolean> {
  const result = await publicQuery<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.schemata WHERE schema_name = $1
     ) AS exists`,
    [schemaName]
  );
  return result.rows[0]?.exists ?? false;
}

/**
 * Checks whether a slug is already taken by another tenant.
 */
export async function slugExists(slug: string): Promise<boolean> {
  const result = await publicQuery<{ exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM tenants WHERE slug = $1) AS exists',
    [slug]
  );
  return result.rows[0]?.exists ?? false;
}

/**
 * Logs a cross-tenant access violation to the audit_logs table.
 */
export async function logCrossTenantViolation(
  userId: string,
  targetTenantId: string,
  action: string,
  ipAddress?: string
): Promise<void> {
  await publicQuery(
    `INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, tenant_id, outcome, ip_address)
     VALUES ($1, 'cross_tenant_access', 'tenant', $2, $3, 'denied', $4)`,
    [userId, targetTenantId, targetTenantId, ipAddress ?? null]
  );
}

/**
 * Retrieves all active session keys for a tenant from Redis.
 * This is used during deactivation to identify sessions to revoke.
 *
 * Note: Actual Redis operations are in the service layer. This function
 * queries the database for user IDs associated with the tenant.
 */
export async function getTenantUserIds(tenantId: string): Promise<string[]> {
  const result = await publicQuery<{ user_id: string }>(
    'SELECT DISTINCT user_id FROM user_tenant_roles WHERE tenant_id = $1',
    [tenantId]
  );
  return result.rows.map((r) => r.user_id);
}
