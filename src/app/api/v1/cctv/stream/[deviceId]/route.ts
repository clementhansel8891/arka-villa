/**
 * GET /api/v1/cctv/stream/:deviceId — Live video feed proxy.
 *
 * Returns stream URL and status for a CCTV camera device.
 * Proxies RTSP/HLS feeds from the Frigate NVR container.
 * Enforces RBAC: Agency_Admin all cameras, Villa_Owner own villa,
 * Employee only with explicit grant.
 *
 * When feed is unavailable, returns last captured frame info
 * for the interruption overlay display.
 *
 * Requirements: 36.1, 36.2, 36.6, 36.7, 36.8
 */

import { type NextRequest } from 'next/server';
import {
  getStreamProxy,
  CCTVError,
  type CCTVAccessContext,
  type CCTVRole,
} from '@/modules/cctv';

type RouteParams = { params: Promise<{ deviceId: string }> };

export async function GET(request: NextRequest, ctx: RouteParams) {
  try {
    const { deviceId } = await ctx.params;

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

    const streamResult = await getStreamProxy(tenantId, deviceId, accessContext);

    return Response.json({ stream: streamResult });
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
