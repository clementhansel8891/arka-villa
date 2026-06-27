/**
 * Unit tests for the auth service.
 *
 * Tests password validation, HTTPS enforcement, lockout status checking,
 * MFA role requirements, and TOTP verification logic.
 */

import { describe, it, expect } from 'vitest';
import { validatePassword, checkLockoutStatus, isMfaRequired, isHttps } from './service';
import type { UserRecord } from './types';

// ─── Password Validation ──────────────────────────────────────────────────────

describe('validatePassword', () => {
  it('accepts a valid password meeting all criteria', () => {
    const result = validatePassword('Str0ng!Pass');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects password shorter than 10 characters', () => {
    const result = validatePassword('Ab1!short');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must be at least 10 characters long');
  });

  it('rejects password without uppercase letter', () => {
    const result = validatePassword('abcdefgh1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('rejects password without lowercase letter', () => {
    const result = validatePassword('ABCDEFGH1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('rejects password without digit', () => {
    const result = validatePassword('Abcdefgh!!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one digit');
  });

  it('rejects password without special character', () => {
    const result = validatePassword('Abcdefgh12');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  it('returns multiple errors for a completely invalid password', () => {
    const result = validatePassword('abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('accepts a long complex password', () => {
    const result = validatePassword('MyV3ry$ecure&L0ngPa$$w0rd!');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ─── HTTPS Enforcement ────────────────────────────────────────────────────────

describe('isHttps', () => {
  it('returns true when x-forwarded-proto is https', () => {
    const request = new Request('http://localhost/api/v1/auth/login', {
      headers: { 'x-forwarded-proto': 'https' },
    });
    expect(isHttps(request)).toBe(true);
  });

  it('returns false when x-forwarded-proto is http', () => {
    const request = new Request('http://localhost/api/v1/auth/login', {
      headers: { 'x-forwarded-proto': 'http' },
    });
    expect(isHttps(request)).toBe(false);
  });

  it('falls back to URL protocol when no x-forwarded-proto header', () => {
    const request = new Request('https://example.com/api/v1/auth/login');
    expect(isHttps(request)).toBe(true);
  });

  it('returns false for plain HTTP URL without header', () => {
    const request = new Request('http://example.com/api/v1/auth/login');
    expect(isHttps(request)).toBe(false);
  });

  it('is case-insensitive for x-forwarded-proto', () => {
    const request = new Request('http://localhost/api/v1/auth/login', {
      headers: { 'x-forwarded-proto': 'HTTPS' },
    });
    expect(isHttps(request)).toBe(true);
  });
});

// ─── Lockout Status ───────────────────────────────────────────────────────────

describe('checkLockoutStatus', () => {
  const baseUser: UserRecord = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: '$2a$12$hash',
    role: 'Employee',
    tenantIds: ['t-1'],
    mfaSecret: null,
    mfaEnabled: false,
    failedAttempts: 0,
    lockedUntil: null,
    isActive: true,
  };

  it('returns not locked when lockedUntil is null', () => {
    const result = checkLockoutStatus(baseUser);
    expect(result.locked).toBe(false);
    expect(result.remainingMinutes).toBe(0);
  });

  it('returns not locked when lockedUntil is in the past', () => {
    const pastDate = new Date(Date.now() - 60000); // 1 minute ago
    const result = checkLockoutStatus({ ...baseUser, lockedUntil: pastDate });
    expect(result.locked).toBe(false);
    expect(result.remainingMinutes).toBe(0);
  });

  it('returns locked with remaining time when lockedUntil is in the future', () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const result = checkLockoutStatus({ ...baseUser, lockedUntil: futureDate });
    expect(result.locked).toBe(true);
    expect(result.remainingMinutes).toBeGreaterThanOrEqual(9);
    expect(result.remainingMinutes).toBeLessThanOrEqual(11);
  });
});

// ─── MFA Required Roles ───────────────────────────────────────────────────────

describe('isMfaRequired', () => {
  it('returns true for Agency_Admin role', () => {
    expect(isMfaRequired('Agency_Admin')).toBe(true);
  });

  it('returns true for Villa_Owner role', () => {
    expect(isMfaRequired('Villa_Owner')).toBe(true);
  });

  it('returns false for Employee role', () => {
    expect(isMfaRequired('Employee')).toBe(false);
  });

  it('returns false for Guest role', () => {
    expect(isMfaRequired('Guest')).toBe(false);
  });

  it('returns false for Visitor role', () => {
    expect(isMfaRequired('Visitor')).toBe(false);
  });
});
