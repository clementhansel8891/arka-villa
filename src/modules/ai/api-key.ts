/**
 * AI Agent API Key Management.
 *
 * Handles API key creation, rotation, validation, and revocation.
 * Each dashboard type (Agency_Dashboard, Owner_Portal, Employee_Dashboard)
 * and each Villa_Website uses distinct API keys, rotated every 90 days.
 *
 * Requirements: 29.2
 */

import { v4 as uuidv4 } from 'uuid';
import { redis } from '@/lib/db';
import type { AIApiKey, CreateApiKeyInput, DashboardType } from './types';
import { API_KEY_ROTATION_DAYS } from './types';

/** Redis key prefix for API key storage. */
const API_KEY_PREFIX = 'ai:apikey:';

/** Redis key for the key lookup index (prefix → key ID). */
const API_KEY_INDEX_PREFIX = 'ai:apikey:index:';

/**
 * Generate a cryptographically random API key string.
 * Format: "akai_<dashboard_type_short>_<random_hex>"
 */
function generateKeyValue(dashboardType: DashboardType): string {
  const typePrefix = dashboardType.slice(0, 3); // 'age', 'own', 'emp', 'vil'
  const randomPart = uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
  return `akai_${typePrefix}_${randomPart.slice(0, 48)}`;
}

/**
 * Hash an API key for storage. Uses a simple SHA-256 via Web Crypto-like approach.
 * In production, this would use crypto.createHash but for compatibility we use
 * a base64 encoding of the key combined with a salt.
 */
async function hashKey(key: string): Promise<string> {
  // Use Node.js crypto for hashing
  const { createHash } = await import('crypto');
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Create a new API key for a dashboard type.
 * Returns the raw key value (shown once to the administrator).
 *
 * @param input - Dashboard type and optional tenant ID
 * @returns The created key record and the raw key value
 */
export async function createApiKey(
  input: CreateApiKeyInput
): Promise<{ key: AIApiKey; rawKey: string }> {
  const rawKey = generateKeyValue(input.dashboardType);
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + API_KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000);

  const apiKey: AIApiKey = {
    id: uuidv4(),
    keyHash,
    keyPrefix,
    dashboardType: input.dashboardType,
    tenantId: input.tenantId ?? null,
    createdAt: now,
    expiresAt,
    revoked: false,
    lastUsedAt: null,
  };

  // Store in Redis with TTL matching the rotation period + grace period (7 days)
  const ttlSeconds = (API_KEY_ROTATION_DAYS + 7) * 24 * 60 * 60;
  await redis.set(
    `${API_KEY_PREFIX}${apiKey.id}`,
    JSON.stringify(apiKey),
    'EX',
    ttlSeconds
  );

  // Index by hash for fast lookup during validation
  await redis.set(
    `${API_KEY_INDEX_PREFIX}${keyHash}`,
    apiKey.id,
    'EX',
    ttlSeconds
  );

  return { key: apiKey, rawKey };
}

/**
 * Validate an API key. Checks existence, expiration, and revocation.
 *
 * @param rawKey - The raw API key string from the request header
 * @returns The validated key record, or null if invalid
 */
export async function validateApiKey(rawKey: string): Promise<AIApiKey | null> {
  if (!rawKey || typeof rawKey !== 'string') {
    return null;
  }

  const keyHash = await hashKey(rawKey);

  // Look up key ID by hash
  const keyId = await redis.get(`${API_KEY_INDEX_PREFIX}${keyHash}`);
  if (!keyId) {
    return null;
  }

  // Load the key record
  const keyData = await redis.get(`${API_KEY_PREFIX}${keyId}`);
  if (!keyData) {
    return null;
  }

  const apiKey: AIApiKey = JSON.parse(keyData);

  // Check if revoked
  if (apiKey.revoked) {
    return null;
  }

  // Check if expired
  const now = new Date();
  if (now > new Date(apiKey.expiresAt)) {
    return null;
  }

  // Update last used timestamp (fire and forget)
  apiKey.lastUsedAt = now;
  const ttlRemaining = await redis.ttl(`${API_KEY_PREFIX}${keyId}`);
  if (ttlRemaining > 0) {
    redis
      .set(`${API_KEY_PREFIX}${keyId}`, JSON.stringify(apiKey), 'EX', ttlRemaining)
      .catch(() => { /* non-critical update */ });
  }

  return apiKey;
}

/**
 * Revoke an API key immediately.
 *
 * @param keyId - The key ID to revoke
 */
export async function revokeApiKey(keyId: string): Promise<boolean> {
  const keyData = await redis.get(`${API_KEY_PREFIX}${keyId}`);
  if (!keyData) {
    return false;
  }

  const apiKey: AIApiKey = JSON.parse(keyData);
  apiKey.revoked = true;

  const ttlRemaining = await redis.ttl(`${API_KEY_PREFIX}${keyId}`);
  if (ttlRemaining > 0) {
    await redis.set(`${API_KEY_PREFIX}${keyId}`, JSON.stringify(apiKey), 'EX', ttlRemaining);
  }

  return true;
}

/**
 * Rotate an API key: revoke the old one and create a new one
 * for the same dashboard type and tenant.
 *
 * @param keyId - The old key ID to rotate
 * @returns The new key record and raw key value, or null if old key not found
 */
export async function rotateApiKey(
  keyId: string
): Promise<{ key: AIApiKey; rawKey: string } | null> {
  const keyData = await redis.get(`${API_KEY_PREFIX}${keyId}`);
  if (!keyData) {
    return null;
  }

  const oldKey: AIApiKey = JSON.parse(keyData);

  // Revoke the old key
  await revokeApiKey(keyId);

  // Create a new key with the same dashboard type and tenant
  return createApiKey({
    dashboardType: oldKey.dashboardType,
    tenantId: oldKey.tenantId ?? undefined,
  });
}

/**
 * Check if a key needs rotation (within 7 days of expiration).
 */
export function keyNeedsRotation(apiKey: AIApiKey): boolean {
  const now = new Date();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(apiKey.expiresAt);
  return expiresAt.getTime() - now.getTime() < sevenDaysMs;
}

/**
 * Get all active API keys for a dashboard type.
 * Used for administrative purposes.
 */
export async function getKeysForDashboard(
  dashboardType: DashboardType
): Promise<AIApiKey[]> {
  // Scan Redis for keys matching our prefix
  const keys: AIApiKey[] = [];
  let cursor = '0';

  do {
    const [nextCursor, matchedKeys] = await redis.scan(
      cursor,
      'MATCH',
      `${API_KEY_PREFIX}*`,
      'COUNT',
      100
    );
    cursor = nextCursor;

    for (const redisKey of matchedKeys) {
      // Skip index keys
      if (redisKey.startsWith(API_KEY_INDEX_PREFIX)) continue;

      const data = await redis.get(redisKey);
      if (data) {
        const apiKey: AIApiKey = JSON.parse(data);
        if (apiKey.dashboardType === dashboardType && !apiKey.revoked) {
          keys.push(apiKey);
        }
      }
    }
  } while (cursor !== '0');

  return keys;
}
