/**
 * AI Agent API types.
 *
 * Defines the request/response interfaces for the AI Agent API,
 * tool invocation protocol, API key management, and audit structures.
 *
 * Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6, 29.7, 29.8
 */

import type { PlatformRole } from '@/lib/middleware/types';

// ─── User Context ─────────────────────────────────────────────────

/** User context passed with every AI request (Requirement 29.3). */
export interface AIUserContext {
  /** User's unique ID. */
  userId: string;
  /** User's platform role. */
  role: PlatformRole;
  /** Tenant IDs the user is authorized to access. */
  tenantScope: string[];
  /** Resolved permissions for the user's role. */
  permissions: string[];
}

// ─── Chat Interface ───────────────────────────────────────────────

/** Chat message in conversation history. */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/** Incoming chat request from the platform (POST /api/v1/ai/chat). */
export interface AIChatRequest {
  /** Session ID grouping a conversation. */
  sessionId: string;
  /** User's message content. */
  message: string;
  /** Previous conversation messages for context. */
  conversationHistory?: ChatMessage[];
}

/** Response from the LLM Agent for a chat request. */
export interface AIChatResponse {
  /** The AI-generated response message. */
  message: string;
  /** Tool calls made during response generation. */
  toolCalls?: ToolCallResult[];
  /** Whether the response was truncated (4000 char limit). */
  truncated: boolean;
}

// ─── Tool Invocation Protocol (Requirement 29.4, 29.5) ────────────

/** A tool call from the LLM Agent requesting platform data. */
export interface ToolCall {
  /** Unique ID for this tool call. */
  id: string;
  /** Name of the tool to invoke (e.g., 'booking_lookup'). */
  toolName: string;
  /** Parameters for the tool call, validated against schema. */
  parameters: Record<string, unknown>;
}

/** Tool invocation request (POST /api/v1/ai/tools). */
export interface AIToolRequest {
  /** The tool call to execute. */
  toolCall: ToolCall;
}

/** Result of a tool invocation. */
export interface ToolCallResult {
  /** Tool call ID (matches the request). */
  id: string;
  /** Name of the tool invoked. */
  toolName: string;
  /** The result data from executing the tool. */
  result: unknown;
  /** Whether the user was authorized for this tool call. */
  authorized: boolean;
  /** Error message if the tool call failed. */
  error?: string;
}

/** Tool invocation response (POST /api/v1/ai/tools). */
export interface AIToolResponse {
  /** Result of the tool invocation. */
  result: ToolCallResult;
}

// ─── Tool Schema Definition ───────────────────────────────────────

/** Schema definition for a registered tool. */
export interface ToolSchema {
  /** Tool name (must be unique). */
  name: string;
  /** Human-readable description. */
  description: string;
  /** Required platform resource for RBAC check. */
  requiredResource: string;
  /** Required action for RBAC check. */
  requiredAction: 'create' | 'read' | 'update' | 'delete';
  /** JSON Schema for parameters validation. */
  parametersSchema: Record<string, unknown>;
}

// ─── API Key Management (Requirement 29.2) ────────────────────────

/** Dashboard types that each get distinct API keys. */
export type DashboardType =
  | 'agency_dashboard'
  | 'owner_portal'
  | 'employee_dashboard'
  | 'villa_website';

/** An API key record stored in the database. */
export interface AIApiKey {
  /** Unique key identifier. */
  id: string;
  /** The hashed API key value. */
  keyHash: string;
  /** Key prefix for identification (first 8 chars). */
  keyPrefix: string;
  /** Dashboard type this key is issued for. */
  dashboardType: DashboardType;
  /** Tenant ID (for villa_website keys) or null (for shared keys). */
  tenantId: string | null;
  /** When the key was created. */
  createdAt: Date;
  /** When the key expires (90-day rotation). */
  expiresAt: Date;
  /** Whether the key has been revoked. */
  revoked: boolean;
  /** When the key was last used. */
  lastUsedAt: Date | null;
}

/** Input for creating a new API key. */
export interface CreateApiKeyInput {
  dashboardType: DashboardType;
  tenantId?: string;
}

// ─── Audit Logging (Requirement 29.7) ─────────────────────────────

/** Audit log entry for AI interactions. */
export interface AIAuditLogEntry {
  /** Unique log entry ID. */
  id: string;
  /** Timestamp of the interaction. */
  timestamp: string;
  /** User who made the request. */
  userId: string;
  /** User's role. */
  role: PlatformRole;
  /** Tenant context for the request. */
  tenantId: string | null;
  /** Type of AI operation. */
  operationType: 'chat' | 'tool_invocation';
  /** HTTP status code of the response. */
  responseStatus: number;
  /** Time taken to respond in milliseconds. */
  responseTimeMs: number;
  /** Tool name (if tool invocation). */
  toolName?: string;
  /** Whether authorization was granted (for tool calls). */
  authorized?: boolean;
  /** Whether the response was truncated. */
  truncated?: boolean;
  /** Error message if the request failed. */
  error?: string;
}

// ─── Internal LLM Agent Communication ────────────────────────────

/** Request sent to the external LLM Agent service. */
export interface LLMAgentRequest {
  sessionId: string;
  userId: string;
  role: PlatformRole;
  tenantScope: string[];
  message: string;
  conversationHistory: ChatMessage[];
}

/** Response from the external LLM Agent service. */
export interface LLMAgentResponse {
  message: string;
  toolCalls?: ToolCallResult[];
}

// ─── Constants ────────────────────────────────────────────────────

/** Maximum response time before timeout (30 seconds). */
export const MAX_RESPONSE_TIME_MS = 30_000;

/** Maximum payload size in bytes (50KB). */
export const MAX_PAYLOAD_SIZE_BYTES = 50 * 1024;

/** Maximum response character length before truncation. */
export const MAX_RESPONSE_CHARS = 4000;

/** API key rotation interval in days. */
export const API_KEY_ROTATION_DAYS = 90;

/** Audit log retention period in days. */
export const AUDIT_RETENTION_DAYS = 90;

/** Truncation indicator appended when response is cut. */
export const TRUNCATION_INDICATOR = '... [response truncated]';
