/**
 * Unit tests for the tenant management service.
 *
 * Tests slug validation, schema name derivation, and service error handling.
 * Database-dependent operations are tested with mocked repository functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deriveSchemaName, validateSlug, TenantError } from './service';

describe('deriveSchemaName', () => {
  it('converts slug to schema name with tenant_ prefix', () => {
    expect(deriveSchemaName('villa-sunrise')).toBe('tenant_villa_sunrise');
  });

  it('replaces hyphens with underscores', () => {
    expect(deriveSchemaName('my-fancy-villa')).toBe('tenant_my_fancy_villa');
  });

  it('handles slugs without hyphens', () => {
    expect(deriveSchemaName('villasunrise')).toBe('tenant_villasunrise');
  });

  it('handles single character segments', () => {
    expect(deriveSchemaName('a-b-c')).toBe('tenant_a_b_c');
  });
});

describe('validateSlug', () => {
  it('accepts valid slugs', () => {
    expect(validateSlug('villa-sunrise')).toEqual({ valid: true });
    expect(validateSlug('abc')).toEqual({ valid: true });
    expect(validateSlug('villa123')).toEqual({ valid: true });
    expect(validateSlug('my-villa-2024')).toEqual({ valid: true });
  });

  it('rejects empty slugs', () => {
    const result = validateSlug('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects slugs shorter than 3 characters', () => {
    const result = validateSlug('ab');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 3 characters');
  });

  it('rejects slugs longer than 100 characters', () => {
    const result = validateSlug('a'.repeat(101));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not exceed 100 characters');
  });

  it('rejects slugs with uppercase letters', () => {
    const result = validateSlug('Villa-Sunrise');
    expect(result.valid).toBe(false);
  });

  it('rejects slugs starting with a hyphen', () => {
    const result = validateSlug('-villa');
    expect(result.valid).toBe(false);
  });

  it('rejects slugs ending with a hyphen', () => {
    const result = validateSlug('villa-');
    expect(result.valid).toBe(false);
  });

  it('rejects slugs with special characters', () => {
    const result = validateSlug('villa_sunrise');
    expect(result.valid).toBe(false);
  });

  it('rejects slugs with spaces', () => {
    const result = validateSlug('villa sunrise');
    expect(result.valid).toBe(false);
  });
});

describe('TenantError', () => {
  it('creates error with message and code', () => {
    const error = new TenantError('Not found', 'NOT_FOUND');
    expect(error.message).toBe('Not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('TenantError');
  });

  it('is an instance of Error', () => {
    const error = new TenantError('test', 'VALIDATION_ERROR');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('createTenant', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects empty name', async () => {
    const { createTenant } = await import('./service');

    await expect(
      createTenant({ name: '', slug: 'valid-slug' })
    ).rejects.toThrow('Name is required');

    await expect(
      createTenant({ name: '   ', slug: 'valid-slug' })
    ).rejects.toThrow('Name is required');
  });

  it('rejects name exceeding 255 characters', async () => {
    const { createTenant } = await import('./service');

    await expect(
      createTenant({ name: 'x'.repeat(256), slug: 'valid-slug' })
    ).rejects.toThrow('must not exceed 255 characters');
  });

  it('rejects invalid slug format', async () => {
    const { createTenant } = await import('./service');

    await expect(
      createTenant({ name: 'My Villa', slug: 'AB' })
    ).rejects.toThrow('Slug must be at least 3 characters');
  });
});

describe('updateTenant', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects empty name update', async () => {
    // Mock the repository to return a tenant
    vi.doMock('./repository', () => ({
      getTenantById: vi.fn().mockResolvedValue({
        id: '123',
        name: 'Original',
        slug: 'original',
        schemaName: 'tenant_original',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateTenant: vi.fn(),
    }));

    const { updateTenant } = await import('./service');

    await expect(
      updateTenant('123', { name: '' })
    ).rejects.toThrow('Name cannot be empty');
  });

  it('rejects invalid status transitions', async () => {
    vi.doMock('./repository', () => ({
      getTenantById: vi.fn().mockResolvedValue({
        id: '123',
        name: 'Original',
        slug: 'original',
        schemaName: 'tenant_original',
        status: 'deactivated',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateTenant: vi.fn(),
    }));

    const { updateTenant } = await import('./service');

    await expect(
      updateTenant('123', { status: 'active' })
    ).rejects.toThrow('Cannot transition');
  });

  it('throws NOT_FOUND for non-existent tenant', async () => {
    vi.doMock('./repository', () => ({
      getTenantById: vi.fn().mockResolvedValue(null),
    }));

    const { updateTenant } = await import('./service');

    await expect(
      updateTenant('nonexistent', { name: 'New Name' })
    ).rejects.toThrow('Tenant not found');
  });
});
