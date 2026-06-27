/**
 * Auth module barrel export.
 *
 * Provides authentication, session management, MFA verification,
 * password hashing, and account lockout functionality.
 */

export {
  validatePassword,
  hashPassword,
  verifyPassword,
  checkLockoutStatus,
  handleFailedAttempt,
  createSession,
  invalidateSession,
  verifySession,
  isMfaRequired,
  verifyMfa,
  verifyTotp,
  isHttps,
  login,
} from './service';

export type {
  LoginCredentials,
  AuthResult,
  MfaVerifyRequest,
  MfaVerifyResult,
  UserRecord,
  SessionData,
  PasswordValidationResult,
  LockoutStatus,
} from './types';
