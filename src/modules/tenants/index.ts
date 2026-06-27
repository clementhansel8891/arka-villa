/**
 * Tenants Module
 *
 * Tenant lifecycle management, schema provisioning,
 * and tenant-scoped data isolation.
 */

export * from './types';
export {
  createTenant,
  updateTenant,
  deactivateTenant,
  detectCrossTenantAccess,
  getTenant,
  getTenantBySlug,
  userHasTenantAccess,
  deriveSchemaName,
  validateSlug,
  TenantError,
} from './service';
export { generateSchemaSQL } from './schema-template';
