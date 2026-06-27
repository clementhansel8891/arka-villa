/**
 * POST /api/v1/bookings — Create a new booking.
 * GET  /api/v1/bookings — List bookings for a tenant.
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 5.2, 5.4, 5.7, 5.8
 */

import { NextRequest } from 'next/server';
import {
  createBooking,
  getBookings,
  BookingError,
  type CreateBookingRequest,
  type BookingStatus,
} from '@/modules/bookings';

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
    const actorRole = request.headers.get('x-user-role') ?? 'Guest';

    const body = (await request.json()) as CreateBookingRequest;

    const result = await createBooking(tenantId, body, actorUserId, actorRole);

    return Response.json(
      {
        booking: result.booking,
        pricing: result.pricing,
      },
      { status: 201 }
    );
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
    const status = searchParams.get('status') as BookingStatus | null;
    const roomId = searchParams.get('roomId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const result = await getBookings(tenantId, {
      ...(status && { status }),
      ...(roomId && { roomId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(limit && { limit: parseInt(limit, 10) }),
      ...(offset && { offset: parseInt(offset, 10) }),
    });

    return Response.json({
      bookings: result.bookings,
      total: result.total,
    });
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
