/**
 * POST /api/v1/ai/chat
 *
 * Handles user messages sent to the AI Agent.
 * Authenticates via API key, builds user context, forwards to LLM Agent,
 * and returns the response within 30 seconds.
 *
 * Requirements: 29.1, 29.2, 29.3, 29.6, 29.7, 29.8
 */

import type { NextRequest } from 'next/server';
import {
  handleChat,
  validateApiKey,
  buildUserContext,
  MAX_PAYLOAD_SIZE_BYTES,
} from '@/modules/ai';
import type { AIChatRequest } from '@/modules/ai';
import { MIDDLEWARE_HEADERS } from '@/lib/middleware/types';
import type { PlatformRole } from '@/lib/middleware/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now();

  // ─── API Key Authentication (Requirement 29.2) ────────────────
  const apiKey = request.headers.get('x-api-key') ?? request.headers.get('authorization')?.replace('Bearer ', '');
  if (!apiKey) {
    return Response.json(
      { error: 'Missing API key. Provide via x-api-key header or Bearer token.' },
      { status: 401 }
    );
  }

  const validKey = await validateApiKey(apiKey);
  if (!validKey) {
    return Response.json(
      { error: 'Invalid or expired API key.' },
      { status: 401 }
    );
  }

  // ─── Extract User Context (Requirement 29.3) ──────────────────
  const userId = request.headers.get(MIDDLEWARE_HEADERS.USER_ID);
  const userRole = request.headers.get(MIDDLEWARE_HEADERS.USER_ROLE) as PlatformRole | null;

  if (!userId || !userRole) {
    return Response.json(
      { error: 'User context is required. Ensure authentication middleware is active.' },
      { status: 401 }
    );
  }

  // ─── Payload Size Check (Requirement 29.1) ────────────────────
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE_BYTES) {
    return Response.json(
      { error: 'Request payload exceeds the maximum size limit of 50KB.' },
      { status: 413 }
    );
  }

  // ─── Parse Request Body ───────────────────────────────────────
  let body: AIChatRequest;
  try {
    const rawBody = await request.text();

    // Double-check actual payload size
    if (Buffer.byteLength(rawBody, 'utf-8') > MAX_PAYLOAD_SIZE_BYTES) {
      return Response.json(
        { error: 'Request payload exceeds the maximum size limit of 50KB.' },
        { status: 413 }
      );
    }

    body = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { error: 'Invalid request body. Expected valid JSON.' },
      { status: 400 }
    );
  }

  // ─── Validate Required Fields ─────────────────────────────────
  if (!body.sessionId || typeof body.sessionId !== 'string') {
    return Response.json(
      { error: 'sessionId is required and must be a string.' },
      { status: 400 }
    );
  }

  if (!body.message || typeof body.message !== 'string') {
    return Response.json(
      { error: 'message is required and must be a string.' },
      { status: 400 }
    );
  }

  // ─── Build User Context ───────────────────────────────────────
  const tenantId = request.headers.get(MIDDLEWARE_HEADERS.TENANT_ID);
  const tenantScope = tenantId ? [tenantId] : [];

  const userContext = buildUserContext({
    userId,
    role: userRole,
    tenantScope,
    permissions: [], // Permissions are resolved by RBAC module during tool calls
  });

  // ─── Handle Chat Request ──────────────────────────────────────
  try {
    const response = await handleChat(body, userContext);

    return Response.json(response, { status: 200 });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    // Timeout error (Requirement 29.6)
    if (errorMessage.includes('timeout')) {
      return Response.json(
        {
          error: 'The AI Agent did not respond within the allowed time limit.',
          code: 'TIMEOUT',
          elapsed,
        },
        { status: 504 }
      );
    }

    // Generic upstream error
    return Response.json(
      {
        error: 'Failed to get response from AI Agent.',
        code: 'UPSTREAM_ERROR',
      },
      { status: 502 }
    );
  }
}
