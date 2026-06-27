/**
 * Property-based tests for viewport detection and route redirection logic.
 *
 * Validates: Requirements 17.3, 17.4
 *
 * Uses fast-check to verify invariants of viewport detection and redirect
 * behavior across many randomly generated user agents, paths, and states.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  detectViewport,
  getViewportRedirect,
  isViewportRedirectExempt,
} from '../viewport-detector';

// --- Arbitraries ---

/** Generates mobile User-Agent strings that are detected as mobile by the implementation. */
const mobileUAArb = fc.oneof(
  fc.constant('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'),
  fc.constant('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)'),
  fc.constant('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'),
  fc.constant('Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)'),
  fc.constant('Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0)'),
  fc.constant('Mozilla/5.0 (Linux; Android 11; SM-A525F) AppleWebKit/537.36 Mobile Safari/537.36'),
  fc.constant('Mozilla/5.0 (webOS/2.0; U; en-US) AppleWebKit/532.2 Palm/1.0'),
  fc.constant('Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'),
  fc.constant('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')
);

/** Generates desktop User-Agent strings (no mobile patterns). */
const desktopUAArb = fc.oneof(
  fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'),
  fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15'),
  fc.constant('Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0'),
  fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edge/112.0.1722.48'),
  fc.constant('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15'),
  fc.constant('Mozilla/5.0 (Linux; Android 12; SM-X800) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36')
);

/** Generates a valid path segment (lowercase alpha + optional segments). */
const pathSegmentArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,15}$/);

/** Generates paths under /web/* prefix. */
const webPathArb = fc.array(pathSegmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => '/web/' + segments.join('/'));

/** Generates paths under /m/* prefix. */
const mobilePathArb = fc.array(pathSegmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => '/m/' + segments.join('/'));

/** Generates API paths that should be exempt from redirect. */
const apiPathArb = fc.array(pathSegmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => '/api/' + segments.join('/'));

/** Generates public/exempt paths. */
const publicPathArb = fc.oneof(
  fc.constant('/'),
  fc.constant('/login'),
  fc.constant('/privacy'),
  fc.constant('/terms'),
  fc.constant('/contact'),
  fc.constant('/booking'),
  fc.constant('/amenities'),
  fc.constant('/the-villa'),
  pathSegmentArb.map((s) => `/villas/${s}`),
  fc.constant('/_next/static/chunks/main.js'),
  fc.constant('/public/images/hero.png'),
  fc.constant('/favicon.ico'),
  fc.constant('/logo.svg'),
  fc.constant('/hero.png'),
  fc.constant('/photo.jpg'),
  fc.constant('/video.mp4')
);

// --- Property Tests ---

describe('Viewport Redirection Properties', () => {
  /**
   * Validates: Requirements 17.3, 17.4
   * Property 1: Mobile UA on /web/* always produces redirect to /m/*
   */
  it('property: mobile UA on /web/* always redirects to /m/*', () => {
    fc.assert(
      fc.property(mobileUAArb, webPathArb, (ua, path) => {
        const viewport = detectViewport(ua);
        expect(viewport).toBe('mobile');

        const redirect = getViewportRedirect(path, viewport, false);
        expect(redirect).not.toBeNull();
        expect(redirect!.startsWith('/m/')).toBe(true);
        // The suffix after /web/ should match the suffix after /m/
        const originalSuffix = path.slice(5); // strip '/web/'
        expect(redirect).toBe('/m/' + originalSuffix);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 17.3, 17.4
   * Property 2: Desktop UA on /m/* always produces redirect to /web/*
   */
  it('property: desktop UA on /m/* always redirects to /web/*', () => {
    fc.assert(
      fc.property(desktopUAArb, mobilePathArb, (ua, path) => {
        const viewport = detectViewport(ua);
        expect(viewport).toBe('desktop');

        const redirect = getViewportRedirect(path, viewport, false);
        expect(redirect).not.toBeNull();
        expect(redirect!.startsWith('/web/')).toBe(true);
        // The suffix after /m/ should match the suffix after /web/
        const originalSuffix = path.slice(3); // strip '/m/'
        expect(redirect).toBe('/web/' + originalSuffix);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 17.3, 17.4
   * Property 3: Mobile UA on /m/* produces NO redirect (already correct)
   */
  it('property: mobile UA on /m/* produces no redirect', () => {
    fc.assert(
      fc.property(mobileUAArb, mobilePathArb, (ua, path) => {
        const viewport = detectViewport(ua);
        expect(viewport).toBe('mobile');

        const redirect = getViewportRedirect(path, viewport, false);
        expect(redirect).toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 17.3, 17.4
   * Property 4: Desktop UA on /web/* produces NO redirect (already correct)
   */
  it('property: desktop UA on /web/* produces no redirect', () => {
    fc.assert(
      fc.property(desktopUAArb, webPathArb, (ua, path) => {
        const viewport = detectViewport(ua);
        expect(viewport).toBe('desktop');

        const redirect = getViewportRedirect(path, viewport, false);
        expect(redirect).toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 17.3, 17.4
   * Property 5: Override cookie always prevents redirect regardless of UA
   */
  it('property: override cookie prevents redirect for any viewport/path combo', () => {
    const viewportArb = fc.constantFrom<'mobile' | 'desktop'>('mobile', 'desktop');
    const anyAppPathArb = fc.oneof(webPathArb, mobilePathArb);

    fc.assert(
      fc.property(viewportArb, anyAppPathArb, (viewport, path) => {
        const redirect = getViewportRedirect(path, viewport, true);
        expect(redirect).toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 17.3, 17.4
   * Property 6: API/public paths are never redirected
   */
  it('property: exempt paths are never redirected regardless of viewport', () => {
    const viewportArb = fc.constantFrom<'mobile' | 'desktop'>('mobile', 'desktop');
    const exemptPathArb = fc.oneof(apiPathArb, publicPathArb);

    fc.assert(
      fc.property(viewportArb, exemptPathArb, (viewport, path) => {
        // Confirm path is exempt
        expect(isViewportRedirectExempt(path)).toBe(true);

        // Exempt paths never start with /web/ or /m/, so getViewportRedirect
        // naturally returns null for them (they don't match either prefix)
        const redirect = getViewportRedirect(path, viewport, false);
        expect(redirect).toBeNull();
      }),
      { numRuns: 200 }
    );
  });
});
