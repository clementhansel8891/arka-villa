/**
 * AI Agent Service — business logic for chat, tool invocation,
 * and context building.
 *
 * Communicates with the external LLM Agent running at AI_AGENT_URL.
 * Enforces 30-second timeout, 50KB payload limit, and 4000 char truncation.
 * Validates RBAC permissions before executing tool calls.
 *
 * Requirements: 29.1, 29.3, 29.4, 29.5, 29.6, 29.7, 29.8
 */

import { checkPermission } from '@/modules/rbac';
import type {
  AIChatRequest,
  AIChatResponse,
  AIToolRequest,
  AIToolResponse,
  AIUserContext,
  LLMAgentRequest,
  LLMAgentResponse,
  ToolCallResult,
  ToolSchema,
} from './types';
import {
  MAX_PAYLOAD_SIZE_BYTES,
  MAX_RESPONSE_CHARS,
  MAX_RESPONSE_TIME_MS,
  TRUNCATION_INDICATOR,
} from './types';
import { logChatInteraction, logToolInvocation } from './audit';

// ─── Configuration ────────────────────────────────────────────────

/** URL of the external LLM Agent service. */
function getAgentUrl(): string {
  return process.env.AI_AGENT_URL ?? 'http://localhost:8080';
}

// ─── Tool Registry ────────────────────────────────────────────────

/**
 * Registered tools and their schemas.
 * Tools are registered with their RBAC requirements for permission checking.
 */
const toolRegistry = new Map<string, ToolSchema>();

/**
 * Register a tool that the LLM Agent can invoke.
 */
export function registerTool(schema: ToolSchema): void {
  toolRegistry.set(schema.name, schema);
}

/**
 * Get all registered tool schemas (for LLM Agent context).
 */
export function getRegisteredTools(): ToolSchema[] {
  return Array.from(toolRegistry.values());
}

// ─── Default Tools Registration ───────────────────────────────────

/** Register default platform tools available to the LLM Agent. */
function ensureDefaultToolsRegistered(): void {
  if (toolRegistry.size > 0) return;

  registerTool({
    name: 'booking_lookup',
    description: 'Look up booking details by ID or date range',
    requiredResource: 'bookings',
    requiredAction: 'read',
    parametersSchema: {
      type: 'object',
      properties: {
        bookingId: { type: 'string' },
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' },
        tenantId: { type: 'string' },
      },
    },
  });

  registerTool({
    name: 'financial_query',
    description: 'Query financial data including revenue and expenses',
    requiredResource: 'financial_reports',
    requiredAction: 'read',
    parametersSchema: {
      type: 'object',
      properties: {
        reportType: { type: 'string', enum: ['revenue', 'expenses', 'summary'] },
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' },
        tenantId: { type: 'string' },
      },
      required: ['reportType'],
    },
  });

  registerTool({
    name: 'staff_schedule',
    description: 'Query staff schedules and task assignments',
    requiredResource: 'staff_schedules',
    requiredAction: 'read',
    parametersSchema: {
      type: 'object',
      properties: {
        staffId: { type: 'string' },
        date: { type: 'string', format: 'date' },
        tenantId: { type: 'string' },
      },
    },
  });

  registerTool({
    name: 'maintenance_status',
    description: 'Query maintenance tickets and their status',
    requiredResource: 'maintenance_tickets',
    requiredAction: 'read',
    parametersSchema: {
      type: 'object',
      properties: {
        ticketId: { type: 'string' },
        status: { type: 'string', enum: ['open', 'in_progress', 'completed'] },
        tenantId: { type: 'string' },
      },
    },
  });

  registerTool({
    name: 'availability_check',
    description: 'Check room availability for given dates',
    requiredResource: 'bookings',
    requiredAction: 'read',
    parametersSchema: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' },
        tenantId: { type: 'string' },
        roomType: { type: 'string' },
      },
      required: ['dateFrom', 'dateTo'],
    },
  });
}

// ─── Chat Service ─────────────────────────────────────────────────

/**
 * Handle a chat message from a user.
 * Forwards to the LLM Agent with user context, enforcing timeout and size limits.
 *
 * @param chatRequest - The incoming chat request
 * @param userContext - Authenticated user context (role, tenants, permissions)
 * @returns AI chat response with optional tool call results
 */
export async function handleChat(
  chatRequest: AIChatRequest,
  userContext: AIUserContext
): Promise<AIChatResponse> {
  const startTime = Date.now();
  const tenantId = userContext.tenantScope[0] ?? null;

  try {
    // Build the request for the LLM Agent
    const agentRequest: LLMAgentRequest = {
      sessionId: chatRequest.sessionId,
      userId: userContext.userId,
      role: userContext.role,
      tenantScope: userContext.tenantScope,
      message: chatRequest.message,
      conversationHistory: chatRequest.conversationHistory ?? [],
    };

    // Validate payload size (Requirement 29.1)
    const requestPayload = JSON.stringify(agentRequest);
    if (Buffer.byteLength(requestPayload, 'utf-8') > MAX_PAYLOAD_SIZE_BYTES) {
      const responseTimeMs = Date.now() - startTime;
      await logChatInteraction({
        userId: userContext.userId,
        role: userContext.role,
        tenantId,
        responseStatus: 413,
        responseTimeMs,
        truncated: false,
        error: 'Request payload exceeds 50KB limit',
      });
      return {
        message: 'Request payload exceeds the maximum size limit of 50KB.',
        truncated: false,
      };
    }

    // Call the external LLM Agent with timeout (Requirement 29.6)
    const agentResponse = await callLLMAgent(agentRequest);

    // Truncate response if needed (Requirement 30.7 / 4000 chars)
    const { message, truncated } = truncateResponse(agentResponse.message);

    const responseTimeMs = Date.now() - startTime;

    // Audit log the interaction (Requirement 29.7)
    await logChatInteraction({
      userId: userContext.userId,
      role: userContext.role,
      tenantId,
      responseStatus: 200,
      responseTimeMs,
      truncated,
    });

    return {
      message,
      toolCalls: agentResponse.toolCalls,
      truncated,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Determine status code
    const statusCode = errorMessage.includes('timeout') ? 504 : 502;

    await logChatInteraction({
      userId: userContext.userId,
      role: userContext.role,
      tenantId,
      responseStatus: statusCode,
      responseTimeMs,
      truncated: false,
      error: errorMessage,
    });

    throw error;
  }
}

// ─── Tool Invocation Service ──────────────────────────────────────

/**
 * Handle a tool invocation request from the LLM Agent.
 * Validates the tool exists, checks RBAC permissions, then executes.
 *
 * @param toolRequest - The tool call request
 * @param userContext - Authenticated user context for RBAC checking
 * @returns Tool invocation response
 */
export async function handleToolInvocation(
  toolRequest: AIToolRequest,
  userContext: AIUserContext
): Promise<AIToolResponse> {
  const startTime = Date.now();
  const tenantId = userContext.tenantScope[0] ?? null;

  ensureDefaultToolsRegistered();

  const { toolCall } = toolRequest;

  // Validate tool exists in registry
  const toolSchema = toolRegistry.get(toolCall.toolName);
  if (!toolSchema) {
    const responseTimeMs = Date.now() - startTime;
    await logToolInvocation({
      userId: userContext.userId,
      role: userContext.role,
      tenantId,
      toolName: toolCall.toolName,
      authorized: false,
      responseStatus: 404,
      responseTimeMs,
      error: 'Tool not found',
    });

    return {
      result: {
        id: toolCall.id,
        toolName: toolCall.toolName,
        result: null,
        authorized: false,
        error: `Tool '${toolCall.toolName}' is not registered`,
      },
    };
  }

  // Validate parameters against schema
  const validationError = validateToolParameters(toolCall.parameters, toolSchema);
  if (validationError) {
    const responseTimeMs = Date.now() - startTime;
    await logToolInvocation({
      userId: userContext.userId,
      role: userContext.role,
      tenantId,
      toolName: toolCall.toolName,
      authorized: false,
      responseStatus: 400,
      responseTimeMs,
      error: validationError,
    });

    return {
      result: {
        id: toolCall.id,
        toolName: toolCall.toolName,
        result: null,
        authorized: false,
        error: validationError,
      },
    };
  }

  // RBAC validation (Requirement 29.5)
  const permissionResult = await checkPermission({
    userId: userContext.userId,
    role: userContext.role,
    resource: toolSchema.requiredResource,
    action: toolSchema.requiredAction,
    tenantId: tenantId ?? undefined,
    userTenantIds: userContext.tenantScope,
  });

  if (!permissionResult.allowed) {
    const responseTimeMs = Date.now() - startTime;
    await logToolInvocation({
      userId: userContext.userId,
      role: userContext.role,
      tenantId,
      toolName: toolCall.toolName,
      authorized: false,
      responseStatus: 403,
      responseTimeMs,
      error: permissionResult.reason,
    });

    return {
      result: {
        id: toolCall.id,
        toolName: toolCall.toolName,
        result: null,
        authorized: false,
        error: `Insufficient permissions: ${permissionResult.reason}`,
      },
    };
  }

  // Execute the tool via the LLM Agent
  try {
    const toolResult = await executeToolViaAgent(toolCall.toolName, toolCall.parameters);

    const responseTimeMs = Date.now() - startTime;
    await logToolInvocation({
      userId: userContext.userId,
      role: userContext.role,
      tenantId,
      toolName: toolCall.toolName,
      authorized: true,
      responseStatus: 200,
      responseTimeMs,
    });

    return {
      result: {
        id: toolCall.id,
        toolName: toolCall.toolName,
        result: toolResult,
        authorized: true,
      },
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';

    await logToolInvocation({
      userId: userContext.userId,
      role: userContext.role,
      tenantId,
      toolName: toolCall.toolName,
      authorized: true,
      responseStatus: 500,
      responseTimeMs,
      error: errorMessage,
    });

    return {
      result: {
        id: toolCall.id,
        toolName: toolCall.toolName,
        result: null,
        authorized: true,
        error: errorMessage,
      },
    };
  }
}

// ─── Context Building ─────────────────────────────────────────────

/**
 * Build user context from authenticated session information.
 * This context is passed with every AI request (Requirement 29.3).
 */
export function buildUserContext(params: {
  userId: string;
  role: AIUserContext['role'];
  tenantScope: string[];
  permissions: string[];
}): AIUserContext {
  return {
    userId: params.userId,
    role: params.role,
    tenantScope: params.tenantScope,
    permissions: params.permissions,
  };
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Call the external LLM Agent with timeout enforcement.
 * Requirement 29.6: 30-second max response time.
 */
async function callLLMAgent(request: LLMAgentRequest): Promise<LLMAgentResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MAX_RESPONSE_TIME_MS);

  try {
    const response = await fetch(`${getAgentUrl()}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`LLM Agent returned status ${response.status}`);
    }

    const responseBody = await response.text();

    // Validate response payload size (Requirement 29.1)
    if (Buffer.byteLength(responseBody, 'utf-8') > MAX_PAYLOAD_SIZE_BYTES) {
      throw new Error('LLM Agent response exceeds 50KB payload limit');
    }

    return JSON.parse(responseBody) as LLMAgentResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('LLM Agent request timeout: response not received within 30 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute a tool call via the LLM Agent's tool execution endpoint.
 */
async function executeToolViaAgent(
  toolName: string,
  parameters: Record<string, unknown>
): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MAX_RESPONSE_TIME_MS);

  try {
    const response = await fetch(`${getAgentUrl()}/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, parameters }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Tool execution failed with status ${response.status}`);
    }

    const responseBody = await response.text();

    // Validate response payload size
    if (Buffer.byteLength(responseBody, 'utf-8') > MAX_PAYLOAD_SIZE_BYTES) {
      throw new Error('Tool response exceeds 50KB payload limit');
    }

    const result = JSON.parse(responseBody);
    return result.data ?? result;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Tool execution timeout: response not received within 30 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Truncate a response to 4000 characters with indicator.
 * Requirement 30.7: max 4000 chars per response.
 */
function truncateResponse(message: string): { message: string; truncated: boolean } {
  if (message.length <= MAX_RESPONSE_CHARS) {
    return { message, truncated: false };
  }

  const truncatedMessage =
    message.slice(0, MAX_RESPONSE_CHARS - TRUNCATION_INDICATOR.length) + TRUNCATION_INDICATOR;

  return { message: truncatedMessage, truncated: true };
}

/**
 * Validate tool call parameters against the tool's schema.
 * Basic validation — checks required fields exist.
 */
function validateToolParameters(
  parameters: Record<string, unknown>,
  schema: ToolSchema
): string | null {
  const paramsSchema = schema.parametersSchema;

  if (!paramsSchema || typeof paramsSchema !== 'object') {
    return null; // No schema to validate against
  }

  // Check required fields
  const required = (paramsSchema as { required?: string[] }).required;
  if (required && Array.isArray(required)) {
    for (const field of required) {
      if (!(field in parameters) || parameters[field] === undefined) {
        return `Missing required parameter: '${field}'`;
      }
    }
  }

  // Check that provided fields match declared properties
  const properties = (paramsSchema as { properties?: Record<string, unknown> }).properties;
  if (properties) {
    for (const key of Object.keys(parameters)) {
      if (!(key in properties)) {
        return `Unknown parameter: '${key}'`;
      }
    }
  }

  return null;
}
