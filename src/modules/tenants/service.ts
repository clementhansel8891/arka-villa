/**
 * Tenant management service — business logic layer.
 *
 * Handles tenant creation (with schema provisioning), updates,
 * deactivation (with session revocation), and cross-tenant access control.
 */

import { redis } from '@/lib/db/redis';
import { cacheTenantResolution } from '@/lib/middleware/tenant-resolver';
import type {
  CreateTenantRequest,
  CreateTenantResult,
  CrossTenantViolation,
  DeactivationResult,
  Tenant,
  UpdateTenantRequest,
} from './types';
import * as repository from './repository';
import { generateSchemaSQL } from './schema-template';

/**
 * Derives the schema name from a tenant slug.
 * Convention: `tenant_<slug>` with hyphens converted to underscores.
 */
export function deriveSchemaName(slug: string): string {
  return `tenant_${slug.replace(/-/g, '_')}`;
}

/**
 * Validates a tenant slug format.
 * Must be lowercase alphanumeric with hyphens, 3-100 characters.
 */
export function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug) {
    return { valid: false, error: 'Slug is required' };
  }
  if (slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' };
  }
  if (slug.length > 100) {
    return { valid: false, error: 'Slug must not exceed 100 characters' };
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return {
      valid: false,
      error: 'Slug must be lowercase alphanumeric with hyphens, starting and ending with alphanumeric',
    };
  }
  return { valid: true };
}

/**
 * Creates a new tenant with automated schema provisioning.
 *
 * Steps:
 * 1. Validate input (name, slug format, uniqueness)
 * 2. Create tenant record in the registry
 * 3. Provision a dedicated PostgreSQL schema with all per-tenant tables
 * 4. Cache the tenant resolution for fast subdomain lookups
 *
 * Must complete within 10 seconds per requirement 1.2.
 *
 * @throws Error if slug is invalid, already taken, or schema provisioning fails
 */
export async function createTenant(
  request: CreateTenantRequest
): Promise<CreateTenantResult> {
  // Validate name
  if (!request.name || request.name.trim().length === 0) {
    throw new TenantError('Name is required', 'VALIDATION_ERROR');
  }
  if (request.name.length > 255) {
    throw new TenantError('Name must not exceed 255 characters', 'VALIDATION_ERROR');
  }

  // Validate slug
  const slugValidation = validateSlug(request.slug);
  if (!slugValidation.valid) {
    throw new TenantError(slugValidation.error!, 'VALIDATION_ERROR');
  }

  // Check slug uniqueness
  const existing = await repository.slugExists(request.slug);
  if (existing) {
    throw new TenantError(
      `Slug "${request.slug}" is already in use`,
      'CONFLICT'
    );
  }

  const schemaName = deriveSchemaName(request.slug);

  // Check if schema already exists (defensive)
  const existingSchema = await repository.schemaExists(schemaName);
  if (existingSchema) {
    throw new TenantError(
      `Schema "${schemaName}" already exists`,
      'CONFLICT'
    );
  }

  // Create tenant record
  const tenant = await repository.createTenant(
    request.name.trim(),
    request.slug,
    schemaName
  );

  // Provision schema
  let provisioningDurationMs: number;
  try {
    const schemaSQL = generateSchemaSQL(schemaName);
    provisioningDurationMs = await repository.provisionSchema(schemaSQL);
  } catch (error) {
    // If provisioning fails, we should still have the tenant record
    // but mark it as needing re-provisioning. For now, propagate the error.
    throw new TenantError(
      `Schema provisioning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PROVISIONING_ERROR'
    );
  }

  // Cache tenant resolution for fast subdomain lookups
  await cacheTenantResolution(redis, tenant.slug, {
    tenantId: tenant.id,
    slug: tenant.slug,
  });

  return {
    tenant,
    schemaProvisioned: true,
    provisioningDurationMs,
  };
}

/**
 * Updates a tenant's name or status.
 *
 * @throws TenantError if tenant is not found or validation fails
 */
export async function updateTenant(
  tenantId: string,
  request: UpdateTenantRequest
): Promise<Tenant> {
  const existing = await repository.getTenantById(tenantId);
  if (!existing) {
    throw new TenantError('Tenant not found', 'NOT_FOUND');
  }

  // Validate name if provided
  if (request.name !== undefined) {
    if (request.name.trim().length === 0) {
      throw new TenantError('Name cannot be empty', 'VALIDATION_ERROR');
    }
    if (request.name.length > 255) {
      throw new TenantError('Name must not exceed 255 characters', 'VALIDATION_ERROR');
    }
  }

  // Validate status transition
  if (request.status !== undefined) {
    const validTransitions: Record<string, string[]> = {
      active: ['suspended', 'deactivated'],
      suspended: ['active', 'deactivated'],
      deactivated: [], // Cannot transition out of deactivated via update
    };
    const allowed = validTransitions[existing.status] ?? [];
    if (!allowed.includes(request.status)) {
      throw new TenantError(
        `Cannot transition from "${existing.status}" to "${request.status}"`,
        'VALIDATION_ERROR'
      );
    }
  }

  const updated = await repository.updateTenant(tenantId, {
    name: request.name?.trim(),
    status: request.status,
  });

  if (!updated) {
    throw new TenantError('Failed to update tenant', 'INTERNAL_ERROR');
  }

  // Update cache if tenant is still accessible
  if (updated.status === 'active') {
    await cacheTenantResolution(redis, updated.slug, {
      tenantId: updated.id,
      slug: updated.slug,
    });
  } else {
    // Remove from cache if not active
    await redis.del(`tenant:slug:${updated.slug}`);
  }

  return updated;
}

/**
 * Deactivates a tenant — revokes all active sessions and prevents new logins.
 *
 * Must revoke all sessions within 60 seconds per requirement 1.6.
 *
 * Steps:
 * 1. Set tenant status to 'deactivated'
 * 2. Find all users associated with the tenant
 * 3. Revoke their sessions by deleting from Redis
 * 4. Remove tenant from resolution cache
 */
export async function deactivateTenant(
  tenantId: string
): Promise<DeactivationResult> {
  const existing = await repository.getTenantById(tenantId);
  if (!existing) {
    throw new TenantError('Tenant not found', 'NOT_FOUND');
  }

  if (existing.status === 'deactivated') {
    throw new TenantError('Tenant is already deactivated', 'VALIDATION_ERROR');
  }

  // Update status to deactivated
  await repository.updateTenant(tenantId, { status: 'deactivated' });

  // Revoke all sessions for this tenant's users
  const userIds = await repository.getTenantUserIds(tenantId);
  let sessionsRevoked = 0;

  for (const userId of userIds) {
    // Session keys follow the pattern: session:<sessionId>
    // We need to find sessions belonging to this user and tenant
    const sessionPattern = `session:*`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        sessionPattern,
        'COUNT',
        100
      );
      cursor = nextCursor;

      for (const key of keys) {
        const sessionData = await redis.get(key);
        if (sessionData) {
          try {
            const session = JSON.parse(sessionData);
            if (
              session.userId === userId &&
              session.tenantIds?.includes(tenantId)
            ) {
              await redis.del(key);
              sessionsRevoked++;
            }
          } catch {
            // Skip malformed session data
          }
        }
      }
    } while (cursor !== '0');
  }

  // Remove from resolution cache
  await redis.del(`tenant:slug:${existing.slug}`);

  const deactivatedAt = new Date().toISOString();

  return {
    tenantId,
    sessionsRevoked,
    deactivatedAt,
  };
}

/**
 * Detects and logs a cross-tenant access attempt.
 * Denies the request and records the violation.
 *
 * @returns The violation record
 */
export async function detectCrossTenantAccess(
  userId: string,
  targetTenantId: string,
  action: string,
  ipAddress?: string
): Promise<CrossTenantViolation> {
  await repository.logCrossTenantViolation(
    userId,
    targetTenantId,
    action,
    ipAddress
  );

  return {
    userId,
    targetTenantId,
    attemptedAction: action,
    timestamp: new Date().toISOString(),
    denied: true,
  };
}

/**
 * Retrieves a tenant by ID.
 */
export async function getTenant(tenantId: string): Promise<Tenant | null> {
  return repository.getTenantById(tenantId);
}

/**
 * Retrieves a tenant by slug.
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  return repository.getTenantBySlug(slug);
}

/**
 * Checks if a user has access to a specific tenant.
 * Used by middleware and route handlers for authorization checks.
 *
 * @returns true if the user has a role assignment for the given tenant
 */
export async function userHasTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const { publicQuery } = await import('@/lib/db/tenant-query');
  const result = await publicQuery<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM user_tenant_roles WHERE user_id = $1 AND tenant_id = $2
     ) AS exists`,
    [userId, tenantId]
  );
  return result.rows[0]?.exists ?? false;
}

/**
 * Custom error class for tenant operations.
 */
export class TenantError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_ERROR'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'PROVISIONING_ERROR'
      | 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'TenantError';
  }
}
