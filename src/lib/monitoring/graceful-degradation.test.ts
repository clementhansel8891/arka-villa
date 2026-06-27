import { describe, it, expect } from 'vitest';
import {
  getOverallResourceLevel,
  getFeatureAction,
  evaluateDegradation,
  checkFeatureAvailability,
  getDegradedModeMessage,
  PLATFORM_FEATURES,
  DEFAULT_DEGRADATION_CONFIG,
} from './graceful-degradation';
import { collectMetrics } from './resource-monitor';
import type { ResourceMetrics } from './resource-monitor';

function makeMetrics(
  cpuPercent: number,
  memoryPercent: number,
  diskPercent: number
): ResourceMetrics {
  const memTotal = 32 * 1024 * 1024 * 1024;
  const diskTotal = 500 * 1024 * 1024 * 1024;
  return collectMetrics(
    cpuPercent,
    memTotal * (memoryPercent / 100),
    memTotal,
    diskTotal * (diskPercent / 100),
    diskTotal
  );
}

describe('Graceful Degradation', () => {
  describe('getOverallResourceLevel', () => {
    it('returns normal when all resources are normal', () => {
      const metrics = makeMetrics(50, 50, 50);
      expect(getOverallResourceLevel(metrics)).toBe('normal');
    });

    it('returns warn when any resource is at warn level', () => {
      const metrics = makeMetrics(85, 50, 50); // CPU at warn
      expect(getOverallResourceLevel(metrics)).toBe('warn');
    });

    it('returns critical when any resource is at critical level', () => {
      const metrics = makeMetrics(50, 96, 50); // Memory at critical
      expect(getOverallResourceLevel(metrics)).toBe('critical');
    });

    it('returns critical even if other resources are only at warn', () => {
      const metrics = makeMetrics(85, 96, 92); // CPU warn, memory critical, disk warn
      expect(getOverallResourceLevel(metrics)).toBe('critical');
    });
  });

  describe('getFeatureAction', () => {
    it('allows all features when resources are normal', () => {
      for (const feature of PLATFORM_FEATURES) {
        expect(getFeatureAction(feature, 'normal')).toBe('allow');
      }
    });

    it('always allows critical features regardless of resource level', () => {
      const criticalFeatures = PLATFORM_FEATURES.filter((f) => f.priority === 'critical');
      for (const feature of criticalFeatures) {
        expect(getFeatureAction(feature, 'warn')).toBe('allow');
        expect(getFeatureAction(feature, 'critical')).toBe('allow');
      }
    });

    it('allows high-priority features under warn', () => {
      const highFeatures = PLATFORM_FEATURES.filter((f) => f.priority === 'high');
      for (const feature of highFeatures) {
        expect(getFeatureAction(feature, 'warn')).toBe('allow');
      }
    });

    it('delays high-priority features under critical', () => {
      const highFeatures = PLATFORM_FEATURES.filter((f) => f.priority === 'high');
      for (const feature of highFeatures) {
        expect(getFeatureAction(feature, 'critical')).toBe('delay');
      }
    });

    it('delays medium-priority features under warn', () => {
      const mediumFeatures = PLATFORM_FEATURES.filter((f) => f.priority === 'medium');
      for (const feature of mediumFeatures) {
        expect(getFeatureAction(feature, 'warn')).toBe('delay');
      }
    });

    it('sheds medium-priority features under critical', () => {
      const mediumFeatures = PLATFORM_FEATURES.filter((f) => f.priority === 'medium');
      for (const feature of mediumFeatures) {
        expect(getFeatureAction(feature, 'critical')).toBe('shed');
      }
    });

    it('sheds low-priority features under both warn and critical', () => {
      const lowFeatures = PLATFORM_FEATURES.filter((f) => f.priority === 'low');
      for (const feature of lowFeatures) {
        expect(getFeatureAction(feature, 'warn')).toBe('shed');
        expect(getFeatureAction(feature, 'critical')).toBe('shed');
      }
    });
  });

  describe('evaluateDegradation', () => {
    it('returns inactive status when resources are normal', () => {
      const metrics = makeMetrics(50, 50, 50);
      const status = evaluateDegradation(metrics);

      expect(status.isActive).toBe(false);
      expect(status.level).toBe('none');
      expect(status.degradedFeatures).toHaveLength(0);
    });

    it('returns partial degradation under warn level', () => {
      const metrics = makeMetrics(85, 50, 50); // CPU at warn
      const status = evaluateDegradation(metrics);

      expect(status.isActive).toBe(true);
      expect(status.level).toBe('partial');
      expect(status.degradedFeatures.length).toBeGreaterThan(0);
    });

    it('returns aggressive degradation under critical level', () => {
      const metrics = makeMetrics(97, 50, 50); // CPU at critical
      const status = evaluateDegradation(metrics);

      expect(status.isActive).toBe(true);
      expect(status.level).toBe('aggressive');
      expect(status.degradedFeatures.length).toBeGreaterThan(0);
    });

    it('never sheds bookings, payments, or authentication', () => {
      const metrics = makeMetrics(99, 99, 99); // Everything critical
      const status = evaluateDegradation(metrics);

      const criticalNames = ['bookings', 'payments', 'authentication', 'channel-sync-inbound'];
      for (const name of criticalNames) {
        const decision = status.degradedFeatures.find((d) => d.feature === name);
        expect(decision).toBeUndefined();
      }
    });

    it('sheds analytics and non-critical notifications first under warn', () => {
      const metrics = makeMetrics(85, 50, 50);
      const status = evaluateDegradation(metrics);

      const shedFeatures = status.degradedFeatures.filter((d) => d.action === 'shed');
      const shedNames = shedFeatures.map((d) => d.feature);

      expect(shedNames).toContain('analytics-sync');
      expect(shedNames).toContain('non-critical-notifications');
      expect(shedNames).toContain('marketing-data-pull');
    });

    it('includes delay information for delayed features', () => {
      const metrics = makeMetrics(85, 50, 50); // Warn level
      const status = evaluateDegradation(metrics);

      const delayedFeatures = status.degradedFeatures.filter((d) => d.action === 'delay');
      for (const decision of delayedFeatures) {
        expect(decision.delayMs).toBeGreaterThan(0);
      }
    });
  });

  describe('checkFeatureAvailability', () => {
    it('allows known critical features under pressure', () => {
      const metrics = makeMetrics(99, 99, 99);
      const decision = checkFeatureAvailability('bookings', metrics);
      expect(decision.action).toBe('allow');
    });

    it('sheds low-priority features under warn', () => {
      const metrics = makeMetrics(85, 50, 50);
      const decision = checkFeatureAvailability('analytics-sync', metrics);
      expect(decision.action).toBe('shed');
    });

    it('delays medium-priority features under warn', () => {
      const metrics = makeMetrics(85, 50, 50);
      const decision = checkFeatureAvailability('report-generation', metrics);
      expect(decision.action).toBe('delay');
      expect(decision.delayMs).toBeGreaterThan(0);
    });

    it('handles unknown features as medium priority', () => {
      const metrics = makeMetrics(85, 50, 50);
      const decision = checkFeatureAvailability('unknown-feature', metrics);
      expect(decision.action).toBe('delay');
    });

    it('returns allow for unknown features when normal', () => {
      const metrics = makeMetrics(50, 50, 50);
      const decision = checkFeatureAvailability('unknown-feature', metrics);
      expect(decision.action).toBe('allow');
    });
  });

  describe('getDegradedModeMessage', () => {
    it('returns null when degradation is not active', () => {
      const status = evaluateDegradation(makeMetrics(50, 50, 50));
      expect(getDegradedModeMessage(status)).toBeNull();
    });

    it('returns partial message under warn', () => {
      const status = evaluateDegradation(makeMetrics(85, 50, 50));
      const message = getDegradedModeMessage(status);
      expect(message).toContain('elevated load');
      expect(message).toContain('core features remain available');
    });

    it('returns aggressive message under critical', () => {
      const status = evaluateDegradation(makeMetrics(97, 50, 50));
      const message = getDegradedModeMessage(status);
      expect(message).toContain('high demand');
      expect(message).toContain('Bookings and payments');
    });
  });

  describe('PLATFORM_FEATURES', () => {
    it('includes critical features that should never be shed', () => {
      const criticalFeatures = PLATFORM_FEATURES.filter((f) => f.priority === 'critical');
      const names = criticalFeatures.map((f) => f.name);
      expect(names).toContain('bookings');
      expect(names).toContain('payments');
      expect(names).toContain('authentication');
    });

    it('includes low-priority features that are shed first', () => {
      const lowFeatures = PLATFORM_FEATURES.filter((f) => f.priority === 'low');
      const names = lowFeatures.map((f) => f.name);
      expect(names).toContain('analytics-sync');
      expect(names).toContain('non-critical-notifications');
      expect(names).toContain('marketing-data-pull');
    });

    it('classifies report-generation and ai-responses as medium priority', () => {
      const mediumFeatures = PLATFORM_FEATURES.filter((f) => f.priority === 'medium');
      const names = mediumFeatures.map((f) => f.name);
      expect(names).toContain('report-generation');
      expect(names).toContain('ai-responses');
    });
  });
});
