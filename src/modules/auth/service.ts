/**
 * Auth service — business logic for authentication, password validation,
 * account lockout, session management, and MFA.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.8
 */

import bcrypt from 'bcryptjs';
import { verify as otplibVerify } from 'otplib';
import { v4 as uuidv4 } from 'uuid';

import { redis } from '@/lib/db/redis';
import { signJwt } from '@/lib/middleware/jwt-validator';
import type { PlatformRole } from '@/lib/middleware/types';
import {
  findUserByEmail,
  incrementFailedAttempts,
  lockAccount,
  resetFailedAttempts,
} from './repository';
import type {
  AuthResult,
  LockoutStatus,
  MfaVerifyResult,
  PasswordValidationResult,
  SessionData,
  UserRecord,
} from './types';

/** Bcrypt cost factor (Requirement 14.4). */
const BCRYPT_COST_FACTOR = 12;

/** Maximum consecutive failed attempts before lockout (Requirement 14.3). */
const MAX_FAILED_ATTEMPTS = 5;

/** Account lockout duration in minutes (Requirement 14.3). */
const LOCKOUT_DURATION_MINUTES = 15;

/** JWT / session TTL in seconds (Requirement 14.6 — 60 minutes). */
const SESSION_TTL_SECONDS = 60 * 60;

/** Redis key prefix for sessions. */
const SESSION_KEY_PREFIX = 'session:';

/** Redis key prefix for MFA pending tokens. */
const MFA_PENDING_PREFIX = 'mfa_pending:';

/** MFA pending token TTL (5 minutes). */
const MFA_PENDING_TTL_SECONDS = 5 * 60;

/** Roles that require MFA (Requirement 14.2). */
const MFA_REQUIRED_ROLES: PlatformRole[] = ['Agency_Admin', 'Villa_Owner'];

// ─── Password Validation ──────────────────────────────────────────────────────

/**
 * Validate a password against the platform's policy (Requirement 14.1).
 * - Minimum 10 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 10) {
    errors.push('Password must be at least 10 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Password Hashing ─────────────────────────────────────────────────────────

/**
 * Hash a password with bcrypt at cost factor 12 (Requirement 14.4).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

/**
 * Compare a plaintext password to a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Account Lockout ──────────────────────────────────────────────────────────

/**
 * Check if an account is currently locked.
 */
export function checkLockoutStatus(user: UserRecord): LockoutStatus {
  if (!user.lockedUntil) {
    return { locked: false, remainingMinutes: 0 };
  }

  const now = new Date();
  if (user.lockedUntil > now) {
    const remainingMs = user.lockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    return { locked: true, remainingMinutes };
  }

  return { locked: false, remainingMinutes: 0 };
}

/**
 * Handle a failed login attempt. Increments counter and locks if threshold reached.
 * Returns whether the account is now locked (Requirement 14.3).
 */
export async function handleFailedAttempt(userId: string): Promise<boolean> {
  const attempts = await incrementFailedAttempts(userId);

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    await lockAccount(userId, lockedUntil);
    return true;
  }

  return false;
}

// ─── Session Management ───────────────────────────────────────────────────────

/**
 * Create a new session in Redis and return a signed JWT.
 */
export async function createSession(user: UserRecord): Promise<string> {
  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  const sessionData: SessionData = {
    userId: user.id,
    role: user.role,
    tenantIds: user.tenantIds,
    sessionId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Store session in Redis with TTL
  await redis.set(
    `${SESSION_KEY_PREFIX}${sessionId}`,
    JSON.stringify(sessionData),
    'EX',
    SESSION_TTL_SECONDS
  );

  // Sign JWT with session data
  const nowEpoch = Math.floor(now.getTime() / 1000);
  const token = await signJwt({
    userId: user.id,
    role: user.role,
    tenantIds: user.tenantIds,
    sessionId,
    iat: nowEpoch,
    exp: nowEpoch + SESSION_TTL_SECONDS,
  });

  return token;
}

/**
 * Invalidate a session by deleting it from Redis.
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await redis.del(`${SESSION_KEY_PREFIX}${sessionId}`);
}

/**
 * Verify a session exists and is valid in Redis.
 */
export async function verifySession(sessionId: string): Promise<SessionData | null> {
  const data = await redis.get(`${SESSION_KEY_PREFIX}${sessionId}`);
  if (!data) {
    return null;
  }
  return JSON.parse(data) as SessionData;
}

// ─── MFA ──────────────────────────────────────────────────────────────────────

/**
 * Check whether MFA is required for the given role (Requirement 14.2).
 */
export function isMfaRequired(role: PlatformRole): boolean {
  return MFA_REQUIRED_ROLES.includes(role);
}

/**
 * Create a temporary MFA pending token stored in Redis.
 * This token is exchanged for a full session after TOTP verification.
 */
export async function createMfaPendingToken(user: UserRecord): Promise<string> {
  const pendingToken = uuidv4();

  const data = {
    userId: user.id,
    role: user.role,
    tenantIds: user.tenantIds,
  };

  await redis.set(
    `${MFA_PENDING_PREFIX}${pendingToken}`,
    JSON.stringify(data),
    'EX',
    MFA_PENDING_TTL_SECONDS
  );

  return pendingToken;
}

/**
 * Verify the TOTP code against the user's MFA secret (RFC 6238).
 */
export async function verifyTotp(secret: string, code: string): Promise<boolean> {
  const result = await otplibVerify({ token: code, secret });
  return result.valid;
}

/**
 * Complete MFA verification: validate token + TOTP, then create session.
 */
export async function verifyMfa(
  mfaPendingToken: string,
  totpCode: string
): Promise<MfaVerifyResult | null> {
  // Retrieve pending MFA data from Redis
  const pendingData = await redis.get(`${MFA_PENDING_PREFIX}${mfaPendingToken}`);
  if (!pendingData) {
    return null; // Token expired or invalid
  }

  const { userId, role, tenantIds } = JSON.parse(pendingData) as {
    userId: string;
    role: PlatformRole;
    tenantIds: string[];
  };

  // Look up user to get MFA secret
  const { findUserById } = await import('./repository');
  const user = await findUserById(userId);
  if (!user || !user.mfaSecret) {
    return null;
  }

  // Verify TOTP code
  if (!(await verifyTotp(user.mfaSecret, totpCode))) {
    return null;
  }

  // TOTP verified — remove pending token and create full session
  await redis.del(`${MFA_PENDING_PREFIX}${mfaPendingToken}`);

  const userForSession: UserRecord = {
    ...user,
    tenantIds,
  };

  const sessionToken = await createSession(userForSession);

  return {
    sessionToken,
    userId,
    role,
  };
}

// ─── Login Flow ───────────────────────────────────────────────────────────────

/**
 * HTTPS enforcement check (Requirement 14.5, 14.8).
 * Checks x-forwarded-proto header set by Nginx or request URL protocol.
 */
export function isHttps(request: Request): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.toLowerCase() === 'https';
  }

  // Fallback: check the request URL itself
  try {
    const url = new URL(request.url);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Main login function orchestrating the full authentication flow.
 *
 * Steps:
 * 1. Validate password format
 * 2. Look up user by email
 * 3. Check lockout status
 * 4. Verify password
 * 5. Handle MFA if required
 * 6. Create session or MFA pending token
 */
export async function login(
  email: string,
  password: string
): Promise<
  | { success: true; result: AuthResult }
  | { success: false; error: string; statusCode: number }
> {
  // Validate password meets policy before checking credentials
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return {
      success: false,
      error: 'Invalid credentials',
      statusCode: 401,
    };
  }

  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    return {
      success: false,
      error: 'Invalid credentials',
      statusCode: 401,
    };
  }

  // Check if account is active
  if (!user.isActive) {
    return {
      success: false,
      error: 'Account is disabled',
      statusCode: 403,
    };
  }

  // Check lockout status
  const lockout = checkLockoutStatus(user);
  if (lockout.locked) {
    return {
      success: false,
      error: `Account is locked. Try again in ${lockout.remainingMinutes} minute(s).`,
      statusCode: 423,
    };
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    const nowLocked = await handleFailedAttempt(user.id);
    if (nowLocked) {
      return {
        success: false,
        error: `Account locked due to too many failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`,
        statusCode: 423,
      };
    }
    return {
      success: false,
      error: 'Invalid credentials',
      statusCode: 401,
    };
  }

  // Password correct — reset failed attempts
  await resetFailedAttempts(user.id);

  // Check if MFA is required
  if (isMfaRequired(user.role) && user.mfaEnabled && user.mfaSecret) {
    const mfaPendingToken = await createMfaPendingToken(user);
    return {
      success: true,
      result: {
        mfaRequired: true,
        mfaPendingToken,
        userId: user.id,
        role: user.role,
      },
    };
  }

  // No MFA needed — create full session
  const sessionToken = await createSession(user);
  return {
    success: true,
    result: {
      mfaRequired: false,
      sessionToken,
      userId: user.id,
      role: user.role,
    },
  };
}
