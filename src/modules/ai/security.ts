/**
 * AI Security Module — rate limiting and input sanitization.
 *
 * Enforces per-user rate limits on AI interactions and sanitizes
 * user input to prevent prompt injection, SQL injection, and XSS attacks.
 *
 * Requirements: 30.1, 30.3, 34.1, 34.3
 */

import type { PlatformRole } from '@/lib/middleware/types';

// ─── Rate Limit Configuration ─────────────────────────────────────

/** Rate limit window in milliseconds (15 minutes). */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Rate limits per role (messages per 15-minute window). */
export const RATE_LIMITS: Record<string, number> = {
  Employee: 30,
  Guest: 30,
  Agency_Admin: 60,
  Villa_Owner: 60,
  Visitor: 0, // Visitors cannot use AI
};

/** Rate limit result returned by checkAIRateLimit. */
export interface AIRateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * In-memory rate limit store.
 * Maps userId to an array of request timestamps within the current window.
 */
const rateLimitStore = new Map<string, number[]>();

/**
 * Get the rate limit for a given role.
 */
export function getRateLimitForRole(role: PlatformRole): number {
  return RATE_LIMITS[role] ?? 0;
}

/**
 * Check if a user is within their AI rate limit.
 *
 * Requirement 30.1: 30 msg/15min for Employee/Guest, 60 msg/15min for Agency_Admin/Villa_Owner.
 *
 * @param userId - The user's unique identifier
 * @param role - The user's platform role
 * @returns Whether the request is allowed and remaining quota
 */
export async function checkAIRateLimit(
  userId: string,
  role: PlatformRole
): Promise<AIRateLimitResult> {
  const limit = getRateLimitForRole(role);

  // Visitors cannot use AI
  if (limit === 0) {
    return { allowed: false, remaining: 0 };
  }

  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Get existing timestamps for this user
  const timestamps = rateLimitStore.get(userId) ?? [];

  // Filter to only timestamps within the current window
  const recentTimestamps = timestamps.filter((ts) => ts > windowStart);

  // Check if within limit
  if (recentTimestamps.length >= limit) {
    rateLimitStore.set(userId, recentTimestamps);
    return { allowed: false, remaining: 0 };
  }

  // Record this request
  recentTimestamps.push(now);
  rateLimitStore.set(userId, recentTimestamps);

  return {
    allowed: true,
    remaining: limit - recentTimestamps.length,
  };
}

/**
 * Reset rate limit store (for testing purposes).
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

/**
 * Get current request count for a user (for testing/monitoring).
 */
export function getCurrentRequestCount(userId: string): number {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = rateLimitStore.get(userId) ?? [];
  return timestamps.filter((ts) => ts > windowStart).length;
}

// ─── Input Sanitization ───────────────────────────────────────────

/** Result of input sanitization. */
export interface SanitizeResult {
  sanitized: string;
  rejected: boolean;
  patterns: string[];
}

/** Known prompt injection patterns. */
const PROMPT_INJECTION_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/gi, name: 'prompt_injection' },
  { pattern: /ignore\s+(all\s+)?above\s+instructions/gi, name: 'prompt_injection' },
  { pattern: /disregard\s+(all\s+)?previous/gi, name: 'prompt_injection' },
  { pattern: /you\s+are\s+now\s+a/gi, name: 'prompt_injection' },
  { pattern: /act\s+as\s+(a\s+)?different/gi, name: 'prompt_injection' },
  { pattern: /new\s+system\s+prompt/gi, name: 'prompt_injection' },
  { pattern: /override\s+(system\s+)?prompt/gi, name: 'prompt_injection' },
  { pattern: /system:\s*/gi, name: 'prompt_injection' },
  { pattern: /\[INST\]/gi, name: 'prompt_injection' },
  { pattern: /<<SYS>>/gi, name: 'prompt_injection' },
  { pattern: /\{\{.*system.*\}\}/gi, name: 'prompt_injection' },
  { pattern: /forget\s+(all\s+)?(your\s+)?(previous\s+)?(instructions|rules|directives)/gi, name: 'prompt_injection' },
  { pattern: /role\s*:\s*(system|assistant)/gi, name: 'prompt_injection' },
];

/** Known SQL injection patterns. */
const SQL_INJECTION_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE|UNION)\b\s+(ALL\s+)?)/gi, name: 'sql_injection' },
  { pattern: /(['"])\s*(OR|AND)\s+\1?\s*\d+\s*=\s*\d+/gi, name: 'sql_injection' },
  { pattern: /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s+/gi, name: 'sql_injection' },
  { pattern: /--\s*$/gm, name: 'sql_injection' },
  { pattern: /\/\*[\s\S]*?\*\//g, name: 'sql_injection' },
  { pattern: /'\s*OR\s+'[^']*'\s*=\s*'[^']*'/gi, name: 'sql_injection' },
  { pattern: /UNION\s+(ALL\s+)?SELECT/gi, name: 'sql_injection' },
  { pattern: /;\s*SHUTDOWN/gi, name: 'sql_injection' },
];

/** Known XSS patterns. */
const XSS_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /<script[\s>]/gi, name: 'xss' },
  { pattern: /<\/script>/gi, name: 'xss' },
  { pattern: /javascript\s*:/gi, name: 'xss' },
  { pattern: /on(load|error|click|mouseover|focus|blur|submit|change|input)\s*=/gi, name: 'xss' },
  { pattern: /<iframe[\s>]/gi, name: 'xss' },
  { pattern: /<object[\s>]/gi, name: 'xss' },
  { pattern: /<embed[\s>]/gi, name: 'xss' },
  { pattern: /<img[^>]+onerror/gi, name: 'xss' },
  { pattern: /eval\s*\(/gi, name: 'xss' },
  { pattern: /document\.(cookie|location|write)/gi, name: 'xss' },
  { pattern: /window\.(location|open)/gi, name: 'xss' },
  { pattern: /<svg[^>]+onload/gi, name: 'xss' },
];

/** All patterns combined. */
const ALL_PATTERNS = [
  ...PROMPT_INJECTION_PATTERNS,
  ...SQL_INJECTION_PATTERNS,
  ...XSS_PATTERNS,
];

/**
 * Sanitize user input by detecting and stripping/escaping injection patterns.
 *
 * Requirement 30.3: Strip/escape prompt injection, SQL injection, XSS patterns.
 * Requirement 34.3: Validate input rejecting SQL injection and XSS payloads.
 *
 * @param input - Raw user input string
 * @returns Sanitization result with cleaned string, rejection flag, and detected patterns
 */
export function sanitizeInput(input: string): SanitizeResult {
  const detectedPatterns: string[] = [];
  let sanitized = input;

  // Check for each pattern category
  for (const { pattern, name } of ALL_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(sanitized)) {
      if (!detectedPatterns.includes(name)) {
        detectedPatterns.push(name);
      }
      // Reset lastIndex again before replace
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, '');
    }
  }

  // Trim any resulting excessive whitespace
  sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();

  return {
    sanitized,
    rejected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
  };
}

/**
 * Check if a string contains any dangerous patterns (without modifying it).
 * Useful for output validation.
 */
export function containsDangerousPatterns(text: string): boolean {
  for (const { pattern } of ALL_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}
