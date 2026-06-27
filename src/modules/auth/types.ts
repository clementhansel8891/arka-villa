/**
 * Authentication module types.
 *
 * Defines interfaces for login, session management, MFA,
 * and account lockout in the multi-tenant platform.
 */

import type { PlatformRole } from '@/lib/middleware/types';

/** Credentials submitted to the login endpoint. */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Result of a successful authentication (pre-MFA). */
export interface AuthResult {
  /** Whether MFA verification is required before session is active. */
  mfaRequired: boolean;
  /** Temporary token issued when MFA is pending (short-lived). */
  mfaPendingToken?: string;
  /** Session token (JWT) issued when MFA is not required or already verified. */
  sessionToken?: string;
  /** User ID */
  userId: string;
  /** User's role */
  role: PlatformRole;
}

/** MFA verification request body. */
export interface MfaVerifyRequest {
  /** The pending MFA token from the login step. */
  mfaPendingToken: string;
  /** TOTP code from the authenticator app. */
  totpCode: string;
}

/** MFA verification result. */
export interface MfaVerifyResult {
  sessionToken: string;
  userId: string;
  role: PlatformRole;
}

/** Stored user record from the database (auth-relevant fields). */
export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: PlatformRole;
  tenantIds: string[];
  mfaSecret: string | null;
  mfaEnabled: boolean;
  failedAttempts: number;
  lockedUntil: Date | null;
  isActive: boolean;
}

/** Session data stored in Redis. */
export interface SessionData {
  userId: string;
  role: PlatformRole;
  tenantIds: string[];
  sessionId: string;
  createdAt: string;
  expiresAt: string;
}

/** Password validation result with specific failure reasons. */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/** Account lockout status. */
export interface LockoutStatus {
  locked: boolean;
  remainingMinutes: number;
}
