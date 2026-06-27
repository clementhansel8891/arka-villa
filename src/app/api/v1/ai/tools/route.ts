/**
 * POST /api/v1/ai/tools
 *
 * Handles LLM Agent tool invocation requests.
 * Validates the tool call against RBAC permissions before executing.
 * Enforces payload limits and timeout constraints.
 *
 * Requirements: 29.1, 29.2, 29.4, 29.5, 29.6, 29.7, 29.8
 */

import type { NextRequest } from 'next/server';
import {
  handleToolInvocation,
  validateApiKey,
  buildUserContext,
  MAX_PAYLOAD_SIZE_BYTES,
} from '@/modules/ai';
import type { AIToolRequest } from '@/modules/ai';
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
  let body: AIToolRequest;
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
  if (!body.toolCall || typeof body.toolCall !== 'object') {
    return Response.json(
      { error: 'toolCall object is required.' },
      { status: 400 }
    );
  }

  if (!body.toolCall.id || typeof body.toolCall.id !== 'string') {
    return Response.json(
      { error: 'toolCall.id is required and must be a string.' },
      { status: 400 }
    );
  }

  if (!body.toolCall.toolName || typeof body.toolCall.toolName !== 'string') {
    return Response.json(
      { error: 'toolCall.toolName is required and must be a string.' },
      { status: 400 }
    );
  }

  if (!body.toolCall.parameters || typeof body.toolCall.parameters !== 'object') {
    return Response.json(
      { error: 'toolCall.parameters is required and must be an object.' },
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
    permissions: [],
  });

  // ─── Handle Tool Invocation ───────────────────────────────────
  try {
    const response = await handleToolInvocation(body, userContext);

    // Determine HTTP status based on authorization result
    const httpStatus = response.result.authorized ? 200 : 403;

    // Check response payload size (Requirement 29.1)
    const responseJson = JSON.stringify(response);
    if (Buffer.byteLength(responseJson, 'utf-8') > MAX_PAYLOAD_SIZE_BYTES) {
      return Response.json(
        { error: 'Response payload exceeds the maximum size limit of 50KB.' },
        { status: 502 }
      );
    }

    return Response.json(response, { status: httpStatus });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    // Timeout error (Requirement 29.6)
    if (errorMessage.includes('timeout')) {
      return Response.json(
        {
          error: 'Tool invocation did not complete within the allowed time limit.',
          code: 'TIMEOUT',
          elapsed,
        },
        { status: 504 }
      );
    }

    // Generic error
    return Response.json(
      {
        error: 'Tool invocation failed.',
        code: 'EXECUTION_ERROR',
      },
      { status: 500 }
    );
  }
}
