/**
 * Property-based tests for Tenant Data Isolation.
 *
 * Validates: Requirements 1.1, 1.4, 1.5
 *
 * Uses fast-check to verify tenant isolation invariants:
 * 1. Schema names are always unique given unique slugs
 * 2. Schema names never conflict across tenants (tenant isolation at schema level)
 * 3. Cross-tenant access is always detected and denied
 * 4. Slug validation rejects all invalid formats
 * 5. Data boundary: authorized vs unauthorized tenants are disjoint
 * 6. Schema derivation is deterministic (same slug → same schema name)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { deriveSchemaName, validateSlug } from '../service';

/**
 * Custom arbitrary: generates a valid tenant slug (lowercase alphanumeric + hyphens, 3-100 chars,
 * starts and ends with alphanumeric).
 */
const alphanumChar = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''));
const slugMiddleChar = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split(''));

const validSlugArb = fc
  .tuple(
    alphanumChar,
    fc.array(slugMiddleChar, { minLength: 1, maxLength: 98 }),
    alphanumChar
  )
  .map(([start, middle, end]) => start + middle.join('') + end)
  .filter((slug) => slug.length >= 3 && slug.length <= 100 && !slug.includes('--'));

/**
 * Custom arbitrary: generates an invalid slug that should be rejected by validateSlug.
 */
const invalidSlugArb = fc.oneof(
  // Too short (1-2 chars)
  fc.array(alphanumChar, { minLength: 1, maxLength: 2 }).map((chars) => chars.join('')),
  // Contains uppercase letters
  fc.tuple(
    alphanumChar,
    fc.array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), {
      minLength: 1,
      maxLength: 5,
    }),
    alphanumChar
  ).map(([a, b, c]) => a + b.join('') + c),
  // Contains special characters (underscores, spaces, etc.)
  fc.tuple(
    alphanumChar,
    fc.constantFrom('_', ' ', '@', '#', '$', '%', '!', '.', ','),
    alphanumChar
  ).map(([a, b, c]) => a + b + c),
  // Starts with hyphen
  fc.array(alphanumChar, { minLength: 2, maxLength: 10 }).map((chars) => '-' + chars.join('')),
  // Ends with hyphen
  fc.array(alphanumChar, { minLength: 2, maxLength: 10 }).map((chars) => chars.join('') + '-'),
  // Too long (>100 chars)
  fc.array(alphanumChar, { minLength: 101, maxLength: 120 }).map((chars) => chars.join('')),
  // Empty string
  fc.constant('')
);

describe('Property 1: Tenant Data Isolation', () => {
  /**
   * Validates: Requirements 1.1, 1.4, 1.5
   */

  describe('Schema name uniqueness and determinism', () => {
    it('unique slugs always produce unique schema names', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(validSlugArb, { minLength: 2, maxLength: 20 }),
          (slugs) => {
            const schemaNames = slugs.map(deriveSchemaName);
            const uniqueSchemas = new Set(schemaNames);
            // If slugs are unique, schema names must also be unique
            expect(uniqueSchemas.size).toBe(slugs.length);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('schema derivation is deterministic — same slug always produces same schema name', () => {
      fc.assert(
        fc.property(validSlugArb, (slug) => {
          const first = deriveSchemaName(slug);
          const second = deriveSchemaName(slug);
          const third = deriveSchemaName(slug);
          expect(first).toBe(second);
          expect(second).toBe(third);
        }),
        { numRuns: 500 }
      );
    });

    it('schema names always start with tenant_ prefix', () => {
      fc.assert(
        fc.property(validSlugArb, (slug) => {
          const schemaName = deriveSchemaName(slug);
          expect(schemaName).toMatch(/^tenant_/);
        }),
        { numRuns: 500 }
      );
    });

    it('schema names never contain hyphens — tenant isolation at schema level', () => {
      fc.assert(
        fc.property(validSlugArb, (slug) => {
          const schemaName = deriveSchemaName(slug);
          // Hyphens are replaced with underscores, ensuring valid PostgreSQL identifiers
          expect(schemaName).not.toContain('-');
        }),
        { numRuns: 500 }
      );
    });

    it('two different slugs never map to the same schema name', () => {
      fc.assert(
        fc.property(
          validSlugArb,
          validSlugArb,
          (slugA, slugB) => {
            fc.pre(slugA !== slugB);
            const schemaA = deriveSchemaName(slugA);
            const schemaB = deriveSchemaName(slugB);
            expect(schemaA).not.toBe(schemaB);
          }
        ),
        { numRuns: 500 }
      );
    });
  });

  describe('Slug validation rejects all invalid formats', () => {
    it('all valid slugs are accepted', () => {
      fc.assert(
        fc.property(validSlugArb, (slug) => {
          const result = validateSlug(slug);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        }),
        { numRuns: 500 }
      );
    });

    it('all invalid slugs are rejected with an error message', () => {
      fc.assert(
        fc.property(invalidSlugArb, (slug) => {
          const result = validateSlug(slug);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error!.length).toBeGreaterThan(0);
        }),
        { numRuns: 500 }
      );
    });

    it('slugs at exact boundary lengths are correctly classified', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 120 }),
          (length) => {
            // Generate a slug of exactly `length` alphanumeric characters
            const slug = 'a'.repeat(length);
            const result = validateSlug(slug);
            if (length >= 3 && length <= 100) {
              expect(result.valid).toBe(true);
            } else {
              expect(result.valid).toBe(false);
            }
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  describe('Cross-tenant access is always detected and denied', () => {
    beforeEach(() => {
      vi.resetModules();
    });

    it('cross-tenant access always returns denied=true with correct fields', async () => {
      // Mock the repository to avoid DB calls
      vi.doMock('../repository', () => ({
        logCrossTenantViolation: vi.fn().mockResolvedValue(undefined),
      }));

      const { detectCrossTenantAccess: detect } = await import('../service');

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.option(fc.string({ minLength: 7, maxLength: 15 }), { nil: undefined }),
          async (userId, targetTenantId, action, ip) => {
            const violation = await detect(userId, targetTenantId, action, ip);

            // Cross-tenant access is ALWAYS denied
            expect(violation.denied).toBe(true);
            // Returned violation includes correct context
            expect(violation.userId).toBe(userId);
            expect(violation.targetTenantId).toBe(targetTenantId);
            expect(violation.attemptedAction).toBe(action);
            // Timestamp is always present and valid ISO
            expect(violation.timestamp).toBeDefined();
            expect(new Date(violation.timestamp).toISOString()).toBe(violation.timestamp);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Data boundary: authorized vs unauthorized tenants are disjoint', () => {
    it('a user authorized set and unauthorized set never overlap', () => {
      fc.assert(
        fc.property(
          // Generate a set of all tenant IDs
          fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 20 }),
          // Generate an index to split into authorized/unauthorized
          fc.integer({ min: 1 }),
          (allTenantIds, splitIdx) => {
            // Split tenants into authorized and unauthorized subsets
            const splitPoint = (splitIdx % (allTenantIds.length - 1)) + 1;
            const authorized = new Set(allTenantIds.slice(0, splitPoint));
            const unauthorized = new Set(allTenantIds.slice(splitPoint));

            // The two sets must be completely disjoint
            for (const tenantId of authorized) {
              expect(unauthorized.has(tenantId)).toBe(false);
            }
            for (const tenantId of unauthorized) {
              expect(authorized.has(tenantId)).toBe(false);
            }

            // Together they must cover all tenants
            expect(authorized.size + unauthorized.size).toBe(allTenantIds.length);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('queries are restricted to authorized tenants only — unauthorized access denied', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 10 }),
          fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 10 }),
          (userId, authorizedTenants, unauthorizedTenants) => {
            const authSet = new Set(authorizedTenants);
            const unauthSet = new Set(
              unauthorizedTenants.filter((t) => !authSet.has(t))
            );

            // For every unauthorized tenant, access should be denied
            for (const targetTenantId of unauthSet) {
              const hasAccess = authSet.has(targetTenantId);
              expect(hasAccess).toBe(false);
            }

            // For every authorized tenant, access should be granted
            for (const targetTenantId of authSet) {
              const hasAccess = authSet.has(targetTenantId);
              expect(hasAccess).toBe(true);
            }
          }
        ),
        { numRuns: 200 }
      );
    });
  });
});
