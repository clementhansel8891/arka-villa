/**
 * Tests for viewport detection and route redirection.
 */

import { describe, it, expect } from 'vitest';
import {
  detectViewport,
  getViewportRedirect,
  isViewportRedirectExempt,
} from './viewport-detector';

describe('detectViewport', () => {
  it('returns desktop for null user agent', () => {
    expect(detectViewport(null)).toBe('desktop');
  });

  it('returns desktop for empty string', () => {
    expect(detectViewport('')).toBe('desktop');
  });

  it('returns mobile for iPhone user agent', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
    expect(detectViewport(ua)).toBe('mobile');
  });

  it('returns mobile for Android Mobile user agent', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36';
    expect(detectViewport(ua)).toBe('mobile');
  });

  it('returns desktop for iPad (tablet gets desktop)', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
    expect(detectViewport(ua)).toBe('desktop');
  });

  it('returns desktop for Android Tablet (no Mobile in UA)', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 12; SM-X800) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36';
    expect(detectViewport(ua)).toBe('desktop');
  });

  it('returns desktop for Chrome on desktop', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36';
    expect(detectViewport(ua)).toBe('desktop');
  });

  it('returns desktop for Firefox on desktop', () => {
    const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/113.0';
    expect(detectViewport(ua)).toBe('desktop');
  });
});

describe('getViewportRedirect', () => {
  it('redirects /web/ to /m/ for mobile viewport', () => {
    expect(getViewportRedirect('/web/dashboard', 'mobile', false)).toBe('/m/dashboard');
    expect(getViewportRedirect('/web/agency/overview', 'mobile', false)).toBe('/m/agency/overview');
  });

  it('redirects /m/ to /web/ for desktop viewport', () => {
    expect(getViewportRedirect('/m/dashboard', 'desktop', false)).toBe('/web/dashboard');
    expect(getViewportRedirect('/m/staff/tasks', 'desktop', false)).toBe('/web/staff/tasks');
  });

  it('returns null when viewport matches current prefix', () => {
    expect(getViewportRedirect('/web/dashboard', 'desktop', false)).toBeNull();
    expect(getViewportRedirect('/m/dashboard', 'mobile', false)).toBeNull();
  });

  it('returns null when user has viewport override cookie', () => {
    expect(getViewportRedirect('/web/dashboard', 'mobile', true)).toBeNull();
    expect(getViewportRedirect('/m/dashboard', 'desktop', true)).toBeNull();
  });

  it('returns null for paths without /web/ or /m/ prefix', () => {
    expect(getViewportRedirect('/login', 'mobile', false)).toBeNull();
    expect(getViewportRedirect('/api/v1/bookings', 'mobile', false)).toBeNull();
    expect(getViewportRedirect('/', 'mobile', false)).toBeNull();
  });
});

describe('isViewportRedirectExempt', () => {
  it('exempts API routes', () => {
    expect(isViewportRedirectExempt('/api/v1/bookings')).toBe(true);
    expect(isViewportRedirectExempt('/api/v1/auth/login')).toBe(true);
  });

  it('exempts Next.js internals', () => {
    expect(isViewportRedirectExempt('/_next/static/chunk.js')).toBe(true);
  });

  it('exempts public pages', () => {
    expect(isViewportRedirectExempt('/')).toBe(true);
    expect(isViewportRedirectExempt('/login')).toBe(true);
    expect(isViewportRedirectExempt('/privacy')).toBe(true);
    expect(isViewportRedirectExempt('/terms')).toBe(true);
    expect(isViewportRedirectExempt('/contact')).toBe(true);
    expect(isViewportRedirectExempt('/booking')).toBe(true);
  });

  it('exempts villa website paths', () => {
    expect(isViewportRedirectExempt('/villas/sunset-villa')).toBe(true);
  });

  it('exempts static file extensions', () => {
    expect(isViewportRedirectExempt('/favicon.ico')).toBe(true);
    expect(isViewportRedirectExempt('/logo.svg')).toBe(true);
    expect(isViewportRedirectExempt('/hero.png')).toBe(true);
  });

  it('does NOT exempt dashboard routes', () => {
    expect(isViewportRedirectExempt('/web/dashboard')).toBe(false);
    expect(isViewportRedirectExempt('/m/dashboard')).toBe(false);
  });
});
