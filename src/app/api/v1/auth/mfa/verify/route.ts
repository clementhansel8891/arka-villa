/**
 * POST /api/v1/auth/mfa/verify
 *
 * Verifies a TOTP code for MFA-required accounts (Agency_Admin, Villa_Owner).
 * Exchanges the MFA pending token + valid TOTP for a full session token.
 *
 * Requirements: 14.2
 */

import { isHttps, verifyMfa } from '@/modules/auth';

export async function POST(request: Request): Promise<Response> {
  // Enforce HTTPS
  if (!isHttps(request)) {
    return Response.json(
      { error: 'HTTPS is required for authentication' },
      { status: 403 }
    );
  }

  // Parse request body
  let body: { mfaPendingToken?: string; totpCode?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { mfaPendingToken, totpCode } = body;

  // Validate required fields
  if (!mfaPendingToken || typeof mfaPendingToken !== 'string') {
    return Response.json(
      { error: 'MFA pending token is required' },
      { status: 400 }
    );
  }

  if (!totpCode || typeof totpCode !== 'string') {
    return Response.json(
      { error: 'TOTP code is required' },
      { status: 400 }
    );
  }

  // Validate TOTP code format (6 digits)
  if (!/^\d{6}$/.test(totpCode)) {
    return Response.json(
      { error: 'TOTP code must be 6 digits' },
      { status: 400 }
    );
  }

  // Verify MFA
  const result = await verifyMfa(mfaPendingToken, totpCode);

  if (!result) {
    return Response.json(
      { error: 'Invalid or expired MFA token, or incorrect TOTP code' },
      { status: 401 }
    );
  }

  return Response.json(
    {
      sessionToken: result.sessionToken,
      userId: result.userId,
      role: result.role,
    },
    { status: 200 }
  );
}
