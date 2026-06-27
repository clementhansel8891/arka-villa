/**
 * GET /api/v1/iot/status — Device status overview per villa (grouped by type).
 *
 * Returns device counts and status breakdown grouped by device type.
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 35.2
 */

import { type NextRequest } from 'next/server';
import { getDeviceStatusOverview, IoTError } from '@/modules/iot';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const overview = await getDeviceStatusOverview(tenantId);

    // Calculate totals
    const totals = overview.reduce(
      (acc, group) => ({
        total: acc.total + group.total,
        online: acc.online + group.online,
        offline: acc.offline + group.offline,
        error: acc.error + group.error,
      }),
      { total: 0, online: 0, offline: 0, error: 0 }
    );

    return Response.json({
      overview,
      totals,
    });
  } catch (error) {
    if (error instanceof IoTError) {
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
