import { describe, it, expect } from 'vitest';
import {
  generateCsrfToken,
  validateCsrfToken,
  requiresCsrfValidation,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from './csrf';

describe('CSRF Protection', () => {
  describe('generateCsrfToken', () => {
    it('generates a 64-character hex string', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates unique tokens each call', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateCsrfToken', () => {
    it('validates matching tokens', () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(token, token);
      expect(result.valid).toBe(true);
    });

    it('rejects mismatched tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      const result = validateCsrfToken(token1, token2);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('CSRF token mismatch');
    });

    it('rejects when header token is null', () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(null, token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing CSRF header');
    });

    it('rejects when cookie token is null', () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(token, null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing CSRF cookie');
    });

    it('rejects when both tokens are null', () => {
      const result = validateCsrfToken(null, null);
      expect(result.valid).toBe(false);
    });

    it('rejects tokens with different lengths', () => {
      const result = validateCsrfToken('short', 'longertoken');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('CSRF token mismatch');
    });
  });

  describe('requiresCsrfValidation', () => {
    it('requires CSRF for POST to API endpoints', () => {
      expect(requiresCsrfValidation('POST', '/api/v1/bookings')).toBe(true);
    });

    it('requires CSRF for PUT to API endpoints', () => {
      expect(requiresCsrfValidation('PUT', '/api/v1/tenants/123')).toBe(true);
    });

    it('requires CSRF for PATCH to API endpoints', () => {
      expect(requiresCsrfValidation('PATCH', '/api/v1/bookings/456')).toBe(true);
    });

    it('requires CSRF for DELETE to API endpoints', () => {
      expect(requiresCsrfValidation('DELETE', '/api/v1/bookings/789')).toBe(true);
    });

    it('does not require CSRF for GET requests', () => {
      expect(requiresCsrfValidation('GET', '/api/v1/bookings')).toBe(false);
    });

    it('does not require CSRF for OPTIONS requests', () => {
      expect(requiresCsrfValidation('OPTIONS', '/api/v1/bookings')).toBe(false);
    });

    it('exempts payment webhook endpoints', () => {
      expect(requiresCsrfValidation('POST', '/api/v1/payments/webhook')).toBe(false);
    });

    it('exempts channel sync webhook endpoints', () => {
      expect(requiresCsrfValidation('POST', '/api/v1/channels/sync/webhook')).toBe(false);
    });

    it('exempts internal endpoints', () => {
      expect(requiresCsrfValidation('POST', '/api/v1/internal/events/emit')).toBe(false);
    });

    it('does not require CSRF for non-API paths', () => {
      expect(requiresCsrfValidation('POST', '/login')).toBe(false);
    });
  });

  describe('constants', () => {
    it('has the correct cookie name', () => {
      expect(CSRF_COOKIE_NAME).toBe('__csrf_token');
    });

    it('has the correct header name', () => {
      expect(CSRF_HEADER_NAME).toBe('x-csrf-token');
    });
  });
});
