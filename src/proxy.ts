/**
 * Next.js Proxy (formerly Middleware) — Multi-Villa Platform.
 *
 * Execution order:
 * 1. Rate limiting (token bucket per IP/user via Redis)
 * 2. Tenant resolution (subdomain → tenant_id mapping)
 * 3. JWT validation and session check
 * 4. RBAC enforcement (role + tenant scope)
 * 5. Viewport detection and route redirection (/m/* vs /web/*)
 *
 * Note: TLS verification is handled by Nginx (step 0, before this runs).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  checkRateLimit,
  getRateLimitConfig,
  getRateLimitKey,
  extractSubdomain,
  resolveTenantFromSlug,
  extractTenantFromPath,
  validateJwt,
  enforceRbac,
  detectViewport,
  getViewportRedirect,
  isViewportRedirectExempt,
  MIDDLEWARE_HEADERS,
} from './lib/middleware';
import type { TenantContext, UserSession } from './lib/middleware';
import { redis } from './lib/db/redis';

/**
 * Paths that are completely public and skip all middleware checks.
 */
/**
 * Paths that are completely public and skip all middleware checks.
 * In local development (without Redis/JWT), dashboard routes are also
 * whitelisted here — the client-side layout handles auth via localStorage.
 */
function isPublicPath(pathname: string): boolean {
  // Dashboard routes are protected client-side via AuthContext/localStorage.
  // The proxy allows them through — each layout checks auth and redirects if needed.
  if (pathname.startsWith('/web/') || pathname.startsWith('/m/') || pathname.startsWith('/admin')) {
    return true;
  }

  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/contact' ||
    pathname === '/booking' ||
    pathname === '/for-owners' ||
    pathname === '/careers' ||
    pathname === '/profile' ||
    pathname.startsWith('/villas/') ||
    pathname.startsWith('/uploads/') ||
    pathname.startsWith('/api/v1/careers/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/videos/') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.mp4')
  );
}

/**
 * Paths that require authentication.
 */
function requiresAuth(pathname: string): boolean {
  return (
    pathname.startsWith('/web/') ||
    pathname.startsWith('/m/') ||
    (pathname.startsWith('/api/v1/') && !pathname.startsWith('/api/v1/auth/'))
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware entirely for static assets and public pages
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // ─── Step 1: Rate Limiting ───────────────────────────────────
  const session = await extractSessionFromCookie(request);
  const isAuthenticated = session !== null;

  const rateLimitConfig = getRateLimitConfig(pathname, isAuthenticated);
  const rateLimitIdentifier = isAuthenticated
    ? session.userId
    : getClientIp(request);
  const rateLimitType = isAuthenticated ? 'user' : 'ip';
  const rateLimitKey = getRateLimitKey(rateLimitIdentifier, rateLimitType);

  const rateLimitResult = await checkRateLimit(redis, rateLimitKey, rateLimitConfig);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter),
          'X-RateLimit-Limit': String(rateLimitResult.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // ─── Step 2: Tenant Resolution ──────────────────────────────
  let tenant: TenantContext | null = null;

  const subdomain = extractSubdomain(request.headers.get('host') ?? '');
  if (subdomain) {
    tenant = await resolveTenantFromSlug(redis, subdomain);
  }

  // Fallback: extract tenant from path for development
  if (!tenant) {
    const pathSlug = extractTenantFromPath(pathname);
    if (pathSlug) {
      tenant = await resolveTenantFromSlug(redis, pathSlug);
    }
  }

  // ─── Step 3: JWT Validation ─────────────────────────────────
  // (already done above for rate limiting; reuse the result)

  // If route requires auth and no valid session, redirect to login
  if (requiresAuth(pathname) && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Step 4: RBAC Enforcement ───────────────────────────────
  if (requiresAuth(pathname)) {
    const rbacResult = enforceRbac(pathname, session, tenant);
    if (!rbacResult.allowed) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          {
            error: 'Forbidden',
            message: rbacResult.reason,
            requiredRoles: rbacResult.requiredRoles,
          },
          { status: 403 }
        );
      }
      // For page routes, redirect to an unauthorized page or login
      const unauthorizedUrl = new URL('/login', request.url);
      unauthorizedUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // ─── Step 5: Viewport Detection & Route Redirection ─────────
  if (!isViewportRedirectExempt(pathname)) {
    const userAgent = request.headers.get('user-agent');
    const viewport = detectViewport(userAgent);
    const hasOverride = request.cookies.has('viewport-override');

    const redirectTo = getViewportRedirect(pathname, viewport, hasOverride);
    if (redirectTo) {
      const redirectUrl = new URL(redirectTo, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // ─── Pass Context Headers Downstream ────────────────────────
  const requestHeaders = new Headers(request.headers);

  if (tenant) {
    requestHeaders.set(MIDDLEWARE_HEADERS.TENANT_ID, tenant.tenantId);
    requestHeaders.set(MIDDLEWARE_HEADERS.TENANT_SLUG, tenant.slug);
  }

  if (session) {
    requestHeaders.set(MIDDLEWARE_HEADERS.USER_ID, session.userId);
    requestHeaders.set(MIDDLEWARE_HEADERS.USER_ROLE, session.role);
    requestHeaders.set(MIDDLEWARE_HEADERS.SESSION_ID, session.sessionId);
  }

  // Set viewport header for SSR components
  const userAgent = request.headers.get('user-agent');
  const viewport = detectViewport(userAgent);
  requestHeaders.set(MIDDLEWARE_HEADERS.VIEWPORT, viewport);

  // Build response with forwarded headers and rate limit info
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set rate limit headers on response
  response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
  response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));

  // Set security headers (Requirement 34.4)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-ancestors 'none'"
  );

  return response;
}

/**
 * Extracts and validates the user session from the request cookie.
 */
async function extractSessionFromCookie(
  request: NextRequest
): Promise<UserSession | null> {
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie?.value) {
    return null;
  }
  return validateJwt(sessionCookie.value);
}

/**
 * Extracts the client IP from the request.
 * Checks X-Forwarded-For (set by Nginx) first, then falls back.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '127.0.0.1';
}

/**
 * Proxy matcher configuration.
 * Excludes static files and Next.js internals.
 */
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public assets (images, videos, svgs)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|images/|videos/).*)',
  ],
};
