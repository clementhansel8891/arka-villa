/**
 * POST /api/v1/notifications/send — Multi-channel notification dispatch.
 *
 * Dispatches notifications to users via in-app, email, and WhatsApp channels
 * based on user preferences and notification priority classification.
 *
 * - Critical: immediate delivery on ALL enabled channels (within 30 seconds)
 * - Non-urgent: queued into daily digest (default 08:00 local time)
 *
 * Retry: 3 attempts with exponential backoff, then fallback to next channel.
 * Priority order: in_app > email > whatsapp
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 */

import { NextRequest } from 'next/server';
import {
  sendNotification,
  type SendNotificationRequest,
} from '@/modules/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<SendNotificationRequest>;

    // Validate required fields
    const validationError = validateRequest(body);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const sendRequest: SendNotificationRequest = {
      userIds: body.userIds!,
      tenantId: body.tenantId!,
      eventType: body.eventType!,
      priority: body.priority!,
      title: body.title!,
      body: body.body!,
      metadata: body.metadata,
    };

    const result = await sendNotification(sendRequest);

    return Response.json(
      {
        dispatched: result.dispatched,
        digestQueued: result.digestQueued,
        results: result.results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[POST /api/v1/notifications/send] Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Validate the send notification request body.
 * Returns an error message string if invalid, or null if valid.
 */
function validateRequest(body: Partial<SendNotificationRequest>): string | null {
  if (!body.userIds || !Array.isArray(body.userIds) || body.userIds.length === 0) {
    return '"userIds" must be a non-empty array of user IDs';
  }

  if (!body.tenantId || typeof body.tenantId !== 'string') {
    return '"tenantId" is required and must be a string';
  }

  if (!body.eventType || typeof body.eventType !== 'string') {
    return '"eventType" is required and must be a string';
  }

  if (!body.priority || !['critical', 'non_urgent'].includes(body.priority)) {
    return '"priority" is required and must be "critical" or "non_urgent"';
  }

  if (!body.title || typeof body.title !== 'string') {
    return '"title" is required and must be a string';
  }

  if (!body.body || typeof body.body !== 'string') {
    return '"body" is required and must be a string';
  }

  return null;
}
