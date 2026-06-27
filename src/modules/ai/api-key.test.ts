/**
 * Unit tests for the AI API key management module.
 *
 * Tests key creation, validation, revocation, rotation, and expiration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

const mockRedis = {
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  ttl: vi.fn().mockResolvedValue(7776000),
  scan: vi.fn().mockResolvedValue(['0', []]),
};

vi.mock('@/lib/db', () => ({
  redis: mockRedis,
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-1234-5678-abcd'),
}));

describe('API Key - createApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a key with correct prefix for agency dashboard', async () => {
    const { createApiKey } = await import('./api-key');

    const result = await createApiKey({ dashboardType: 'agency_dashboard' });

    expect(result.rawKey).toMatch(/^akai_age_/);
    expect(result.key.dashboardType).toBe('agency_dashboard');
    expect(result.key.revoked).toBe(false);
    expect(result.key.tenantId).toBeNull();
    expect(mockRedis.set).toHaveBeenCalledTimes(2); // key storage + index
  });

  it('creates a key with tenant ID for villa website', async () => {
    const { createApiKey } = await import('./api-key');

    const result = await createApiKey({
      dashboardType: 'villa_website',
      tenantId: 'tenant-xyz',
    });

    expect(result.rawKey).toMatch(/^akai_vil_/);
    expect(result.key.dashboardType).toBe('villa_website');
    expect(result.key.tenantId).toBe('tenant-xyz');
  });

  it('sets expiration to 90 days from creation', async () => {
    const { createApiKey } = await import('./api-key');

    const before = Date.now();
    const result = await createApiKey({ dashboardType: 'owner_portal' });
    const after = Date.now();

    const expiresAt = new Date(result.key.expiresAt).getTime();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(before + ninetyDaysMs);
    expect(expiresAt).toBeLessThanOrEqual(after + ninetyDaysMs);
  });

  it('stores hashed key in Redis, not raw key', async () => {
    const { createApiKey } = await import('./api-key');

    const result = await createApiKey({ dashboardType: 'employee_dashboard' });

    // The stored key should be a hash, not the raw key
    const storedCalls = mockRedis.set.mock.calls;
    const keyStorageCall = storedCalls.find((call: string[]) =>
      (call[0] as string).startsWith('ai:apikey:') && !(call[0] as string).includes('index')
    );

    expect(keyStorageCall).toBeDefined();
    const storedData = JSON.parse(keyStorageCall![1] as string);
    expect(storedData.keyHash).not.toBe(result.rawKey);
    expect(storedData.keyHash).toHaveLength(64); // SHA-256 hex
  });
});

describe('API Key - validateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for empty key', async () => {
    const { validateApiKey } = await import('./api-key');

    const result = await validateApiKey('');
    expect(result).toBeNull();
  });

  it('returns null when key hash is not found in index', async () => {
    mockRedis.get.mockResolvedValue(null);

    const { validateApiKey } = await import('./api-key');

    const result = await validateApiKey('akai_age_nonexistent');
    expect(result).toBeNull();
  });

  it('returns null for revoked key', async () => {
    const revokedKey = JSON.stringify({
      id: 'key-1',
      keyHash: 'abc123',
      keyPrefix: 'akai_age_abc',
      dashboardType: 'agency_dashboard',
      tenantId: null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      revoked: true,
      lastUsedAt: null,
    });

    mockRedis.get
      .mockResolvedValueOnce('key-1')  // index lookup
      .mockResolvedValueOnce(revokedKey); // key data

    const { validateApiKey } = await import('./api-key');

    const result = await validateApiKey('akai_age_somekey');
    expect(result).toBeNull();
  });

  it('returns null for expired key', async () => {
    const expiredKey = JSON.stringify({
      id: 'key-2',
      keyHash: 'def456',
      keyPrefix: 'akai_own_def',
      dashboardType: 'owner_portal',
      tenantId: null,
      createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // expired 10 days ago
      revoked: false,
      lastUsedAt: null,
    });

    mockRedis.get
      .mockResolvedValueOnce('key-2')  // index lookup
      .mockResolvedValueOnce(expiredKey); // key data

    const { validateApiKey } = await import('./api-key');

    const result = await validateApiKey('akai_own_somekey');
    expect(result).toBeNull();
  });

  it('returns key record for valid key', async () => {
    const validKey = JSON.stringify({
      id: 'key-3',
      keyHash: 'ghi789',
      keyPrefix: 'akai_emp_ghi',
      dashboardType: 'employee_dashboard',
      tenantId: null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      revoked: false,
      lastUsedAt: null,
    });

    mockRedis.get
      .mockResolvedValueOnce('key-3')  // index lookup
      .mockResolvedValueOnce(validKey); // key data

    const { validateApiKey } = await import('./api-key');

    const result = await validateApiKey('akai_emp_somekey');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('key-3');
    expect(result!.dashboardType).toBe('employee_dashboard');
  });
});

describe('API Key - keyNeedsRotation', () => {
  it('returns true when key expires within 7 days', async () => {
    const { keyNeedsRotation } = await import('./api-key');

    const key = {
      id: 'key-1',
      keyHash: 'hash',
      keyPrefix: 'prefix',
      dashboardType: 'agency_dashboard' as const,
      tenantId: null,
      createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // expires in 5 days
      revoked: false,
      lastUsedAt: null,
    };

    expect(keyNeedsRotation(key)).toBe(true);
  });

  it('returns false when key has more than 7 days until expiration', async () => {
    const { keyNeedsRotation } = await import('./api-key');

    const key = {
      id: 'key-2',
      keyHash: 'hash',
      keyPrefix: 'prefix',
      dashboardType: 'agency_dashboard' as const,
      tenantId: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // expires in 60 days
      revoked: false,
      lastUsedAt: null,
    };

    expect(keyNeedsRotation(key)).toBe(false);
  });
});

describe('API Key - revokeApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when key does not exist', async () => {
    mockRedis.get.mockResolvedValueOnce(null);

    const { revokeApiKey } = await import('./api-key');

    const result = await revokeApiKey('nonexistent');
    expect(result).toBe(false);
  });

  it('marks key as revoked in Redis', async () => {
    const existingKey = JSON.stringify({
      id: 'key-1',
      keyHash: 'hash',
      keyPrefix: 'prefix',
      dashboardType: 'agency_dashboard',
      tenantId: null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      revoked: false,
      lastUsedAt: null,
    });

    mockRedis.get.mockResolvedValueOnce(existingKey);
    mockRedis.ttl.mockResolvedValueOnce(2592000);

    const { revokeApiKey } = await import('./api-key');

    const result = await revokeApiKey('key-1');
    expect(result).toBe(true);

    // Verify that set was called with revoked=true
    const setCall = mockRedis.set.mock.calls[0];
    const storedData = JSON.parse(setCall[1] as string);
    expect(storedData.revoked).toBe(true);
  });
});
