import { describe, it, expect } from 'vitest';
import {
  validateContentType,
  validatePayloadSize,
  validateFieldLength,
  validateRequest,
  scanForThreats,
  detectSqlInjection,
  detectXss,
  getPayloadCategory,
  PAYLOAD_LIMITS,
} from './input-validation';

describe('Input Validation', () => {
  describe('getPayloadCategory', () => {
    it('returns fileUpload for upload paths', () => {
      expect(getPayloadCategory('/api/v1/maintenance/upload')).toBe('fileUpload');
      expect(getPayloadCategory('/api/v1/tasks/photos')).toBe('fileUpload');
    });

    it('returns aiChat for AI paths', () => {
      expect(getPayloadCategory('/api/v1/ai/chat')).toBe('aiChat');
      expect(getPayloadCategory('/api/v1/ai/tools')).toBe('aiChat');
    });

    it('returns auth for auth paths', () => {
      expect(getPayloadCategory('/api/v1/auth/login')).toBe('auth');
      expect(getPayloadCategory('/api/v1/auth/mfa/verify')).toBe('auth');
    });

    it('returns webhook for webhook paths', () => {
      expect(getPayloadCategory('/api/v1/payments/webhook')).toBe('webhook');
    });

    it('returns default for standard paths', () => {
      expect(getPayloadCategory('/api/v1/bookings')).toBe('default');
      expect(getPayloadCategory('/api/v1/tenants')).toBe('default');
    });
  });

  describe('validateContentType', () => {
    it('accepts application/json', () => {
      const result = validateContentType('application/json', 'POST');
      expect(result.valid).toBe(true);
    });

    it('accepts multipart/form-data with boundary', () => {
      const result = validateContentType(
        'multipart/form-data; boundary=----WebKitFormBoundary',
        'POST'
      );
      expect(result.valid).toBe(true);
    });

    it('accepts application/x-www-form-urlencoded', () => {
      const result = validateContentType('application/x-www-form-urlencoded', 'POST');
      expect(result.valid).toBe(true);
    });

    it('rejects text/plain', () => {
      const result = validateContentType('text/plain', 'POST');
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(415);
    });

    it('rejects missing content-type for POST', () => {
      const result = validateContentType(null, 'POST');
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(415);
    });

    it('skips validation for GET requests', () => {
      const result = validateContentType(null, 'GET');
      expect(result.valid).toBe(true);
    });

    it('skips validation for DELETE requests', () => {
      const result = validateContentType(null, 'DELETE');
      expect(result.valid).toBe(true);
    });

    it('accepts content-type with charset parameter', () => {
      const result = validateContentType('application/json; charset=utf-8', 'POST');
      expect(result.valid).toBe(true);
    });
  });

  describe('validatePayloadSize', () => {
    it('accepts payloads within limits', () => {
      const result = validatePayloadSize(1024, '/api/v1/bookings');
      expect(result.valid).toBe(true);
    });

    it('rejects payloads exceeding default limit', () => {
      const result = validatePayloadSize(
        PAYLOAD_LIMITS.default + 1,
        '/api/v1/bookings'
      );
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(413);
    });

    it('applies file upload limit for upload paths', () => {
      // Just under the 10MB limit
      const result = validatePayloadSize(
        PAYLOAD_LIMITS.fileUpload - 1,
        '/api/v1/maintenance/upload'
      );
      expect(result.valid).toBe(true);
    });

    it('rejects file uploads exceeding 10MB', () => {
      const result = validatePayloadSize(
        PAYLOAD_LIMITS.fileUpload + 1,
        '/api/v1/maintenance/upload'
      );
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(413);
    });

    it('applies AI chat limit for AI paths', () => {
      const result = validatePayloadSize(
        PAYLOAD_LIMITS.aiChat + 1,
        '/api/v1/ai/chat'
      );
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(413);
    });

    it('accepts null content length', () => {
      const result = validatePayloadSize(null, '/api/v1/bookings');
      expect(result.valid).toBe(true);
    });

    it('accepts zero content length', () => {
      const result = validatePayloadSize(0, '/api/v1/bookings');
      expect(result.valid).toBe(true);
    });
  });

  describe('detectSqlInjection', () => {
    it('detects SELECT statement', () => {
      expect(detectSqlInjection("'; SELECT * FROM users --")).toBe(true);
    });

    it('detects UNION SELECT', () => {
      expect(detectSqlInjection("' UNION SELECT username, password FROM users")).toBe(true);
    });

    it('detects OR 1=1 pattern', () => {
      expect(detectSqlInjection("' OR 1=1")).toBe(true);
    });

    it('detects DROP TABLE', () => {
      expect(detectSqlInjection("; DROP TABLE users;")).toBe(true);
    });

    it('detects SQL comments', () => {
      expect(detectSqlInjection("admin'--")).toBe(true);
    });

    it('detects SLEEP function', () => {
      expect(detectSqlInjection("'; SLEEP(5);--")).toBe(true);
    });

    it('does not flag normal text', () => {
      expect(detectSqlInjection('Hello, how are you?')).toBe(false);
    });

    it('does not flag normal emails', () => {
      expect(detectSqlInjection('user@example.com')).toBe(false);
    });

    it('does not flag normal names', () => {
      expect(detectSqlInjection("O'Brien")).toBe(false);
    });
  });

  describe('detectXss', () => {
    it('detects script tags', () => {
      expect(detectXss('<script>alert("xss")</script>')).toBe(true);
    });

    it('detects javascript: protocol', () => {
      expect(detectXss('javascript:alert(1)')).toBe(true);
    });

    it('detects event handlers', () => {
      expect(detectXss('<img onerror="alert(1)" src=x>')).toBe(true);
    });

    it('detects iframe injection', () => {
      expect(detectXss('<iframe src="http://evil.com">')).toBe(true);
    });

    it('detects data: text/html', () => {
      expect(detectXss('data:text/html,<script>alert(1)</script>')).toBe(true);
    });

    it('does not flag normal HTML-like content', () => {
      expect(detectXss('The value is less than 5')).toBe(false);
    });

    it('does not flag normal text with angle brackets', () => {
      expect(detectXss('Price: $100 -> $90')).toBe(false);
    });
  });

  describe('scanForThreats', () => {
    it('reports safe for clean input', () => {
      const result = scanForThreats({ name: 'John', email: 'john@example.com' });
      expect(result.safe).toBe(true);
      expect(result.threats).toHaveLength(0);
    });

    it('detects SQL injection in nested objects', () => {
      const result = scanForThreats({
        booking: {
          notes: "'; DROP TABLE bookings; --",
        },
      });
      expect(result.safe).toBe(false);
      expect(result.threats[0]).toContain('SQL injection');
    });

    it('detects XSS in arrays', () => {
      const result = scanForThreats({
        tags: ['normal', '<script>alert(1)</script>'],
      });
      expect(result.safe).toBe(false);
      expect(result.threats[0]).toContain('XSS');
    });

    it('handles null and undefined values', () => {
      const result = scanForThreats({ a: null, b: undefined, c: 42 });
      expect(result.safe).toBe(true);
    });

    it('scans deeply nested structures', () => {
      const result = scanForThreats({
        level1: {
          level2: {
            level3: "' UNION SELECT * FROM users",
          },
        },
      });
      expect(result.safe).toBe(false);
    });
  });

  describe('validateFieldLength', () => {
    it('accepts strings within limit', () => {
      const result = validateFieldLength('hello', 10, 'name');
      expect(result.valid).toBe(true);
    });

    it('rejects strings exceeding limit', () => {
      const result = validateFieldLength('a'.repeat(101), 100, 'description');
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.reason).toContain('description');
    });

    it('accepts strings at exact limit', () => {
      const result = validateFieldLength('a'.repeat(100), 100, 'field');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateRequest', () => {
    it('validates a complete clean request', () => {
      const result = validateRequest({
        pathname: '/api/v1/bookings',
        method: 'POST',
        contentType: 'application/json',
        contentLength: 256,
        body: { guestName: 'John', checkIn: '2024-01-01' },
      });
      expect(result.valid).toBe(true);
    });

    it('rejects request with bad content-type', () => {
      const result = validateRequest({
        pathname: '/api/v1/bookings',
        method: 'POST',
        contentType: 'text/xml',
        contentLength: 256,
      });
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(415);
    });

    it('rejects request exceeding size limit', () => {
      const result = validateRequest({
        pathname: '/api/v1/bookings',
        method: 'POST',
        contentType: 'application/json',
        contentLength: 2 * 1024 * 1024, // 2MB, exceeds 1MB default
      });
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(413);
    });

    it('rejects request with malicious body', () => {
      const result = validateRequest({
        pathname: '/api/v1/bookings',
        method: 'POST',
        contentType: 'application/json',
        contentLength: 100,
        body: { notes: "'; DROP TABLE bookings; --" },
      });
      expect(result.valid).toBe(false);
      expect(result.statusCode).toBe(400);
    });
  });
});
