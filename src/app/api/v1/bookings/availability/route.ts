/**
 * GET /api/v1/bookings/availability — Get availability calendar.
 *
 * Returns per-room, per-day availability status (available, booked, blocked)
 * for the specified date range. Supports optional room filtering.
 *
 * Query params:
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * - roomId: UUID (optional, filter to single room)
 *
 * Requirements: 5.1, 5.10
 */

import { NextRequest } from 'next/server';
import { checkAvailability, BookingError } from '@/modules/bookings';

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const roomId = searchParams.get('roomId');

    if (!startDate || !endDate) {
      return Response.json(
        { error: 'startDate and endDate query parameters are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return Response.json(
        { error: 'Dates must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    const entries = await checkAvailability(tenantId, {
      startDate,
      endDate,
      ...(roomId && { roomId }),
    });

    return Response.json({
      startDate,
      endDate,
      entries,
      totalEntries: entries.length,
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
