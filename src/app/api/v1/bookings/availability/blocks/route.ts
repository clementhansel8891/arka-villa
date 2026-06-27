/**
 * POST /api/v1/bookings/availability/blocks — Create an availability block.
 * DELETE /api/v1/bookings/availability/blocks — Remove an availability block.
 *
 * POST body:
 * - roomId: string (required)
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * - reason: 'seasonal' | 'maintenance' | 'owner_hold' | 'manual' (required)
 * - notes: string (optional)
 * - bulk: boolean (optional, if true expects roomIds[] instead of roomId)
 * - roomIds: string[] (required if bulk=true)
 *
 * DELETE query params:
 * - blockId: string (required)
 *
 * Requirements: 5.1, 5.2, 5.5
 */

import { NextRequest } from 'next/server';
import {
  createBlock,
  createBulkBlock,
  removeBlock,
  listBlocks,
  AvailabilityManagementError,
} from '@/modules/bookings/availability-management';

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

    const body = await request.json();

    // Bulk block: multiple rooms at once
    if (body.bulk === true) {
      const result = await createBulkBlock(
        tenantId,
        {
          roomIds: body.roomIds,
          startDate: body.startDate,
          endDate: body.endDate,
          reason: body.reason,
          notes: body.notes,
        },
        actorUserId,
        actorRole
      );

      return Response.json(
        {
          message: `Created ${result.created.length} block(s), ${result.conflicts.length} conflict(s) detected`,
          created: result.created,
          conflicts: result.conflicts,
        },
        { status: 201 }
      );
    }

    // Single room block
    const block = await createBlock(
      tenantId,
      {
        roomId: body.roomId,
        startDate: body.startDate,
        endDate: body.endDate,
        reason: body.reason,
        notes: body.notes,
      },
      actorUserId,
      actorRole
    );

    return Response.json(
      { message: 'Block created', block },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AvailabilityManagementError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('[POST /api/v1/bookings/availability/blocks]', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const blockId = request.nextUrl.searchParams.get('blockId');
    if (!blockId) {
      return Response.json(
        { error: 'blockId query parameter is required' },
        { status: 400 }
      );
    }

    const block = await removeBlock(tenantId, blockId, actorUserId, actorRole);

    return Response.json({
      message: 'Block removed',
      block,
    });
  } catch (error) {
    if (error instanceof AvailabilityManagementError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('[DELETE /api/v1/bookings/availability/blocks]', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const roomId = request.nextUrl.searchParams.get('roomId') ?? undefined;
    const blocks = await listBlocks(tenantId, roomId);

    return Response.json({
      blocks,
      total: blocks.length,
    });
  } catch (error) {
    if (error instanceof AvailabilityManagementError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    console.error('[GET /api/v1/bookings/availability/blocks]', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
