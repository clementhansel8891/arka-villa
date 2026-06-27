/**
 * PATCH /api/v1/bookings/:id — Modify or cancel a booking.
 * GET   /api/v1/bookings/:id — Get a single booking.
 *
 * Supports date modifications, room changes, status transitions
 * (pending→confirmed, confirmed→cancelled, confirmed→completed),
 * and payment status updates.
 *
 * Requirements: 5.2, 5.5, 5.7
 */

import { NextRequest } from 'next/server';
import {
  modifyBooking,
  getBooking,
  BookingError,
  type ModifyBookingRequest,
} from '@/modules/bookings';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: RouteParams) {
  try {
    const { id } = await ctx.params;

    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const actorUserId = request.headers.get('x-user-id') ?? 'system';
    const actorRole = request.headers.get('x-user-role') ?? 'Agency_Admin';

    const body = (await request.json()) as ModifyBookingRequest;

    // Validate at least one field is being updated
    const hasUpdate =
      body.checkIn !== undefined ||
      body.checkOut !== undefined ||
      body.roomId !== undefined ||
      body.status !== undefined ||
      body.paymentStatus !== undefined ||
      body.numGuests !== undefined ||
      body.specialRequests !== undefined;

    if (!hasUpdate) {
      return Response.json(
        { error: 'At least one field must be provided for modification' },
        { status: 400 }
      );
    }

    const booking = await modifyBooking(
      tenantId,
      id,
      body,
      actorUserId,
      actorRole
    );

    return Response.json({ booking });
  } catch (error) {
    if (error instanceof BookingError) {
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

export async function GET(request: NextRequest, ctx: RouteParams) {
  try {
    const { id } = await ctx.params;

    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const booking = await getBooking(tenantId, id);

    return Response.json({ booking });
  } catch (error) {
    if (error instanceof BookingError) {
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
