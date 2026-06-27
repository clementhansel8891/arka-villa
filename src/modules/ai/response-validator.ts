/**
 * AI Response Validator — validates LLM responses against expected
 * schemas, authorized scope, and content safety rules.
 *
 * Blocks responses that:
 * - Reference data outside the user's authorized tenant scope
 * - Contain disallowed content patterns (executable code, harmful content)
 * - Fail tool-call output schema validation
 *
 * Requirements: 30.4, 30.8
 */

import type { AIUserContext, ToolCallResult, ToolSchema } from './types';

// ─── Disallowed Content Patterns ──────────────────────────────────

/**
 * Patterns in LLM responses that indicate unsafe or out-of-scope content.
 */
const DISALLOWED_CONTENT_PATTERNS: RegExp[] = [
  // Executable code blocks that shouldn't appear in responses
  /<script[\s>][\s\S]*?<\/script>/i,
  /javascript\s*:\s*[^\s]/i,
  /data\s*:\s*text\/html/i,

  // Attempts to embed system-level commands
  /\b(sudo|rm\s+-rf|chmod\s+777|curl\s+.*\|\s*sh)\b/i,
  /\b(exec|system|shell_exec|passthru|popen)\s*\(/i,

  // Attempts to reveal sensitive system information
  /\/(etc\/passwd|etc\/shadow|proc\/self)/i,
  /\b(AWS_SECRET|DATABASE_URL|PRIVATE_KEY|api[_-]?key\s*[=:])\b/i,

  // Social engineering patterns in AI responses
  /send\s+(me\s+)?(your|the)\s+(password|credentials|credit\s*card|ssn|social\s*security)/i,
  /click\s+(this|the)\s+link\s+to\s+(verify|confirm|update)\s+(your|account)/i,
];

/**
 * Patterns indicating tenant scope violations in responses.
 * These detect when the response references specific tenant data markers.
 */
const TENANT_REFERENCE_PATTERNS: RegExp[] = [
  /tenant[_-]?id\s*[=:]\s*['"]?([a-f0-9-]+)['"]?/i,
  /schema[_-]?name\s*[=:]\s*['"]?tenant_([a-f0-9-]+)['"]?/i,
];

// ─── Types ────────────────────────────────────────────────────────

/** Result of response validation. */
export interface ResponseValidationResult {
  /** Whether the response is valid and safe to return to the user. */
  valid: boolean;
  /** The validated (or blocked) response message. */
  message: string;
  /** Reasons the response was blocked (empty if valid). */
  violations: string[];
  /** Whether the response was blocked entirely. */
  blocked: boolean;
}

/** Result of tool-call response validation. */
export interface ToolCallValidationResult {
  /** Whether the tool-call response is valid. */
  valid: boolean;
  /** The validated tool call result. */
  result: ToolCallResult;
  /** Violations found (empty if valid). */
  violations: string[];
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Validate an LLM response message for disallowed content and scope violations.
 *
 * @param responseMessage - The raw response from the LLM Agent
 * @param userContext - The authenticated user's context for scope checking
 * @returns Validation result indicating whether the response is safe
 */
export function validateResponse(
  responseMessage: string,
  userContext: AIUserContext
): ResponseValidationResult {
  const violations: string[] = [];

  // Check for disallowed content patterns
  for (const pattern of DISALLOWED_CONTENT_PATTERNS) {
    if (pattern.test(responseMessage)) {
      violations.push(`Disallowed content pattern detected: ${pattern.source.slice(0, 40)}...`);
    }
  }

  // Check for tenant scope violations
  const tenantViolations = checkTenantScopeViolations(responseMessage, userContext);
  violations.push(...tenantViolations);

  if (violations.length > 0) {
    return {
      valid: false,
      message: 'I apologize, but I cannot provide that information. Please try rephrasing your question.',
      violations,
      blocked: true,
    };
  }

  return {
    valid: true,
    message: responseMessage,
    violations: [],
    blocked: false,
  };
}

/**
 * Validate a tool-call response from the LLM Agent against the expected
 * schema and the user's authorized scope.
 *
 * @param toolCallResult - The tool call result to validate
 * @param toolSchema - The registered schema for this tool (if available)
 * @param userContext - The authenticated user's context
 * @returns Validation result for the tool call
 */
export function validateToolCallResponse(
  toolCallResult: ToolCallResult,
  toolSchema: ToolSchema | undefined,
  userContext: AIUserContext
): ToolCallValidationResult {
  const violations: string[] = [];

  // Validate against expected schema if available
  if (toolSchema && toolCallResult.result !== null) {
    const schemaViolations = validateAgainstSchema(toolCallResult.result, toolSchema);
    violations.push(...schemaViolations);
  }

  // Validate tenant scope for tool results containing data
  if (toolCallResult.result !== null && typeof toolCallResult.result === 'object') {
    const scopeViolations = validateToolResultScope(toolCallResult.result, userContext);
    violations.push(...scopeViolations);
  }

  if (violations.length > 0) {
    return {
      valid: false,
      result: {
        ...toolCallResult,
        result: null,
        authorized: false,
        error: 'Response blocked: content validation failed',
      },
      violations,
    };
  }

  return {
    valid: true,
    result: toolCallResult,
    violations: [],
  };
}

/**
 * Check if a response message contains references to tenant data
 * outside the user's authorized scope.
 *
 * @param content - The content string to check
 * @param userContext - User context with authorized tenant scope
 * @returns Array of violation descriptions
 */
export function checkTenantScopeViolations(
  content: string,
  userContext: AIUserContext
): string[] {
  const violations: string[] = [];

  // Agency_Admin has access to all tenants — no scope violations possible
  if (userContext.role === 'Agency_Admin') {
    return [];
  }

  for (const pattern of TENANT_REFERENCE_PATTERNS) {
    const matches = content.matchAll(new RegExp(pattern, 'gi'));
    for (const match of matches) {
      const referencedTenantId = match[1];
      if (referencedTenantId && !userContext.tenantScope.includes(referencedTenantId)) {
        violations.push(
          `Response references tenant '${referencedTenantId}' outside user's authorized scope`
        );
      }
    }
  }

  return violations;
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Validate tool call result data against the tool's expected output characteristics.
 * Performs basic structural validation.
 */
function validateAgainstSchema(
  result: unknown,
  toolSchema: ToolSchema
): string[] {
  const violations: string[] = [];

  // Ensure the result is a plausible data structure
  if (result === undefined) {
    violations.push(`Tool '${toolSchema.name}' returned undefined result`);
    return violations;
  }

  // Check if the result contains disallowed patterns when serialized
  const serialized = typeof result === 'string' ? result : JSON.stringify(result);
  for (const pattern of DISALLOWED_CONTENT_PATTERNS) {
    if (pattern.test(serialized)) {
      violations.push(
        `Tool '${toolSchema.name}' response contains disallowed content pattern`
      );
      break;
    }
  }

  return violations;
}

/**
 * Validate that tool result data doesn't reference tenants outside the user's scope.
 */
function validateToolResultScope(
  result: unknown,
  userContext: AIUserContext
): string[] {
  const violations: string[] = [];

  // Agency_Admin has access to all tenants
  if (userContext.role === 'Agency_Admin') {
    return [];
  }

  // Serialize the result and check for tenant ID references
  const serialized = JSON.stringify(result);

  // Check for tenantId fields in the result
  const tenantIdPattern = /["']?tenant[_-]?[Ii]d["']?\s*:\s*["']([a-f0-9-]+)["']/g;
  const matches = serialized.matchAll(tenantIdPattern);

  for (const match of matches) {
    const referencedTenantId = match[1];
    if (referencedTenantId && !userContext.tenantScope.includes(referencedTenantId)) {
      violations.push(
        `Tool result contains data for unauthorized tenant '${referencedTenantId}'`
      );
    }
  }

  return violations;
}
