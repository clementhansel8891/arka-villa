/**
 * GET /api/v1/cctv/recordings — Historical CCTV recording playback.
 *
 * Browse recordings by camera, date, and time range.
 * Enforces RBAC: Agency_Admin all cameras, Villa_Owner own villa,
 * Employee only with explicit grant.
 *
 * Query params:
 *   - deviceId: filter by camera device ID
 *   - date: filter by date (YYYY-MM-DD)
 *   - startTime: filter recordings starting at or after (ISO 8601)
 *   - endTime: filter recordings ending at or before (ISO 8601)
 *   - limit: max results (default 50)
 *   - offset: pagination offset (default 0)
 *
 * Requirements: 36.4, 36.7
 */

import { type NextRequest } from 'next/server';
import {
  getRecordings,
  CCTVError,
  type CCTVAccessContext,
  type CCTVRole,
  type GetRecordingsRequest,
} from '@/modules/cctv';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const userId = request.headers.get('x-user-id') ?? '';
    const role = (request.headers.get('x-user-role') ?? '') as CCTVRole;

    // Build access context from headers
    const ownedVillasHeader = request.headers.get('x-owned-villa-ids');
    const ownedVillaIds = ownedVillasHeader
      ? ownedVillasHeader.split(',').map((id) => id.trim())
      : undefined;

    const hasCctvGrant = request.headers.get('x-cctv-grant') === 'true';

    const accessContext: CCTVAccessContext = {
      userId,
      role,
      tenantId,
      ownedVillaIds,
      hasCctvGrant,
    };

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const recordingsRequest: GetRecordingsRequest = {
      deviceId: searchParams.get('deviceId') ?? undefined,
      date: searchParams.get('date') ?? undefined,
      startTime: searchParams.get('startTime') ?? undefined,
      endTime: searchParams.get('endTime') ?? undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!, 10)
        : undefined,
    };

    const recordings = await getRecordings(
      tenantId,
      recordingsRequest,
      accessContext
    );

    return Response.json({ recordings });
  } catch (error) {
    if (error instanceof CCTVError) {
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
