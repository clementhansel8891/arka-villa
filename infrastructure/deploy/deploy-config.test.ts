/**
 * Tests for deployment configuration
 *
 * Verifies that the deploy config meets the requirements:
 * - 2 previous versions retained for rollback (38.5)
 * - Total image size ≤ 5GB (38.7)
 * - Cold-start ≤ 5 minutes (38.8)
 * - Health check window for auto-rollback within 2 minutes (38.3)
 * - 1-year manifest retention (38.6)
 */

import { describe, it, expect } from 'vitest';
import { deployConfig, services } from './deploy-config';

describe('deploy-config', () => {
  describe('deployment settings', () => {
    it('retains 2 previous image versions for rollback', () => {
      expect(deployConfig.retainedVersions).toBe(2);
    });

    it('enforces max image size of 5GB compressed', () => {
      const fiveGB = 5 * 1024 * 1024 * 1024;
      expect(deployConfig.maxImageSizeBytes).toBe(fiveGB);
    });

    it('enforces max cold-start time of 5 minutes', () => {
      const fiveMinutes = 5 * 60 * 1000;
      expect(deployConfig.maxColdStartTime).toBe(fiveMinutes);
    });

    it('uses rolling deployment strategy', () => {
      expect(deployConfig.strategy).toBe('rolling');
    });

    it('has a 2-minute health check window for auto-rollback', () => {
      const twoMinutes = 2 * 60 * 1000;
      expect(deployConfig.healthCheckWindow).toBe(twoMinutes);
    });

    it('retains deployment manifests for 1 year (365 days)', () => {
      expect(deployConfig.manifestRetentionDays).toBe(365);
    });

    it('includes a pre-deployment test command', () => {
      expect(deployConfig.preDeployTestCommand).toBe('npm run test');
    });

    it('deployment timeout is within 5 minutes', () => {
      expect(deployConfig.deploymentTimeout).toBeLessThanOrEqual(300000);
    });
  });

  describe('service definitions', () => {
    it('defines all required services', () => {
      const serviceNames = services.map((s) => s.name);
      expect(serviceNames).toContain('nextjs');
      expect(serviceNames).toContain('postgres');
      expect(serviceNames).toContain('redis');
      expect(serviceNames).toContain('nginx');
      expect(serviceNames).toContain('minio');
      expect(serviceNames).toContain('n8n');
    });

    it('marks nextjs, postgres, redis, nginx as critical services', () => {
      const critical = services.filter((s) => s.critical).map((s) => s.name);
      expect(critical).toContain('nextjs');
      expect(critical).toContain('postgres');
      expect(critical).toContain('redis');
      expect(critical).toContain('nginx');
    });

    it('marks minio and n8n as non-critical services', () => {
      const nonCritical = services.filter((s) => !s.critical).map((s) => s.name);
      expect(nonCritical).toContain('minio');
      expect(nonCritical).toContain('n8n');
    });

    it('nextjs health check points to /api/health', () => {
      const nextjs = services.find((s) => s.name === 'nextjs');
      expect(nextjs?.healthCheckUrl).toBe('http://localhost:3000/api/health');
    });

    it('all services have reasonable startup grace periods', () => {
      for (const service of services) {
        expect(service.startupGracePeriod).toBeGreaterThan(0);
        expect(service.startupGracePeriod).toBeLessThanOrEqual(60000);
      }
    });

    it('all services have positive health check intervals', () => {
      for (const service of services) {
        expect(service.healthCheckInterval).toBeGreaterThan(0);
      }
    });
  });
});
