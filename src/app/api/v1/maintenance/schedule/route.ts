/**
 * GET /api/v1/maintenance/schedule — Get recurring maintenance schedule.
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 11.4
 */

import { type NextRequest } from 'next/server';
import {
  getRecurringSchedule,
  MaintenanceError,
} from '@/modules/maintenance';

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
    const activeOnly = searchParams.get('activeOnly') !== 'false';
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const schedule = await getRecurringSchedule(tenantId, {
      activeOnly,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    return Response.json({ schedule });
  } catch (error) {
    if (error instanceof MaintenanceError) {
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
