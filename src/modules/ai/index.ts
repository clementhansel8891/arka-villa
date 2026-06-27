/**
 * AI Module
 *
 * AI Agent API interface providing chat and tool invocation endpoints.
 * Handles communication with the external LLM Agent, RBAC validation,
 * API key authentication, audit logging, rate limiting, input sanitization,
 * and response validation.
 *
 * Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6, 29.7, 29.8, 30.1, 30.2, 30.3, 30.4, 30.6, 30.7, 30.8
 */

export * from './types';
export {
  handleChat,
  handleToolInvocation,
  buildUserContext,
  registerTool,
  getRegisteredTools,
} from './service';
export {
  createApiKey,
  validateApiKey,
  revokeApiKey,
  rotateApiKey,
  keyNeedsRotation,
  getKeysForDashboard,
} from './api-key';
export {
  logChatInteraction,
  logToolInvocation,
  queryAuditLogs,
  getInteractionCount,
} from './audit';
export {
  containsDangerousPatterns,
  resetRateLimitStore,
  getRateLimitForRole,
  getCurrentRequestCount,
  RATE_LIMITS,
  RATE_LIMIT_WINDOW_MS,
} from './security';
export type { SanitizeResult } from './security';
export {
  checkAIRateLimit,
  suspendAIAccess,
  isAISuspended,
  getRateLimitConfig,
} from './rate-limiter';
export type { AIRateLimitResult } from './rate-limiter';
export {
  sanitizeInput,
  trackRejection,
  resetRejectionCounter,
  getRejectionCount,
} from './sanitizer';
export type { SanitizationResult, InjectionType, SuspensionCheckResult } from './sanitizer';
export {
  validateResponse,
  validateToolCallResponse,
  checkTenantScopeViolations,
} from './response-validator';
export type { ResponseValidationResult, ToolCallValidationResult } from './response-validator';
