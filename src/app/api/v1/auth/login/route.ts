/**
 * POST /api/v1/auth/login
 *
 * Authenticates a user with email and password.
 * Returns a session token or an MFA pending token if MFA is required.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.8
 */

import { isHttps, login } from '@/modules/auth';

export async function POST(request: Request): Promise<Response> {
  // Enforce HTTPS (Requirement 14.5, 14.8)
  if (!isHttps(request)) {
    return Response.json(
      { error: 'HTTPS is required for authentication' },
      { status: 403 }
    );
  }

  // Parse request body
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { email, password } = body;

  // Validate required fields
  if (!email || typeof email !== 'string') {
    return Response.json(
      { error: 'Email is required' },
      { status: 400 }
    );
  }

  if (!password || typeof password !== 'string') {
    return Response.json(
      { error: 'Password is required' },
      { status: 400 }
    );
  }

  // Perform login
  const result = await login(email.trim().toLowerCase(), password);

  if (!result.success) {
    return Response.json(
      { error: result.error },
      { status: result.statusCode }
    );
  }

  // Return auth result
  const authResult = result.result;

  if (authResult.mfaRequired) {
    return Response.json(
      {
        mfaRequired: true,
        mfaPendingToken: authResult.mfaPendingToken,
        message: 'MFA verification required. Submit TOTP code to /api/v1/auth/mfa/verify',
      },
      { status: 200 }
    );
  }

  // Full session — set cookie and return token
  const response = Response.json(
    {
      mfaRequired: false,
      sessionToken: authResult.sessionToken,
      userId: authResult.userId,
      role: authResult.role,
    },
    { status: 200 }
  );

  return response;
}
