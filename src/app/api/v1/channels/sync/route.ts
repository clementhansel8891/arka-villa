/**
 * POST /api/v1/channels/sync — Trigger manual channel synchronization.
 *
 * Allows Agency_Admin to manually trigger sync for specified or all channels.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 6.1, 6.4, 6.5
 */

import { NextRequest } from 'next/server';
import {
  triggerManualSync,
  ChannelError,
  type ManualSyncRequest,
} from '@/modules/channels';

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
    const actorRole = request.headers.get('x-user-role') ?? 'Agency_Admin';

    const body = (await request.json()) as ManualSyncRequest;

    const result = await triggerManualSync(
      tenantId,
      body.channelIds,
      body.operations,
      actorUserId,
      actorRole
    );

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ChannelError) {
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
