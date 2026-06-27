/**
 * Viewport detection and route redirection.
 *
 * Detects device viewport from User-Agent header and redirects
 * users to the appropriate route prefix:
 * - /m/* for mobile viewports (< 768px)
 * - /web/* for desktop/tablet viewports (>= 768px)
 *
 * Per Requirement 17.3: Redirect to /m/* when viewport < 768px
 * Per Requirement 17.4: Serve /web/* when viewport >= 768px
 */

/**
 * Viewport classification result.
 */
export type ViewportType = 'mobile' | 'desktop';

/**
 * Mobile User-Agent detection patterns.
 * Matches common mobile device identifiers in the UA string.
 */
const MOBILE_UA_PATTERNS = [
  /Android.*Mobile/i,
  /iPhone/i,
  /iPod/i,
  /Windows Phone/i,
  /BlackBerry/i,
  /Opera Mini/i,
  /IEMobile/i,
  /Mobile Safari/i,
  /webOS/i,
];

/**
 * Tablet detection patterns (tablets get desktop view per requirement).
 * Tablets are >= 768px, so they get Desktop_View.
 */
const TABLET_UA_PATTERNS = [
  /iPad/i,
  /Android(?!.*Mobile)/i,
  /Tablet/i,
];

/**
 * Detects the viewport type from the User-Agent header.
 * Tablets are classified as desktop per the requirements (>= 768px).
 *
 * @param userAgent - The User-Agent header string
 * @returns 'mobile' or 'desktop'
 */
export function detectViewport(userAgent: string | null): ViewportType {
  if (!userAgent) {
    return 'desktop'; // Default to desktop if no UA
  }

  // Check for tablets first (they get desktop view)
  if (TABLET_UA_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return 'desktop';
  }

  // Check for mobile devices
  if (MOBILE_UA_PATTERNS.some((pattern) => pattern.test(userAgent))) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Determines if a redirect is needed based on current path and detected viewport.
 *
 * Rules:
 * - If user is on /web/* with mobile viewport → redirect to /m/*
 * - If user is on /m/* with desktop viewport → redirect to /web/*
 * - If user explicitly chose to stay (cookie "viewport-override" set) → no redirect
 * - Public pages, API routes, and static assets are never redirected
 *
 * @param pathname - Current request path
 * @param viewport - Detected viewport type
 * @param hasOverride - Whether user has opted out of auto-redirect
 * @returns New path to redirect to, or null if no redirect needed
 */
export function getViewportRedirect(
  pathname: string,
  viewport: ViewportType,
  hasOverride: boolean
): string | null {
  // Don't redirect if user explicitly chose to stay
  if (hasOverride) {
    return null;
  }

  // Only redirect dashboard/app routes (not API, not public pages)
  if (pathname.startsWith('/web/')) {
    if (viewport === 'mobile') {
      // Replace /web/ with /m/
      return '/m/' + pathname.slice(5);
    }
    return null;
  }

  if (pathname.startsWith('/m/')) {
    if (viewport === 'desktop') {
      // Replace /m/ with /web/
      return '/web/' + pathname.slice(3);
    }
    return null;
  }

  // For root authenticated routes without prefix, redirect to proper prefix
  // This handles navigating to /dashboard → /web/dashboard or /m/dashboard
  // Skipped here because the app structure uses /web/ and /m/ explicitly

  return null;
}

/**
 * Paths that should never be viewport-redirected.
 */
export function isViewportRedirectExempt(pathname: string): boolean {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    pathname.startsWith('/villas/') ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/contact' ||
    pathname === '/booking' ||
    pathname === '/amenities' ||
    pathname === '/the-villa' ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.mp4')
  );
}
