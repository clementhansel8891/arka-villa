/**
 * GET /api/v1/staff/schedule — Get daily schedule for an employee.
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirement 10.6: Daily schedule sorted by priority (High > Medium > Low).
 *
 * Query params:
 * - userId (required): Employee ID
 * - date (optional): Date in YYYY-MM-DD format, defaults to today
 */

import { NextRequest } from 'next/server';
import { getSchedule, StaffError, type GetScheduleQuery } from '@/modules/staff';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId) {
      return Response.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    const query: GetScheduleQuery = {
      userId,
      ...(date && { date }),
    };

    const schedule = await getSchedule(tenantId, query);

    return Response.json({
      attendance: schedule.attendance,
      tasks: schedule.tasks,
    });
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
