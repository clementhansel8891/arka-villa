/**
 * Tests for JWT validation and signing.
 */

import { describe, it, expect } from 'vitest';
import { validateJwt, signJwt } from './jwt-validator';

describe('signJwt and validateJwt', () => {
  it('signs and validates a valid token', async () => {
    const payload = {
      userId: 'user-123',
      role: 'Agency_Admin' as const,
      tenantIds: ['tenant-abc'],
      sessionId: 'sess-001',
    };

    const token = await signJwt(payload);
    expect(token).toBeDefined();
    expect(token.split('.')).toHaveLength(3);

    const session = await validateJwt(token);
    expect(session).not.toBeNull();
    expect(session!.userId).toBe('user-123');
    expect(session!.role).toBe('Agency_Admin');
    expect(session!.tenantIds).toEqual(['tenant-abc']);
    expect(session!.sessionId).toBe('sess-001');
  });

  it('includes iat and exp in the token', async () => {
    const payload = {
      userId: 'user-123',
      role: 'Employee' as const,
      tenantIds: [],
      sessionId: 'sess-002',
    };

    const token = await signJwt(payload);
    const session = await validateJwt(token);
    expect(session).not.toBeNull();
    expect(session!.iat).toBeGreaterThan(0);
    expect(session!.exp).toBeGreaterThan(session!.iat);
  });

  it('returns null for expired tokens', async () => {
    const payload = {
      userId: 'user-123',
      role: 'Guest' as const,
      tenantIds: [],
      sessionId: 'sess-003',
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
    };

    const token = await signJwt(payload);
    const session = await validateJwt(token);
    expect(session).toBeNull();
  });

  it('returns null for invalid token format', async () => {
    expect(await validateJwt('')).toBeNull();
    expect(await validateJwt('not.a.valid.jwt')).toBeNull();
    expect(await validateJwt('abc')).toBeNull();
  });

  it('returns null for tampered token', async () => {
    const payload = {
      userId: 'user-123',
      role: 'Agency_Admin' as const,
      tenantIds: [],
      sessionId: 'sess-004',
    };

    const token = await signJwt(payload);
    // Tamper with the payload
    const parts = token.split('.');
    parts[1] = parts[1] + 'tampered';
    const tamperedToken = parts.join('.');

    const session = await validateJwt(tamperedToken);
    expect(session).toBeNull();
  });

  it('returns null for token missing required fields', async () => {
    // Create a token with missing userId by manually constructing
    const malformedPayload = {
      role: 'Guest',
      sessionId: 'sess-005',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    // We can't easily create a signed token without userId through signJwt,
    // but we can test the validation logic by creating a manually structured token
    // For this test, we verify that signJwt always includes userId
    const token = await signJwt({
      userId: '',
      role: 'Guest' as const,
      tenantIds: [],
      sessionId: 'sess-005',
    });

    // Empty userId should fail validation
    const session = await validateJwt(token);
    expect(session).toBeNull();
  });
});
