/**
 * POST /api/v1/staff/clock-out — Record employee clock-out.
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirement 10.5: Timestamp rounded to nearest minute.
 */

import { NextRequest } from 'next/server';
import { clockOut, StaffError, type ClockOutRequest } from '@/modules/staff';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const actorUserId = request.headers.get('x-user-id') ?? 'system';
    const actorRole = request.headers.get('x-user-role') ?? 'Employee';

    const body = (await request.json()) as ClockOutRequest;

    const attendance = await clockOut(tenantId, body, actorUserId, actorRole);

    return Response.json({ attendance });
  } catch (error) {
    if (error instanceof StaffError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
