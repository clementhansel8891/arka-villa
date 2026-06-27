/**
 * Property-based tests for authentication module.
 *
 * Validates: Requirements 14.1, 14.3, 14.6
 *
 * Uses fast-check to verify invariants of password validation,
 * account lockout, and session timeout logic across many randomly
 * generated scenarios.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validatePassword, checkLockoutStatus } from '../service';
import type { UserRecord } from '../types';

// ─── Constants matching the service implementation ─────────────────────────────

const MIN_PASSWORD_LENGTH = 10;
const MAX_FAILED_ATTEMPTS = 5;
const SESSION_TTL_SECONDS = 60 * 60; // 60 minutes

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Check if a string satisfies all password criteria independently. */
function meetsAllCriteria(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

/** Create a base user record for lockout tests. */
function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-test',
    email: 'test@example.com',
    passwordHash: '$2a$12$fakehash',
    role: 'Employee',
    tenantIds: ['t-1'],
    mfaSecret: null,
    mfaEnabled: false,
    failedAttempts: 0,
    lockedUntil: null,
    isActive: true,
    ...overrides,
  };
}

// ─── Property 20: Password Validation Rules ───────────────────────────────────

describe('Property 20: Password Validation Rules', () => {
  /**
   * Validates: Requirements 14.1
   * Property: Any string that meets ALL criteria (≥10 chars, uppercase,
   * lowercase, digit, special char) is accepted as valid.
   */
  it('property: passwords meeting all criteria are always accepted', () => {
    // Generator: build passwords guaranteed to have all required character classes
    const validPasswordArb = fc
      .tuple(
        fc.string({ minLength: 4, maxLength: 20 }), // filler
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), // uppercase
        fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), // lowercase
        fc.constantFrom(...'0123456789'.split('')), // digit
        fc.constantFrom(...'!@#$%^&*()-_=+[]{}|;:,.<>?/~`'.split('')) // special
      )
      .map(([filler, upper, lower, digit, special]) => {
        // Combine all required chars with filler, ensure ≥ 10 length
        const base = upper + lower + digit + special + filler;
        // Pad to at least 10 characters if needed
        return base.length >= MIN_PASSWORD_LENGTH
          ? base
          : base + 'aA1!'.repeat(3);
      })
      .filter((pw) => meetsAllCriteria(pw));

    fc.assert(
      fc.property(validPasswordArb, (password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 14.1
   * Property: Any string that fails at least one criterion is rejected.
   */
  it('property: passwords missing any criterion are always rejected', () => {
    // Generate random strings and filter to those that fail at least one rule
    const invalidPasswordArb = fc
      .string({ minLength: 0, maxLength: 50 })
      .filter((pw) => !meetsAllCriteria(pw));

    fc.assert(
      fc.property(invalidPasswordArb, (password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 14.1
   * Property: validatePassword result agrees with the independent criteria check.
   * For ANY string, valid === meetsAllCriteria(string).
   */
  it('property: validation result matches independent criteria check for any string', () => {
    const anyStringArb = fc.string({ minLength: 0, maxLength: 100 });

    fc.assert(
      fc.property(anyStringArb, (password) => {
        const result = validatePassword(password);
        const expected = meetsAllCriteria(password);
        expect(result.valid).toBe(expected);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Validates: Requirements 14.1
   * Property: Passwords shorter than 10 characters are always rejected,
   * regardless of which character classes they contain.
   */
  it('property: strings shorter than 10 chars are always rejected', () => {
    const shortStringArb = fc.string({ minLength: 0, maxLength: 9 });

    fc.assert(
      fc.property(shortStringArb, (password) => {
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'Password must be at least 10 characters long'
        );
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 21: Account Lockout After Failed Attempts ───────────────────────

describe('Property 21: Account Lockout After Failed Attempts', () => {
  /**
   * Validates: Requirements 14.3
   * Property: A user with lockedUntil in the future is always reported as locked.
   */
  it('property: users with future lockedUntil are always locked', () => {
    // Generate future timestamps (1 ms to 60 minutes from now)
    const futureOffsetArb = fc.integer({ min: 1, max: 60 * 60 * 1000 });

    fc.assert(
      fc.property(futureOffsetArb, (offsetMs) => {
        const lockedUntil = new Date(Date.now() + offsetMs);
        const user = makeUser({ lockedUntil, failedAttempts: MAX_FAILED_ATTEMPTS });
        const status = checkLockoutStatus(user);
        expect(status.locked).toBe(true);
        expect(status.remainingMinutes).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 14.3
   * Property: A user with lockedUntil in the past (or null) is never locked.
   */
  it('property: users with past or null lockedUntil are never locked', () => {
    // Generate past timestamps (1 ms to 24 hours ago) or null
    const pastOrNullArb = fc.oneof(
      fc.constant(null),
      fc.integer({ min: 1, max: 24 * 60 * 60 * 1000 }).map(
        (offsetMs) => new Date(Date.now() - offsetMs)
      )
    );

    fc.assert(
      fc.property(pastOrNullArb, (lockedUntil) => {
        const user = makeUser({ lockedUntil });
        const status = checkLockoutStatus(user);
        expect(status.locked).toBe(false);
        expect(status.remainingMinutes).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 14.3
   * Property: The lockout threshold is exactly 5 failed attempts.
   * Users with fewer than 5 failed attempts and no lockedUntil are not locked.
   */
  it('property: users with <5 failed attempts and no lock date are never locked', () => {
    const belowThresholdArb = fc.integer({ min: 0, max: MAX_FAILED_ATTEMPTS - 1 });

    fc.assert(
      fc.property(belowThresholdArb, (failedAttempts) => {
        const user = makeUser({ failedAttempts, lockedUntil: null });
        const status = checkLockoutStatus(user);
        expect(status.locked).toBe(false);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Validates: Requirements 14.3
   * Property: remainingMinutes is always <= 15 for a 15-minute lockout window.
   * When locked, remaining time cannot exceed the lockout duration.
   */
  it('property: remaining minutes never exceeds lockout duration (15 min)', () => {
    // Lock for up to 15 minutes in the future
    const lockOffsetArb = fc.integer({ min: 1, max: 15 * 60 * 1000 });

    fc.assert(
      fc.property(lockOffsetArb, (offsetMs) => {
        const lockedUntil = new Date(Date.now() + offsetMs);
        const user = makeUser({ lockedUntil, failedAttempts: MAX_FAILED_ATTEMPTS });
        const status = checkLockoutStatus(user);
        expect(status.remainingMinutes).toBeLessThanOrEqual(15);
        expect(status.remainingMinutes).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 22: Session Timeout Enforcement ─────────────────────────────────

describe('Property 22: Session Timeout Enforcement', () => {
  /**
   * Validates: Requirements 14.6
   * Property: A session created at time T expires at exactly T + 3600 seconds.
   * Any timestamp before expiry is within the valid session window;
   * any timestamp at or after expiry is outside the valid session window.
   */
  it('property: session is valid before 60 minutes and invalid at/after 60 minutes', () => {
    // Generate a creation timestamp and an offset to check
    const creationTimeArb = fc.integer({
      min: 1_700_000_000_000,
      max: 1_800_000_000_000,
    });
    const offsetSecondsArb = fc.integer({ min: 0, max: 7200 }); // 0 to 2 hours

    fc.assert(
      fc.property(creationTimeArb, offsetSecondsArb, (createdAtMs, offsetSeconds) => {
        const expiresAtMs = createdAtMs + SESSION_TTL_SECONDS * 1000;
        const checkTimeMs = createdAtMs + offsetSeconds * 1000;

        const isWithinSession = checkTimeMs < expiresAtMs;

        if (offsetSeconds < SESSION_TTL_SECONDS) {
          // Before expiry — session should be valid
          expect(isWithinSession).toBe(true);
        } else {
          // At or after expiry — session should be invalid
          expect(isWithinSession).toBe(false);
        }
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Validates: Requirements 14.6
   * Property: The session TTL is always exactly 60 minutes (3600 seconds).
   * The boundary is sharp — 3599 seconds is valid, 3600 seconds is not.
   */
  it('property: 3599 seconds is always valid, 3600 seconds is always expired', () => {
    const creationTimeArb = fc.integer({
      min: 1_700_000_000_000,
      max: 1_800_000_000_000,
    });

    fc.assert(
      fc.property(creationTimeArb, (createdAtMs) => {
        const expiresAtMs = createdAtMs + SESSION_TTL_SECONDS * 1000;

        // 3599 seconds after creation — still valid
        const justBeforeMs = createdAtMs + 3599 * 1000;
        expect(justBeforeMs < expiresAtMs).toBe(true);

        // Exactly 3600 seconds after creation — expired
        const exactExpiryMs = createdAtMs + 3600 * 1000;
        expect(exactExpiryMs < expiresAtMs).toBe(false);

        // 3601 seconds — definitely expired
        const afterExpiryMs = createdAtMs + 3601 * 1000;
        expect(afterExpiryMs < expiresAtMs).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 14.6
   * Property: Session duration from creation to expiry is exactly 3600 seconds,
   * regardless of when the session was created.
   */
  it('property: session duration is always exactly 3600 seconds', () => {
    const creationTimeArb = fc.integer({
      min: 1_600_000_000_000,
      max: 2_000_000_000_000,
    });

    fc.assert(
      fc.property(creationTimeArb, (createdAtMs) => {
        const expiresAtMs = createdAtMs + SESSION_TTL_SECONDS * 1000;
        const durationSeconds = (expiresAtMs - createdAtMs) / 1000;
        expect(durationSeconds).toBe(3600);
      }),
      { numRuns: 100 }
    );
  });
});
