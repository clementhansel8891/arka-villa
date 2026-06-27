/**
 * Tests for tenant resolution from subdomain and path.
 */

import { describe, it, expect } from 'vitest';
import {
  extractSubdomain,
  extractTenantFromPath,
} from './tenant-resolver';

describe('extractSubdomain', () => {
  it('returns null for localhost', () => {
    expect(extractSubdomain('localhost')).toBeNull();
    expect(extractSubdomain('localhost:3000')).toBeNull();
  });

  it('returns null for 127.0.0.1', () => {
    expect(extractSubdomain('127.0.0.1')).toBeNull();
    expect(extractSubdomain('127.0.0.1:3000')).toBeNull();
  });

  it('returns null when host does not match platform domain', () => {
    expect(extractSubdomain('example.com')).toBeNull();
    expect(extractSubdomain('other-platform.io')).toBeNull();
  });

  it('returns null for reserved subdomains', () => {
    // Set PLATFORM_DOMAIN for these tests
    const originalEnv = process.env.PLATFORM_DOMAIN;
    process.env.PLATFORM_DOMAIN = 'arka-platform.com';

    expect(extractSubdomain('www.arka-platform.com')).toBeNull();
    expect(extractSubdomain('api.arka-platform.com')).toBeNull();
    expect(extractSubdomain('admin.arka-platform.com')).toBeNull();
    expect(extractSubdomain('app.arka-platform.com')).toBeNull();
    expect(extractSubdomain('mail.arka-platform.com')).toBeNull();
    expect(extractSubdomain('status.arka-platform.com')).toBeNull();

    process.env.PLATFORM_DOMAIN = originalEnv;
  });

  it('returns null when no subdomain is present', () => {
    const originalEnv = process.env.PLATFORM_DOMAIN;
    process.env.PLATFORM_DOMAIN = 'arka-platform.com';

    expect(extractSubdomain('arka-platform.com')).toBeNull();

    process.env.PLATFORM_DOMAIN = originalEnv;
  });

  it('extracts valid tenant subdomain', () => {
    const originalEnv = process.env.PLATFORM_DOMAIN;
    process.env.PLATFORM_DOMAIN = 'arka-platform.com';

    expect(extractSubdomain('villa-sunrise.arka-platform.com')).toBe('villa-sunrise');
    expect(extractSubdomain('my-villa.arka-platform.com')).toBe('my-villa');

    process.env.PLATFORM_DOMAIN = originalEnv;
  });

  it('strips port from hostname before extraction', () => {
    const originalEnv = process.env.PLATFORM_DOMAIN;
    process.env.PLATFORM_DOMAIN = 'arka-platform.com';

    expect(extractSubdomain('villa-sunrise.arka-platform.com:443')).toBe('villa-sunrise');

    process.env.PLATFORM_DOMAIN = originalEnv;
  });
});

describe('extractTenantFromPath', () => {
  it('returns null for paths that do not match the tenant pattern', () => {
    expect(extractTenantFromPath('/api/v1/auth/login')).toBeNull();
    expect(extractTenantFromPath('/web/dashboard')).toBeNull();
    expect(extractTenantFromPath('/m/dashboard')).toBeNull();
    expect(extractTenantFromPath('/')).toBeNull();
  });

  it('extracts tenant slug from valid tenant path', () => {
    expect(extractTenantFromPath('/api/v1/tenants/villa-sunrise/bookings')).toBe('villa-sunrise');
    expect(extractTenantFromPath('/api/v1/tenants/my-villa-123/staff')).toBe('my-villa-123');
  });

  it('returns null for paths with trailing tenants/ but no subpath', () => {
    expect(extractTenantFromPath('/api/v1/tenants/villa-sunrise')).toBeNull();
  });
});
