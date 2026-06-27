import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCorsConfig,
  isOriginAllowed,
  buildCorsHeaders,
  buildPreflightHeaders,
} from './cors';

describe('CORS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getCorsConfig', () => {
    it('returns development origins for development environment', () => {
      const config = getCorsConfig('development');
      expect(config.allowedOrigins).toContain('http://localhost:3000');
      expect(config.allowedOrigins).toContain('http://localhost:3001');
      expect(config.allowedOrigins).toContain('http://127.0.0.1:3000');
    });

    it('returns development origins for test environment', () => {
      const config = getCorsConfig('test');
      expect(config.allowedOrigins).toContain('http://localhost:3000');
    });

    it('returns production origins from environment variables', () => {
      process.env.APP_BASE_URL = 'https://arka-villa.com';
      process.env.APP_BASE_DOMAIN = 'arka-villa.com';
      const config = getCorsConfig('production');
      expect(config.allowedOrigins).toContain('https://arka-villa.com');
      expect(config.allowedOrigins).toContain('https://arka-villa.com');
    });

    it('includes extra origins from CORS_EXTRA_ORIGINS', () => {
      process.env.CORS_EXTRA_ORIGINS = 'https://admin.example.com, https://other.example.com';
      const config = getCorsConfig('production');
      expect(config.allowedOrigins).toContain('https://admin.example.com');
      expect(config.allowedOrigins).toContain('https://other.example.com');
    });

    it('includes standard allowed methods', () => {
      const config = getCorsConfig('development');
      expect(config.allowedMethods).toContain('GET');
      expect(config.allowedMethods).toContain('POST');
      expect(config.allowedMethods).toContain('DELETE');
      expect(config.allowedMethods).toContain('OPTIONS');
    });

    it('includes X-CSRF-Token in allowed headers', () => {
      const config = getCorsConfig('development');
      expect(config.allowedHeaders).toContain('X-CSRF-Token');
      expect(config.allowedHeaders).toContain('X-Request-ID');
    });

    it('allows credentials by default', () => {
      const config = getCorsConfig('development');
      expect(config.allowCredentials).toBe(true);
    });
  });

  describe('isOriginAllowed', () => {
    it('allows exact match origins', () => {
      const config = getCorsConfig('development');
      expect(isOriginAllowed('http://localhost:3000', config)).toBe(true);
    });

    it('rejects non-matching origins', () => {
      const config = getCorsConfig('development');
      expect(isOriginAllowed('http://evil.com', config)).toBe(false);
    });

    it('rejects empty origin', () => {
      const config = getCorsConfig('development');
      expect(isOriginAllowed('', config)).toBe(false);
    });

    it('allows subdomains of the base domain', () => {
      process.env.APP_BASE_DOMAIN = 'arka-villa.com';
      const config = getCorsConfig('production');
      expect(isOriginAllowed('https://villa1.arka-villa.com', config)).toBe(true);
      expect(isOriginAllowed('https://admin.arka-villa.com', config)).toBe(true);
    });

    it('rejects invalid URLs gracefully', () => {
      process.env.APP_BASE_DOMAIN = 'arka-villa.com';
      const config = getCorsConfig('production');
      expect(isOriginAllowed('not-a-valid-url', config)).toBe(false);
    });
  });

  describe('buildCorsHeaders', () => {
    it('returns headers for allowed origin', () => {
      const config = getCorsConfig('development');
      const headers = buildCorsHeaders('http://localhost:3000', config);
      expect(headers).not.toBeNull();
      expect(headers!['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(headers!['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('returns null for disallowed origin', () => {
      const config = getCorsConfig('development');
      const headers = buildCorsHeaders('http://evil.com', config);
      expect(headers).toBeNull();
    });

    it('returns null when origin is null', () => {
      const config = getCorsConfig('development');
      const headers = buildCorsHeaders(null, config);
      expect(headers).toBeNull();
    });

    it('includes exposed headers', () => {
      const config = getCorsConfig('development');
      const headers = buildCorsHeaders('http://localhost:3000', config);
      expect(headers!['Access-Control-Expose-Headers']).toContain('X-Request-ID');
    });
  });

  describe('buildPreflightHeaders', () => {
    it('returns same headers as buildCorsHeaders', () => {
      const config = getCorsConfig('development');
      const cors = buildCorsHeaders('http://localhost:3000', config);
      const preflight = buildPreflightHeaders('http://localhost:3000', config);
      expect(preflight).toEqual(cors);
    });
  });
});
