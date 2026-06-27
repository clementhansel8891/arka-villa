/**
 * Tenants module types.
 *
 * Covers tenant lifecycle management, schema provisioning,
 * and cross-tenant access detection.
 */

/**
 * Tenant status lifecycle.
 * - active: tenant is operational
 * - suspended: temporarily disabled (e.g., billing issue)
 * - deactivated: permanently disabled, sessions revoked
 */
export type TenantStatus = 'active' | 'suspended' | 'deactivated';

/**
 * Core tenant record stored in the public.tenants table.
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request payload for creating a new tenant (villa registration).
 */
export interface CreateTenantRequest {
  /** Display name of the villa */
  name: string;
  /** URL-safe slug used for subdomain resolution */
  slug: string;
}

/**
 * Request payload for updating tenant details.
 */
export interface UpdateTenantRequest {
  /** Updated display name (optional) */
  name?: string;
  /** Updated status (optional) */
  status?: TenantStatus;
}

/**
 * Result of a tenant creation including provisioned schema info.
 */
export interface CreateTenantResult {
  tenant: Tenant;
  /** Whether schema provisioning completed successfully */
  schemaProvisioned: boolean;
  /** Duration of provisioning in milliseconds */
  provisioningDurationMs: number;
}

/**
 * Cross-tenant access violation log entry.
 */
export interface CrossTenantViolation {
  userId: string;
  targetTenantId: string;
  attemptedAction: string;
  timestamp: string;
  denied: boolean;
}

/**
 * Tenant deactivation result.
 */
export interface DeactivationResult {
  tenantId: string;
  sessionsRevoked: number;
  deactivatedAt: string;
}
