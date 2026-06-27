/**
 * Tenant resolution from subdomain or request path.
 *
 * Resolves the tenant context from the request by checking:
 * 1. Subdomain (e.g., villa-sunrise.arka-platform.com → tenant_id)
 * 2. Falls back to path-based resolution for local development
 *
 * The tenant mapping is cached in Redis for fast lookups.
 */

import type { TenantContext } from './types';

/**
 * The main platform domain. Subdomains of this are treated as tenant slugs.
 * Configurable via environment variable. Read at call time for testability.
 */
function getPlatformDomain(): string {
  return process.env.PLATFORM_DOMAIN ?? 'localhost';
}

/**
 * Reserved subdomains that should NOT be resolved as tenants.
 */
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'status',
]);

/**
 * Extracts the tenant slug from the request hostname.
 *
 * Examples:
 * - "villa-sunrise.arka-platform.com" → "villa-sunrise"
 * - "arka-platform.com" → null (no subdomain)
 * - "www.arka-platform.com" → null (reserved)
 * - "localhost:3000" → null (no subdomain in development)
 */
export function extractSubdomain(hostname: string): string | null {
  // Strip port if present
  const host = hostname.split(':')[0];

  // Skip localhost without subdomain
  if (host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  const platformDomain = getPlatformDomain().split(':')[0];
  if (!host.endsWith(platformDomain)) {
    return null;
  }

  // Extract subdomain portion
  const subdomain = host.slice(0, -(platformDomain.length + 1)); // +1 for the dot

  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
    return null;
  }

  return subdomain;
}

/**
 * Resolves tenant from subdomain by looking up Redis cache,
 * then falling back to database query.
 *
 * @param redis - Redis client instance
 * @param slug - Tenant subdomain slug
 * @returns TenantContext or null if not found
 */
export async function resolveTenantFromSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis: { get: (key: string) => Promise<string | null>; set: (...args: any[]) => Promise<unknown> },
  slug: string
): Promise<TenantContext | null> {
  const cacheKey = `tenant:slug:${slug}`;

  try {
    // Check Redis cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as TenantContext;
    }
  } catch {
    // Cache miss or Redis failure — fall through to DB lookup
  }

  // At this layer we return null; the actual DB lookup happens
  // via the tenant module's query. For the middleware, we rely
  // on the cache being populated by the tenant registration flow.
  // If cache miss and DB lookup is needed, the tenant module
  // handles it and populates the cache.
  return null;
}

/**
 * Caches a tenant resolution result in Redis.
 * Called by the tenant module after successful DB lookup or registration.
 *
 * @param redis - Redis client instance
 * @param slug - Tenant subdomain slug
 * @param context - Resolved tenant context
 * @param ttlSeconds - Cache TTL (default 5 minutes)
 */
export async function cacheTenantResolution(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis: { set: (...args: any[]) => Promise<unknown> },
  slug: string,
  context: TenantContext,
  ttlSeconds: number = 300
): Promise<void> {
  const cacheKey = `tenant:slug:${slug}`;
  await redis.set(cacheKey, JSON.stringify(context), 'EX', ttlSeconds);
}

/**
 * Extracts tenant slug from the URL path for development/fallback.
 * Matches pattern: /api/v1/tenants/:slug/...
 * This is used when subdomain-based resolution is not available.
 */
export function extractTenantFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/api\/v1\/tenants\/([a-z0-9-]+)\//);
  return match ? match[1] : null;
}
