/**
 * Integration-style tests for tenant resolution combining subdomain and path strategies.
 *
 * Validates: Requirements 1.4, 34.1
 *
 * Tests the full resolution flow: subdomain extraction → cache lookup → path fallback.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  extractSubdomain,
  extractTenantFromPath,
  resolveTenantFromSlug,
  cacheTenantResolution,
} from './tenant-resolver';
import type { TenantContext } from './types';

describe('Tenant resolution: subdomain + path combined strategy', () => {
  const originalPlatformDomain = process.env.PLATFORM_DOMAIN;

  beforeEach(() => {
    process.env.PLATFORM_DOMAIN = 'arka-platform.com';
  });

  afterEach(() => {
    process.env.PLATFORM_DOMAIN = originalPlatformDomain;
  });

  /**
   * Simulates the middleware resolution strategy:
   * 1. Try subdomain first
   * 2. Fall back to path-based extraction
   */
  function resolveTenantSlug(hostname: string, pathname: string): string | null {
    return extractSubdomain(hostname) ?? extractTenantFromPath(pathname);
  }

  it('prefers subdomain resolution over path resolution', () => {
    const slug = resolveTenantSlug(
      'villa-sunset.arka-platform.com',
      '/api/v1/tenants/villa-other/bookings'
    );
    expect(slug).toBe('villa-sunset');
  });

  it('falls back to path resolution when subdomain is not available', () => {
    const slug = resolveTenantSlug(
      'arka-platform.com',
      '/api/v1/tenants/villa-sunrise/bookings'
    );
    expect(slug).toBe('villa-sunrise');
  });

  it('returns null when neither subdomain nor path provide a tenant', () => {
    const slug = resolveTenantSlug('arka-platform.com', '/web/dashboard');
    expect(slug).toBeNull();
  });

  it('returns null for reserved subdomains and non-tenant paths', () => {
    const slug = resolveTenantSlug('www.arka-platform.com', '/api/v1/auth/login');
    expect(slug).toBeNull();
  });

  it('resolves correctly in localhost development (no subdomain, path only)', () => {
    const slug = resolveTenantSlug(
      'localhost:3000',
      '/api/v1/tenants/dev-villa/staff'
    );
    expect(slug).toBe('dev-villa');
  });

  it('resolves correctly in localhost without tenant path', () => {
    const slug = resolveTenantSlug('localhost:3000', '/api/v1/bookings');
    expect(slug).toBeNull();
  });

  /**
   * Property: For any valid slug, subdomain resolution always
   * takes priority over path resolution when both are present.
   */
  it('property: subdomain always takes priority over path', () => {
    const slugArb = fc.stringMatching(/^[a-z][a-z0-9-]{2,20}$/);

    fc.assert(
      fc.property(slugArb, slugArb, (subdomainSlug, pathSlug) => {
        const hostname = `${subdomainSlug}.arka-platform.com`;
        const pathname = `/api/v1/tenants/${pathSlug}/bookings`;
        const resolved = resolveTenantSlug(hostname, pathname);
        // Should always prefer subdomain
        expect(resolved).toBe(subdomainSlug);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property: When subdomain extraction returns null (localhost, reserved,
   * or no subdomain), the strategy falls back to path extraction.
   */
  it('property: path fallback works when subdomain is unavailable', () => {
    const slugArb = fc.stringMatching(/^[a-z][a-z0-9-]{2,20}$/);
    const noSubdomainHosts = fc.constantFrom(
      'localhost:3000',
      '127.0.0.1:3000',
      'arka-platform.com',
      'www.arka-platform.com',
      'api.arka-platform.com'
    );

    fc.assert(
      fc.property(noSubdomainHosts, slugArb, (hostname, pathSlug) => {
        const pathname = `/api/v1/tenants/${pathSlug}/bookings`;
        const resolved = resolveTenantSlug(hostname, pathname);
        expect(resolved).toBe(pathSlug);
      }),
      { numRuns: 50 }
    );
  });
});

describe('Tenant resolution: cache integration', () => {
  it('resolveTenantFromSlug returns cached context on hit', async () => {
    const tenantContext: TenantContext = {
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      slug: 'villa-sunrise',
    };

    const mockRedis = {
      get: async (key: string) => {
        if (key === 'tenant:slug:villa-sunrise') {
          return JSON.stringify(tenantContext);
        }
        return null;
      },
      set: async () => 'OK' as unknown,
    };

    const result = await resolveTenantFromSlug(mockRedis, 'villa-sunrise');
    expect(result).toEqual(tenantContext);
  });

  it('resolveTenantFromSlug returns null on cache miss', async () => {
    const mockRedis = {
      get: async () => null,
      set: async () => 'OK' as unknown,
    };

    const result = await resolveTenantFromSlug(mockRedis, 'unknown-villa');
    expect(result).toBeNull();
  });

  it('resolveTenantFromSlug fails open on Redis error', async () => {
    const mockRedis = {
      get: async () => { throw new Error('Connection refused'); },
      set: async () => 'OK' as unknown,
    };

    const result = await resolveTenantFromSlug(mockRedis, 'villa-sunrise');
    expect(result).toBeNull();
  });

  it('cacheTenantResolution stores context with correct key and TTL', async () => {
    const tenantContext: TenantContext = {
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      slug: 'villa-sunrise',
    };

    const setCalls: unknown[][] = [];
    const mockRedis = {
      set: async (...args: unknown[]) => { setCalls.push(args); return 'OK'; },
    };

    await cacheTenantResolution(mockRedis, 'villa-sunrise', tenantContext, 600);

    expect(setCalls).toHaveLength(1);
    expect(setCalls[0][0]).toBe('tenant:slug:villa-sunrise');
    expect(JSON.parse(setCalls[0][1] as string)).toEqual(tenantContext);
    expect(setCalls[0][2]).toBe('EX');
    expect(setCalls[0][3]).toBe(600);
  });

  /**
   * Property: Any cached tenant context can be round-tripped through
   * cacheTenantResolution → resolveTenantFromSlug.
   */
  it('property: cache round-trip preserves tenant context', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          slug: fc.stringMatching(/^[a-z][a-z0-9-]{2,20}$/),
        }),
        async (context: TenantContext) => {
          // Simulate in-memory Redis
          const store: Record<string, string> = {};
          const mockRedis = {
            get: async (key: string) => store[key] ?? null,
            set: async (...args: unknown[]) => {
              store[args[0] as string] = args[1] as string;
              return 'OK';
            },
          };

          await cacheTenantResolution(mockRedis, context.slug, context);
          const resolved = await resolveTenantFromSlug(mockRedis, context.slug);
          expect(resolved).toEqual(context);
        }
      ),
      { numRuns: 30 }
    );
  });
});
