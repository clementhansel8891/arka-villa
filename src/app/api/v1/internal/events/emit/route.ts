/**
 * POST /api/v1/internal/events/emit — n8n → Event Bus Bridge.
 *
 * Internal-only endpoint that allows n8n workflows to publish events
 * directly to the Redis Streams event bus. Authenticated via an
 * internal service key (not exposed externally).
 *
 * Request body:
 * {
 *   stream: string;       // Target stream name (e.g., "stream:bookings")
 *   event: PlatformEvent; // Full event envelope to publish
 * }
 *
 * Requirements: Related to n8n workflow engine integration in the design.
 */

import { NextRequest } from 'next/server';
import { EventBus, type PlatformEvent, type StreamName, STREAMS, EventValidationError } from '@/lib/events';
import {
  INTERNAL_SERVICE_KEY_HEADER,
  validateInternalServiceKey,
} from '@/lib/workflows';
import { redis, createRedisClient } from '@/lib/db/redis';

/** All valid stream names for validation. */
const VALID_STREAMS = new Set<string>(Object.values(STREAMS));

interface EmitRequestBody {
  stream: string;
  event: PlatformEvent;
}

export async function POST(request: NextRequest) {
  // ─── Authenticate internal service key ───────────────────────────
  const serviceKey = request.headers.get(INTERNAL_SERVICE_KEY_HEADER);
  if (!validateInternalServiceKey(serviceKey)) {
    return Response.json(
      { error: 'Unauthorized: invalid or missing internal service key' },
      { status: 401 }
    );
  }

  // ─── Parse and validate request body ─────────────────────────────
  let body: EmitRequestBody;
  try {
    body = (await request.json()) as EmitRequestBody;
  } catch {
    return Response.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body.stream || !body.event) {
    return Response.json(
      { error: 'Missing required fields: stream, event' },
      { status: 400 }
    );
  }

  // Validate stream name
  if (!VALID_STREAMS.has(body.stream)) {
    return Response.json(
      {
        error: `Invalid stream: "${body.stream}". Valid streams: ${Array.from(VALID_STREAMS).join(', ')}`,
      },
      { status: 400 }
    );
  }

  // ─── Emit the event to the event bus ─────────────────────────────
  try {
    const eventBus = new EventBus({ publisher: redis, subscriber: createRedisClient() });

    const messageId = await eventBus.emit(
      body.stream as StreamName,
      body.event
    );

    return Response.json(
      {
        success: true,
        messageId,
        stream: body.stream,
        eventId: body.event.id,
        eventType: body.event.type,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof EventValidationError) {
      return Response.json(
        { error: `Event validation failed: ${error.message}` },
        { status: 422 }
      );
    }

    console.error('[internal/events/emit] Failed to emit event:', error);
    return Response.json(
      { error: 'Failed to emit event to stream' },
      { status: 500 }
    );
  }
}
