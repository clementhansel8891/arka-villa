/**
 * POST /api/v1/auth/logout
 *
 * Invalidates the current session by removing it from Redis.
 *
 * Requirements: 14.6
 */

import { validateJwt } from '@/lib/middleware/jwt-validator';
import { invalidateSession, isHttps } from '@/modules/auth';

export async function POST(request: Request): Promise<Response> {
  // Enforce HTTPS
  if (!isHttps(request)) {
    return Response.json(
      { error: 'HTTPS is required' },
      { status: 403 }
    );
  }

  // Extract token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json(
      { error: 'No session token provided' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);

  // Validate the JWT to extract session ID
  const session = await validateJwt(token);
  if (!session) {
    return Response.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    );
  }

  // Invalidate session in Redis
  await invalidateSession(session.sessionId);

  return Response.json(
    { message: 'Logged out successfully' },
    { status: 200 }
  );
}
