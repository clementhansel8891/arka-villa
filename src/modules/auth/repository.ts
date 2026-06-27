/**
 * Auth repository — database queries for user authentication.
 *
 * All queries operate on the `public` schema since user accounts
 * are shared across tenants.
 */

import { pool } from '@/lib/db/pool';
import type { UserRecord } from './types';
import type { PlatformRole } from '@/lib/middleware/types';

/**
 * Fetch a user by email for authentication.
 * Returns null if no user matches.
 */
export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await pool.query(
    `SELECT
       id,
       email,
       password_hash AS "passwordHash",
       role,
       tenant_ids AS "tenantIds",
       mfa_secret AS "mfaSecret",
       mfa_enabled AS "mfaEnabled",
       failed_attempts AS "failedAttempts",
       locked_until AS "lockedUntil",
       is_active AS "isActive"
     FROM public.users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role as PlatformRole,
    tenantIds: row.tenantIds ?? [],
    mfaSecret: row.mfaSecret ?? null,
    mfaEnabled: row.mfaEnabled ?? false,
    failedAttempts: row.failedAttempts ?? 0,
    lockedUntil: row.lockedUntil ? new Date(row.lockedUntil) : null,
    isActive: row.isActive ?? true,
  };
}

/**
 * Increment the failed login attempt counter for a user.
 */
export async function incrementFailedAttempts(userId: string): Promise<number> {
  const result = await pool.query(
    `UPDATE public.users
     SET failed_attempts = failed_attempts + 1
     WHERE id = $1
     RETURNING failed_attempts AS "failedAttempts"`,
    [userId]
  );
  return result.rows[0]?.failedAttempts ?? 0;
}

/**
 * Lock a user account until the specified time.
 */
export async function lockAccount(userId: string, lockedUntil: Date): Promise<void> {
  await pool.query(
    `UPDATE public.users
     SET locked_until = $2
     WHERE id = $1`,
    [userId, lockedUntil]
  );
}

/**
 * Reset failed attempts counter and clear account lock after successful login.
 */
export async function resetFailedAttempts(userId: string): Promise<void> {
  await pool.query(
    `UPDATE public.users
     SET failed_attempts = 0, locked_until = NULL
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Fetch a user by ID (for session/token validation).
 */
export async function findUserById(userId: string): Promise<UserRecord | null> {
  const result = await pool.query(
    `SELECT
       id,
       email,
       password_hash AS "passwordHash",
       role,
       tenant_ids AS "tenantIds",
       mfa_secret AS "mfaSecret",
       mfa_enabled AS "mfaEnabled",
       failed_attempts AS "failedAttempts",
       locked_until AS "lockedUntil",
       is_active AS "isActive"
     FROM public.users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role as PlatformRole,
    tenantIds: row.tenantIds ?? [],
    mfaSecret: row.mfaSecret ?? null,
    mfaEnabled: row.mfaEnabled ?? false,
    failedAttempts: row.failedAttempts ?? 0,
    lockedUntil: row.lockedUntil ? new Date(row.lockedUntil) : null,
    isActive: row.isActive ?? true,
  };
}
