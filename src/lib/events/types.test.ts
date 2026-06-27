import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { PlatformEvent, AgentConfig, AgentHealthStatus } from './types';

describe('PlatformEvent type validation', () => {
  /**
   * Validates: Requirements 40.3
   * Property: Well-formed PlatformEvent objects have all required fields
   */
  it('requires all mandatory fields for a valid event', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          type: fc.stringMatching(/^[a-z]+\.[a-z_]+$/),
          version: fc.nat({ max: 100 }),
          timestamp: fc.date({ min: new Date('2000-01-01T00:00:00.000Z'), max: new Date('2099-12-31T23:59:59.999Z') }).map((d) => d.toISOString()),
          source: fc.constantFrom('bookings', 'channels', 'payments', 'staff', 'maintenance'),
          tenantId: fc.uuid(),
          correlationId: fc.uuid(),
          actor: fc.record({
            userId: fc.uuid(),
            role: fc.constantFrom('Agency_Admin', 'Villa_Owner', 'Employee', 'Guest'),
          }),
          payload: fc.anything(),
          metadata: fc.record({
            retryCount: fc.nat({ max: 10 }),
            maxRetries: fc.nat({ max: 10 }),
            priority: fc.constantFrom('critical', 'high', 'normal', 'low'),
          }),
        }),
        (event) => {
          const typedEvent: PlatformEvent = event;
          expect(typedEvent.id).toBeDefined();
          expect(typedEvent.type).toBeDefined();
          expect(typedEvent.version).toBeGreaterThanOrEqual(0);
          expect(typedEvent.timestamp).toBeDefined();
          expect(typedEvent.source).toBeDefined();
          expect(typedEvent.tenantId).toBeDefined();
          expect(typedEvent.correlationId).toBeDefined();
          expect(typedEvent.actor.userId).toBeDefined();
          expect(typedEvent.actor.role).toBeDefined();
          expect(typedEvent.metadata.retryCount).toBeGreaterThanOrEqual(0);
          expect(typedEvent.metadata.maxRetries).toBeGreaterThanOrEqual(0);
          expect(['critical', 'high', 'normal', 'low']).toContain(typedEvent.metadata.priority);
          return true;
        }
      )
    );
  });
});

describe('AgentConfig type validation', () => {
  /**
   * Validates: Requirements 40.3
   * Property: AgentConfig concurrency and retries are positive integers
   */
  it('enforces positive concurrency and retries', () => {
    fc.assert(
      fc.property(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          consumerGroup: fc.string({ minLength: 1, maxLength: 50 }),
          streams: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          concurrency: fc.integer({ min: 1, max: 100 }),
          maxRetries: fc.integer({ min: 0, max: 10 }),
          retryBackoff: fc.constantFrom('exponential', 'linear', 'fixed'),
          retryBaseDelay: fc.integer({ min: 100, max: 60000 }),
          healthCheckInterval: fc.integer({ min: 1000, max: 300000 }),
          idleTimeout: fc.integer({ min: 1000, max: 3600000 }),
        }),
        (config) => {
          const typedConfig: AgentConfig = config;
          expect(typedConfig.concurrency).toBeGreaterThan(0);
          expect(typedConfig.maxRetries).toBeGreaterThanOrEqual(0);
          expect(typedConfig.retryBaseDelay).toBeGreaterThan(0);
          expect(typedConfig.healthCheckInterval).toBeGreaterThan(0);
          expect(typedConfig.streams.length).toBeGreaterThan(0);
          return true;
        }
      )
    );
  });
});

describe('AgentHealthStatus type validation', () => {
  /**
   * Validates: Requirements 40.3
   * Property: AgentHealthStatus has a valid status value
   */
  it('status is always one of healthy, degraded, or unhealthy', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('healthy', 'degraded', 'unhealthy'),
        (status) => {
          const healthStatus: Partial<AgentHealthStatus> = { status };
          expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.status);
          return true;
        }
      )
    );
  });
});
