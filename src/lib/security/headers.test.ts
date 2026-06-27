import { describe, it, expect } from 'vitest';
import { getSecurityHeaders, isVersionedApiPath, API_VERSION_PREFIX } from './headers';

describe('Security Headers', () => {
  describe('getSecurityHeaders', () => {
    it('includes X-Frame-Options DENY', () => {
      const headers = getSecurityHeaders();
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('includes X-Content-Type-Options nosniff', () => {
      const headers = getSecurityHeaders();
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('includes Strict-Transport-Security with preload', () => {
      const headers = getSecurityHeaders();
      expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
      expect(headers['Strict-Transport-Security']).toContain('includeSubDomains');
      expect(headers['Strict-Transport-Security']).toContain('preload');
    });

    it('includes Content-Security-Policy', () => {
      const headers = getSecurityHeaders();
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    });

    it('includes Referrer-Policy', () => {
      const headers = getSecurityHeaders();
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('includes Permissions-Policy', () => {
      const headers = getSecurityHeaders();
      expect(headers['Permissions-Policy']).toContain('camera=(self)');
      expect(headers['Permissions-Policy']).toContain('microphone=()');
    });

    it('includes X-DNS-Prefetch-Control off', () => {
      const headers = getSecurityHeaders();
      expect(headers['X-DNS-Prefetch-Control']).toBe('off');
    });

    it('CSP includes base-uri and form-action restrictions', () => {
      const headers = getSecurityHeaders();
      expect(headers['Content-Security-Policy']).toContain("base-uri 'self'");
      expect(headers['Content-Security-Policy']).toContain("form-action 'self'");
      expect(headers['Content-Security-Policy']).toContain("object-src 'none'");
    });
  });

  describe('isVersionedApiPath', () => {
    it('accepts versioned API paths', () => {
      expect(isVersionedApiPath('/api/v1/bookings')).toBe(true);
      expect(isVersionedApiPath('/api/v1/auth/login')).toBe(true);
      expect(isVersionedApiPath('/api/v1/tenants/123')).toBe(true);
    });

    it('rejects unversioned API paths', () => {
      expect(isVersionedApiPath('/api/bookings')).toBe(false);
      expect(isVersionedApiPath('/api/v2/bookings')).toBe(false);
      expect(isVersionedApiPath('/api/')).toBe(false);
    });

    it('accepts non-API paths (no versioning required)', () => {
      expect(isVersionedApiPath('/web/agency/dashboard')).toBe(true);
      expect(isVersionedApiPath('/m/dashboard')).toBe(true);
      expect(isVersionedApiPath('/login')).toBe(true);
      expect(isVersionedApiPath('/')).toBe(true);
    });
  });

  describe('API_VERSION_PREFIX', () => {
    it('is /api/v1/', () => {
      expect(API_VERSION_PREFIX).toBe('/api/v1/');
    });
  });
});
