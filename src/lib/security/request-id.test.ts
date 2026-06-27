import { describe, it, expect } from 'vitest';
import {
  generateRequestId,
  resolveRequestId,
  isValidRequestId,
  REQUEST_ID_HEADER,
} from './request-id';

describe('Request ID', () => {
  describe('generateRequestId', () => {
    it('starts with req_ prefix', () => {
      const id = generateRequestId();
      expect(id.startsWith('req_')).toBe(true);
    });

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
      expect(ids.size).toBe(100);
    });

    it('contains only valid characters', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req_[a-f0-9]+_[a-f0-9]+$/);
    });

    it('has reasonable length', () => {
      const id = generateRequestId();
      // req_ (4) + timestamp hex (~11) + _ (1) + 32 hex chars = ~48
      expect(id.length).toBeGreaterThan(40);
      expect(id.length).toBeLessThan(60);
    });
  });

  describe('resolveRequestId', () => {
    it('returns existing valid ID', () => {
      const existingId = 'trace-abc-123';
      const resolved = resolveRequestId(existingId);
      expect(resolved).toBe(existingId);
    });

    it('generates new ID when existing is null', () => {
      const resolved = resolveRequestId(null);
      expect(resolved.startsWith('req_')).toBe(true);
    });

    it('generates new ID when existing is undefined', () => {
      const resolved = resolveRequestId(undefined);
      expect(resolved.startsWith('req_')).toBe(true);
    });

    it('generates new ID when existing is empty', () => {
      const resolved = resolveRequestId('');
      expect(resolved.startsWith('req_')).toBe(true);
    });

    it('generates new ID when existing is too long', () => {
      const tooLong = 'a'.repeat(200);
      const resolved = resolveRequestId(tooLong);
      expect(resolved.startsWith('req_')).toBe(true);
    });

    it('generates new ID when existing has invalid characters', () => {
      const resolved = resolveRequestId('invalid id with spaces');
      expect(resolved.startsWith('req_')).toBe(true);
    });
  });

  describe('isValidRequestId', () => {
    it('accepts alphanumeric IDs', () => {
      expect(isValidRequestId('abc123')).toBe(true);
    });

    it('accepts IDs with hyphens', () => {
      expect(isValidRequestId('request-abc-123')).toBe(true);
    });

    it('accepts IDs with underscores', () => {
      expect(isValidRequestId('req_12345_abc')).toBe(true);
    });

    it('accepts IDs with colons', () => {
      expect(isValidRequestId('span:12345')).toBe(true);
    });

    it('accepts IDs with dots', () => {
      expect(isValidRequestId('trace.abc.123')).toBe(true);
    });

    it('rejects empty strings', () => {
      expect(isValidRequestId('')).toBe(false);
    });

    it('rejects IDs exceeding max length', () => {
      expect(isValidRequestId('a'.repeat(129))).toBe(false);
    });

    it('rejects IDs with spaces', () => {
      expect(isValidRequestId('has space')).toBe(false);
    });

    it('rejects IDs with special characters', () => {
      expect(isValidRequestId('has<special>')).toBe(false);
    });
  });

  describe('REQUEST_ID_HEADER', () => {
    it('is x-request-id', () => {
      expect(REQUEST_ID_HEADER).toBe('x-request-id');
    });
  });
});
