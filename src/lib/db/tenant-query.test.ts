import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getTenantSchemaName } from './tenant-query';

describe('getTenantSchemaName', () => {
  it('replaces dashes with underscores in tenant ID', () => {
    const result = getTenantSchemaName('villa-001');
    expect(result).toBe('tenant_villa_001');
  });

  it('handles UUID-style tenant IDs', () => {
    const result = getTenantSchemaName('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
    expect(result).toBe('tenant_a1b2c3d4_e5f6_7890_abcd_ef1234567890');
  });

  it('handles tenant IDs without dashes', () => {
    const result = getTenantSchemaName('villa001');
    expect(result).toBe('tenant_villa001');
  });
});

describe('getTenantSchemaName (property-based)', () => {
  /**
   * Validates: Requirements 39.1
   * Property: tenant schema names always start with "tenant_" prefix
   */
  it('always produces a schema name starting with "tenant_"', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (tenantId) => {
          const schemaName = getTenantSchemaName(tenantId);
          return schemaName.startsWith('tenant_');
        }
      )
    );
  });

  /**
   * Validates: Requirements 39.1
   * Property: tenant schema names never contain dashes
   */
  it('never contains dashes in the output', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 36 }),
        (tenantId) => {
          const schemaName = getTenantSchemaName(tenantId);
          return !schemaName.includes('-');
        }
      )
    );
  });
});
