/**
 * POST /api/v1/notifications/messages — Send a guest message.
 * GET  /api/v1/notifications/messages — List messages for a booking/guest.
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */

import { NextRequest } from 'next/server';
import {
  sendMessage,
  listMessages,
  MessagingError,
} from '@/modules/notifications/messaging/service';
import type {
  SendMessageRequest,
  MessageDirection,
  MessageChannel,
} from '@/modules/notifications/messaging/types';

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

    const body = (await request.json()) as SendMessageRequest;

    // Basic request validation
    if (!body.bookingId || !body.guestId || !body.message) {
      return Response.json(
        { error: 'bookingId, guestId, and message are required' },
        { status: 400 }
      );
    }

    if (!body.direction || !['inbound', 'outbound'].includes(body.direction)) {
      return Response.json(
        { error: 'direction must be "inbound" or "outbound"' },
        { status: 400 }
      );
    }

    if (!body.channel || !['in_app', 'email', 'whatsapp', 'telegram'].includes(body.channel)) {
      return Response.json(
        { error: 'channel must be one of: in_app, email, whatsapp, telegram' },
        { status: 400 }
      );
    }

    const result = await sendMessage(
      tenantId,
      body,
      actorUserId,
      actorRole
    );

    return Response.json({ message: result }, { status: 201 });
  } catch (error) {
    if (error instanceof MessagingError) {
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
    const bookingId = searchParams.get('bookingId');
    const guestId = searchParams.get('guestId');
    const direction = searchParams.get('direction') as MessageDirection | null;
    const channel = searchParams.get('channel') as MessageChannel | null;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // At least one filter is required
    if (!bookingId && !guestId) {
      return Response.json(
        { error: 'Either bookingId or guestId query parameter is required' },
        { status: 400 }
      );
    }

    const result = await listMessages(tenantId, {
      ...(bookingId && { bookingId }),
      ...(guestId && { guestId }),
      ...(direction && { direction }),
      ...(channel && { channel }),
      ...(limit && { limit: parseInt(limit, 10) }),
      ...(offset && { offset: parseInt(offset, 10) }),
    });

    return Response.json({
      messages: result.messages,
      total: result.total,
    });
  } catch (error) {
    if (error instanceof MessagingError) {
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
