/**
 * AI Input Sanitizer — detects and strips prompt injection,
 * SQL injection, and XSS patterns from user messages.
 *
 * Tracks consecutive rejections per user and triggers suspension
 * after 5 consecutive sanitization failures within 1 hour.
 *
 * Requirements: 30.3, 30.6
 */

import { redis } from '@/lib/db';
import { suspendAIAccess } from './rate-limiter';

// ─── Configuration ────────────────────────────────────────────────

/** Maximum consecutive rejections before suspension. */
const MAX_CONSECUTIVE_REJECTIONS = 5;

/** Redis key prefix for consecutive rejection tracking. */
const REJECTION_KEY_PREFIX = 'ai:rejections:';

/** Rejection counter TTL in seconds (1 hour). */
const REJECTION_TTL_SECONDS = 60 * 60;

// ─── Injection Pattern Definitions ────────────────────────────────

/**
 * Prompt injection patterns that attempt to override system behavior.
 * These match common LLM jailbreak and prompt manipulation techniques.
 */
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?prior\s+instructions/i,
  /ignore\s+(all\s+)?above\s+instructions/i,
  /disregard\s+(all\s+)?previous/i,
  /you\s+are\s+now\s+a/i,
  /you\s+are\s+no\s+longer/i,
  /act\s+as\s+(a\s+|an\s+)?(?!if)/i,
  /pretend\s+(you('re|\s+are)\s+|to\s+be\s+)/i,
  /new\s+instructions?:/i,
  /system\s*prompt\s*:/i,
  /override\s+(system|safety|restrictions)/i,
  /bypass\s+(security|filters?|restrictions?)/i,
  /jailbreak/i,
  /\[system\]/i,
  /\[INST\]/i,
  /<<\s*SYS\s*>>/i,
  /reveal\s+(your|the)\s+(system\s+)?prompt/i,
  /show\s+(me\s+)?(your|the)\s+(system\s+)?prompt/i,
  /what\s+(are|is)\s+your\s+(system\s+)?instructions/i,
  /repeat\s+(your|the)\s+(system\s+)?prompt/i,
  /output\s+(your|the)\s+initial\s+prompt/i,
  /forget\s+(everything|all|your\s+instructions)/i,
  /do\s+not\s+follow\s+(your|any)\s+instructions/i,
];

/**
 * SQL injection patterns that attempt database manipulation.
 */
const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(['";])\s*(OR|AND)\s+\d+\s*=\s*\d+/i,
  /(['";])\s*;\s*(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC)/i,
  /UNION\s+(ALL\s+)?SELECT/i,
  /;\s*DROP\s+TABLE/i,
  /;\s*DELETE\s+FROM/i,
  /;\s*INSERT\s+INTO/i,
  /;\s*UPDATE\s+\w+\s+SET/i,
  /;\s*ALTER\s+TABLE/i,
  /;\s*CREATE\s+TABLE/i,
  /;\s*EXEC(\s+|\()/i,
  /'\s*OR\s+'[^']*'\s*=\s*'/i,
  /--\s*$/m,
  /\/\*[\s\S]*?\*\//,
  /SLEEP\s*\(\s*\d+\s*\)/i,
  /BENCHMARK\s*\(/i,
  /WAITFOR\s+DELAY/i,
  /xp_cmdshell/i,
  /LOAD_FILE\s*\(/i,
  /INTO\s+(OUT|DUMP)FILE/i,
];

/**
 * XSS patterns that attempt to inject executable content.
 */
const XSS_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /on(error|load|click|mouseover|mouseout|focus|blur|submit|change|input|keydown|keyup|keypress)\s*=/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<link[\s>]/i,
  /<img[^>]+onerror/i,
  /expression\s*\(/i,
  /url\s*\(\s*['"]?\s*javascript/i,
  /data\s*:\s*text\/html/i,
  /<svg[\s\S]*?on\w+\s*=/i,
  /document\s*\.\s*(cookie|write|location)/i,
  /window\s*\.\s*(location|open)/i,
  /eval\s*\(/i,
  /setTimeout\s*\(/i,
  /setInterval\s*\(/i,
  /new\s+Function\s*\(/i,
];

// ─── Types ────────────────────────────────────────────────────────

/** Classification of a detected injection attempt. */
export type InjectionType = 'prompt_injection' | 'sql_injection' | 'xss';

/** Result of input sanitization. */
export interface SanitizationResult {
  /** Whether the input is safe (no injection patterns detected). */
  safe: boolean;
  /** The sanitized input (with dangerous patterns escaped). */
  sanitizedInput: string;
  /** Types of injections detected (empty if safe). */
  detectionsFound: InjectionType[];
  /** Human-readable descriptions of what was detected. */
  details: string[];
}

/** Result of checking whether suspension should trigger. */
export interface SuspensionCheckResult {
  /** Whether the user was suspended as a result of this check. */
  suspended: boolean;
  /** Current consecutive rejection count. */
  consecutiveRejections: number;
  /** Whether an Agency_Admin notification should be sent. */
  notifyAdmin: boolean;
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Sanitize user input before forwarding to the LLM Agent.
 * Detects and escapes prompt injection, SQL injection, and XSS patterns.
 *
 * @param input - Raw user message
 * @returns Sanitization result with safety assessment and cleaned input
 */
export function sanitizeInput(input: string): SanitizationResult {
  const detections: InjectionType[] = [];
  const details: string[] = [];
  let sanitized = input;

  // Check prompt injection patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      if (!detections.includes('prompt_injection')) {
        detections.push('prompt_injection');
        details.push('Prompt injection pattern detected');
      }
      sanitized = sanitized.replace(pattern, '[BLOCKED]');
    }
  }

  // Check SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      if (!detections.includes('sql_injection')) {
        detections.push('sql_injection');
        details.push('SQL injection pattern detected');
      }
      sanitized = sanitized.replace(pattern, '[BLOCKED]');
    }
  }

  // Check XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      if (!detections.includes('xss')) {
        detections.push('xss');
        details.push('XSS pattern detected');
      }
      sanitized = sanitized.replace(pattern, '[BLOCKED]');
    }
  }

  // Additional HTML entity escaping for any remaining angle brackets
  if (detections.length > 0) {
    sanitized = escapeHtmlEntities(sanitized);
  }

  return {
    safe: detections.length === 0,
    sanitizedInput: detections.length === 0 ? input : sanitized,
    detectionsFound: detections,
    details,
  };
}

/**
 * Track a sanitization rejection for a user and check if suspension
 * should be triggered (5 consecutive rejections within 1 hour).
 *
 * @param userId - The user who triggered the rejection
 * @returns Whether the user was suspended and if admin notification is needed
 */
export async function trackRejection(userId: string): Promise<SuspensionCheckResult> {
  const key = `${REJECTION_KEY_PREFIX}${userId}`;

  // Increment rejection count and set/refresh TTL
  const count = await redis.incr(key);
  await redis.expire(key, REJECTION_TTL_SECONDS);

  if (count >= MAX_CONSECUTIVE_REJECTIONS) {
    // Suspend user's AI access
    await suspendAIAccess(userId);
    // Reset counter
    await redis.del(key);

    return {
      suspended: true,
      consecutiveRejections: count,
      notifyAdmin: true,
    };
  }

  return {
    suspended: false,
    consecutiveRejections: count,
    notifyAdmin: false,
  };
}

/**
 * Reset the consecutive rejection counter for a user.
 * Called when a user sends a message that passes sanitization,
 * breaking the consecutive rejection streak.
 *
 * @param userId - The user whose counter should be reset
 */
export async function resetRejectionCounter(userId: string): Promise<void> {
  const key = `${REJECTION_KEY_PREFIX}${userId}`;
  await redis.del(key);
}

/**
 * Get the current consecutive rejection count for a user.
 *
 * @param userId - The user to check
 * @returns Current consecutive rejection count
 */
export async function getRejectionCount(userId: string): Promise<number> {
  const key = `${REJECTION_KEY_PREFIX}${userId}`;
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}

// ─── Internal Helpers ─────────────────────────────────────────────

/**
 * Escape remaining HTML entities in sanitized output.
 */
function escapeHtmlEntities(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
