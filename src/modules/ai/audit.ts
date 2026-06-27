/**
 * AI Agent Audit Logging.
 *
 * Logs all AI requests and responses for audit purposes.
 * Retains logs for 90 days per Requirement 29.7.
 *
 * Uses Redis sorted sets with TTL for fast querying and automatic expiration.
 * Sensitive user message content is not stored — only metadata.
 *
 * Requirements: 29.7
 */

import { v4 as uuidv4 } from 'uuid';
import { redis } from '@/lib/db';
import type { AIAuditLogEntry } from './types';
import type { PlatformRole } from '@/lib/middleware/types';
import { AUDIT_RETENTION_DAYS } from './types';

/** Redis key for the AI audit log sorted set. */
const AUDIT_LOG_KEY = 'ai:audit:log';

/** Redis key prefix for individual audit entries. */
const AUDIT_ENTRY_PREFIX = 'ai:audit:entry:';

/** TTL for individual audit entries in seconds. */
const AUDIT_ENTRY_TTL = AUDIT_RETENTION_DAYS * 24 * 60 * 60;

/** Redis key for user-specific audit logs. */
const AUDIT_USER_PREFIX = 'ai:audit:user:';

export interface LogChatParams {
  userId: string;
  role: PlatformRole;
  tenantId: string | null;
  responseStatus: number;
  responseTimeMs: number;
  truncated: boolean;
  error?: string;
}

export interface LogToolParams {
  userId: string;
  role: PlatformRole;
  tenantId: string | null;
  toolName: string;
  authorized: boolean;
  responseStatus: number;
  responseTimeMs: number;
  error?: string;
}

/**
 * Log an AI chat interaction for audit.
 */
export async function logChatInteraction(params: LogChatParams): Promise<void> {
  const entry: AIAuditLogEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    userId: params.userId,
    role: params.role,
    tenantId: params.tenantId,
    operationType: 'chat',
    responseStatus: params.responseStatus,
    responseTimeMs: params.responseTimeMs,
    truncated: params.truncated,
    error: params.error,
  };

  await storeAuditEntry(entry);
}

/**
 * Log an AI tool invocation for audit.
 */
export async function logToolInvocation(params: LogToolParams): Promise<void> {
  const entry: AIAuditLogEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    userId: params.userId,
    role: params.role,
    tenantId: params.tenantId,
    operationType: 'tool_invocation',
    responseStatus: params.responseStatus,
    responseTimeMs: params.responseTimeMs,
    toolName: params.toolName,
    authorized: params.authorized,
    error: params.error,
  };

  await storeAuditEntry(entry);
}

/**
 * Store an audit entry in Redis with automatic 90-day retention.
 */
async function storeAuditEntry(entry: AIAuditLogEntry): Promise<void> {
  try {
    const entryJson = JSON.stringify(entry);
    const score = Date.now();

    // Use a pipeline for atomic multi-key operations
    const pipeline = redis.pipeline();

    // Store the full entry with TTL
    pipeline.set(`${AUDIT_ENTRY_PREFIX}${entry.id}`, entryJson, 'EX', AUDIT_ENTRY_TTL);

    // Add to the global sorted set (score = timestamp for range queries)
    pipeline.zadd(AUDIT_LOG_KEY, score, entry.id);

    // Add to user-specific sorted set
    pipeline.zadd(`${AUDIT_USER_PREFIX}${entry.userId}`, score, entry.id);
    pipeline.expire(`${AUDIT_USER_PREFIX}${entry.userId}`, AUDIT_ENTRY_TTL);

    await pipeline.exec();

    // Prune old entries from sorted sets (older than retention period)
    const cutoff = Date.now() - AUDIT_ENTRY_TTL * 1000;
    redis.zremrangebyscore(AUDIT_LOG_KEY, 0, cutoff).catch(() => {
      /* non-critical cleanup */
    });
  } catch (err) {
    // Audit logging failures should not break the API
    console.error('[AI Audit] Failed to store audit entry:', err);
  }
}

/**
 * Query audit logs for a date range.
 * Returns entries within the specified time window.
 */
export async function queryAuditLogs(options: {
  from?: Date;
  to?: Date;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<AIAuditLogEntry[]> {
  const { from, to, userId, limit = 50, offset = 0 } = options;

  const minScore = from ? from.getTime() : 0;
  const maxScore = to ? to.getTime() : Date.now();

  // Determine which sorted set to query
  const setKey = userId ? `${AUDIT_USER_PREFIX}${userId}` : AUDIT_LOG_KEY;

  // Get entry IDs within range
  const entryIds = await redis.zrangebyscore(
    setKey,
    minScore,
    maxScore,
    'LIMIT',
    offset,
    limit
  );

  if (entryIds.length === 0) {
    return [];
  }

  // Fetch full entries
  const entries: AIAuditLogEntry[] = [];
  for (const id of entryIds) {
    const data = await redis.get(`${AUDIT_ENTRY_PREFIX}${id}`);
    if (data) {
      entries.push(JSON.parse(data));
    }
  }

  return entries;
}

/**
 * Get audit log count for a user in a time window.
 * Useful for rate limiting analysis.
 */
export async function getInteractionCount(
  userId: string,
  windowMs: number
): Promise<number> {
  const now = Date.now();
  const from = now - windowMs;

  return redis.zcount(`${AUDIT_USER_PREFIX}${userId}`, from, now);
}
