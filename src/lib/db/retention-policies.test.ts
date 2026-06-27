/**
 * Tests for data retention policies.
 *
 * Verifies retention policy definitions, cutoff date calculations,
 * and the enforcement logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pool
vi.mock('./pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

import { pool } from './pool';
import {
  RETENTION_POLICIES,
  getCutoffDate,
  getRetentionPolicies,
  getRetentionPolicy,
  enforceRetentionPolicies,
} from './retention-policies';

const mockPool = vi.mocked(pool);

describe('retention-policies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RETENTION_POLICIES', () => {
    it('defines financial data retention of approximately 7 years', () => {
      const financialPolicies = RETENTION_POLICIES.filter(
        (p) => p.id === 'financial-transactions' || p.id === 'financial-audit-trail'
      );

      for (const policy of financialPolicies) {
        // 7 years ≈ 2555 days
        expect(policy.retentionDays).toBe(2555);
      }
    });

    it('defines general operational data retention of 2 years', () => {
      const generalPolicies = RETENTION_POLICIES.filter(
        (p) => p.id === 'bookings' || p.id === 'maintenance-tickets' || p.id === 'staff-attendance'
      );

      for (const policy of generalPolicies) {
        expect(policy.retentionDays).toBe(730);
      }
    });

    it('defines IoT data retention of 90 days', () => {
      const iotPolicies = RETENTION_POLICIES.filter(
        (p) => p.id === 'iot-readings' || p.id === 'cctv-recordings-metadata' || p.id === 'device-health'
      );

      expect(iotPolicies.length).toBe(3);
      for (const policy of iotPolicies) {
        expect(policy.retentionDays).toBe(90);
      }
    });

    it('defines channel sync log retention of 90 days per requirement 6.7', () => {
      const policy = RETENTION_POLICIES.find((p) => p.id === 'channel-sync-logs');
      expect(policy).toBeDefined();
      expect(policy!.retentionDays).toBe(90);
    });

    it('all policies have required fields', () => {
      for (const policy of RETENTION_POLICIES) {
        expect(policy.id).toBeTruthy();
        expect(policy.name).toBeTruthy();
        expect(policy.table).toBeTruthy();
        expect(policy.timestampColumn).toBeTruthy();
        expect(policy.retentionDays).toBeGreaterThan(0);
        expect(['delete', 'archive', 'compress']).toContain(policy.action);
        expect(typeof policy.enabled).toBe('boolean');
      }
    });

    it('all policies have unique IDs', () => {
      const ids = RETENTION_POLICIES.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getCutoffDate', () => {
    it('returns a date N days in the past', () => {
      const now = Date.now();
      const cutoff = getCutoffDate(30);
      const expectedMs = now - 30 * 24 * 60 * 60 * 1000;

      // Allow 1 second tolerance for test execution time
      expect(Math.abs(cutoff.getTime() - expectedMs)).toBeLessThan(1000);
    });

    it('returns today for 0 days retention', () => {
      const cutoff = getCutoffDate(0);
      const now = new Date();

      expect(cutoff.getDate()).toBe(now.getDate());
    });
  });

  describe('getRetentionPolicies', () => {
    it('returns a copy of all policies', () => {
      const policies = getRetentionPolicies();
      expect(policies).toHaveLength(RETENTION_POLICIES.length);
      // Ensure it's a copy, not the same reference
      expect(policies).not.toBe(RETENTION_POLICIES);
    });
  });

  describe('getRetentionPolicy', () => {
    it('returns a specific policy by ID', () => {
      const policy = getRetentionPolicy('iot-readings');
      expect(policy).toBeDefined();
      expect(policy!.name).toBe('IoT Device Readings');
      expect(policy!.retentionDays).toBe(90);
    });

    it('returns undefined for unknown policy ID', () => {
      const policy = getRetentionPolicy('nonexistent');
      expect(policy).toBeUndefined();
    });
  });

  describe('enforceRetentionPolicies', () => {
    it('executes all enabled policies', async () => {
      // Mock public schema policies (direct DELETE)
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as never);

      const report = await enforceRetentionPolicies();

      expect(report.executedAt).toBeInstanceOf(Date);
      expect(report.results.length + report.errors.length).toBeGreaterThan(0);
    });

    it('reports errors without crashing when tables do not exist', async () => {
      mockPool.query.mockRejectedValue(new Error('relation does not exist'));

      const report = await enforceRetentionPolicies();

      // All policies should result in errors since the tables don't exist
      expect(report.errors.length).toBeGreaterThan(0);
      for (const error of report.errors) {
        expect(error.error).toContain('relation does not exist');
      }
    });

    it('processes tenant-scoped tables across all active tenants', async () => {
      // First call: query for tenants (for non-public table policies)
      // Subsequent calls: DELETE from tenant tables
      mockPool.query
        .mockImplementation(async (text: string | { text: string }) => {
          const queryText = typeof text === 'string' ? text : text.text;
          if (queryText.includes('FROM public.tenants')) {
            return { rows: [{ schema_name: 'tenant_villa_001' }], rowCount: 1 };
          }
          return { rows: [], rowCount: 5 };
        });

      const report = await enforceRetentionPolicies();

      expect(report.totalRecordsProcessed).toBeGreaterThan(0);
    });
  });
});
