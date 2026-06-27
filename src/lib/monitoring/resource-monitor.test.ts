import { describe, it, expect } from 'vitest';
import {
  classifyCpuLevel,
  classifyMemoryLevel,
  classifyDiskLevel,
  collectMetrics,
  createAlertTracker,
  evaluateAlerts,
  DEFAULT_THRESHOLDS,
  DEFAULT_MONITOR_CONFIG,
  VPS_SPECS,
} from './resource-monitor';

describe('Resource Monitor', () => {
  describe('classifyCpuLevel', () => {
    it('returns normal when below warn threshold', () => {
      expect(classifyCpuLevel(50)).toBe('normal');
      expect(classifyCpuLevel(79.9)).toBe('normal');
    });

    it('returns warn when at or above warn threshold but below critical', () => {
      expect(classifyCpuLevel(80)).toBe('warn');
      expect(classifyCpuLevel(90)).toBe('warn');
      expect(classifyCpuLevel(94.9)).toBe('warn');
    });

    it('returns critical when at or above critical threshold', () => {
      expect(classifyCpuLevel(95)).toBe('critical');
      expect(classifyCpuLevel(100)).toBe('critical');
    });

    it('supports custom thresholds', () => {
      expect(classifyCpuLevel(70, { warn: 60, critical: 80 })).toBe('warn');
      expect(classifyCpuLevel(85, { warn: 60, critical: 80 })).toBe('critical');
    });
  });

  describe('classifyMemoryLevel', () => {
    it('returns normal when below warn threshold', () => {
      expect(classifyMemoryLevel(50)).toBe('normal');
      expect(classifyMemoryLevel(84.9)).toBe('normal');
    });

    it('returns warn when at or above warn threshold', () => {
      expect(classifyMemoryLevel(85)).toBe('warn');
      expect(classifyMemoryLevel(94)).toBe('warn');
    });

    it('returns critical at or above critical threshold', () => {
      expect(classifyMemoryLevel(95)).toBe('critical');
      expect(classifyMemoryLevel(99)).toBe('critical');
    });
  });

  describe('classifyDiskLevel', () => {
    it('returns normal when below warn threshold', () => {
      expect(classifyDiskLevel(50)).toBe('normal');
      expect(classifyDiskLevel(89.9)).toBe('normal');
    });

    it('returns warn when at or above warn threshold', () => {
      expect(classifyDiskLevel(90)).toBe('warn');
      expect(classifyDiskLevel(94)).toBe('warn');
    });

    it('returns critical at or above critical threshold', () => {
      expect(classifyDiskLevel(95)).toBe('critical');
      expect(classifyDiskLevel(100)).toBe('critical');
    });
  });

  describe('collectMetrics', () => {
    it('collects valid metrics with correct levels', () => {
      const metrics = collectMetrics(
        50, // CPU 50%
        16 * 1024 * 1024 * 1024, // 16GB used
        32 * 1024 * 1024 * 1024, // 32GB total
        200 * 1024 * 1024 * 1024, // 200GB used
        500 * 1024 * 1024 * 1024 // 500GB total
      );

      expect(metrics.cpu.usagePercent).toBe(50);
      expect(metrics.cpu.level).toBe('normal');
      expect(metrics.cpu.cores).toBe(VPS_SPECS.cpuCores);
      expect(metrics.memory.usagePercent).toBe(50);
      expect(metrics.memory.level).toBe('normal');
      expect(metrics.disk.usagePercent).toBe(40);
      expect(metrics.disk.level).toBe('normal');
      expect(metrics.timestamp).toBeGreaterThan(0);
    });

    it('clamps CPU to 0-100 range', () => {
      const metrics = collectMetrics(
        150,
        0,
        VPS_SPECS.ramBytes,
        0,
        VPS_SPECS.diskBytes
      );
      expect(metrics.cpu.usagePercent).toBe(100);

      const metrics2 = collectMetrics(
        -10,
        0,
        VPS_SPECS.ramBytes,
        0,
        VPS_SPECS.diskBytes
      );
      expect(metrics2.cpu.usagePercent).toBe(0);
    });

    it('handles zero total bytes gracefully', () => {
      const metrics = collectMetrics(50, 100, 0, 100, 0);
      expect(metrics.memory.usagePercent).toBe(0);
      expect(metrics.disk.usagePercent).toBe(0);
    });

    it('correctly identifies warn levels', () => {
      const metrics = collectMetrics(
        85, // CPU warn
        28 * 1024 * 1024 * 1024, // ~87.5% memory - warn
        32 * 1024 * 1024 * 1024,
        460 * 1024 * 1024 * 1024, // 92% disk - warn
        500 * 1024 * 1024 * 1024
      );

      expect(metrics.cpu.level).toBe('warn');
      expect(metrics.memory.level).toBe('warn');
      expect(metrics.disk.level).toBe('warn');
    });

    it('correctly identifies critical levels', () => {
      const metrics = collectMetrics(
        97, // CPU critical
        31 * 1024 * 1024 * 1024, // ~96.9% memory - critical
        32 * 1024 * 1024 * 1024,
        480 * 1024 * 1024 * 1024, // 96% disk - critical
        500 * 1024 * 1024 * 1024
      );

      expect(metrics.cpu.level).toBe('critical');
      expect(metrics.memory.level).toBe('critical');
      expect(metrics.disk.level).toBe('critical');
    });
  });

  describe('evaluateAlerts', () => {
    it('returns no alerts when all resources are normal', () => {
      const metrics = collectMetrics(
        50, 16e9, 32e9, 200e9, 500e9
      );
      const tracker = createAlertTracker();
      const { alerts, updatedTracker } = evaluateAlerts(metrics, tracker);

      expect(alerts).toHaveLength(0);
      expect(updatedTracker.cpuExceededSince).toBeNull();
      expect(updatedTracker.memoryExceededSince).toBeNull();
      expect(updatedTracker.diskExceededSince).toBeNull();
    });

    it('does not alert before threshold duration is reached', () => {
      const now = Date.now();
      const metrics = collectMetrics(90, 28e9, 32e9, 200e9, 500e9);
      // Override timestamp
      (metrics as { timestamp: number }).timestamp = now;

      const tracker = createAlertTracker();
      const { alerts, updatedTracker } = evaluateAlerts(metrics, tracker);

      // No alert yet - just started tracking
      expect(alerts).toHaveLength(0);
      expect(updatedTracker.cpuExceededSince).toBe(now);
    });

    it('alerts when threshold duration is reached (5 minutes)', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const now = Date.now();

      const metrics = collectMetrics(90, 28e9, 32e9, 200e9, 500e9);
      (metrics as { timestamp: number }).timestamp = now;

      // Tracker shows CPU exceeded threshold 5 minutes ago
      const tracker = createAlertTracker();
      tracker.cpuExceededSince = fiveMinutesAgo;

      const { alerts } = evaluateAlerts(metrics, tracker);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].resource).toBe('cpu');
      expect(alerts[0].level).toBe('warn');
      expect(alerts[0].consecutiveMinutes).toBeGreaterThanOrEqual(5);
    });

    it('resets tracker when resource returns to normal', () => {
      const tracker = createAlertTracker();
      tracker.cpuExceededSince = Date.now() - 10 * 60 * 1000;

      // CPU now normal
      const metrics = collectMetrics(50, 16e9, 32e9, 200e9, 500e9);
      const { updatedTracker } = evaluateAlerts(metrics, tracker);

      expect(updatedTracker.cpuExceededSince).toBeNull();
    });

    it('generates alerts for multiple resources simultaneously', () => {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      const now = Date.now();

      const metrics = collectMetrics(96, 31e9, 32e9, 480e9, 500e9);
      (metrics as { timestamp: number }).timestamp = now;

      const tracker: ReturnType<typeof createAlertTracker> = {
        cpuExceededSince: tenMinutesAgo,
        memoryExceededSince: tenMinutesAgo,
        diskExceededSince: tenMinutesAgo,
      };

      const { alerts } = evaluateAlerts(metrics, tracker);

      expect(alerts.length).toBeGreaterThanOrEqual(3);
      expect(alerts.find((a) => a.resource === 'cpu')).toBeDefined();
      expect(alerts.find((a) => a.resource === 'memory')).toBeDefined();
      expect(alerts.find((a) => a.resource === 'disk')).toBeDefined();
    });
  });

  describe('DEFAULT_THRESHOLDS', () => {
    it('has correct default values per spec', () => {
      expect(DEFAULT_THRESHOLDS.cpu.warn).toBe(80);
      expect(DEFAULT_THRESHOLDS.cpu.critical).toBe(95);
      expect(DEFAULT_THRESHOLDS.memory.warn).toBe(85);
      expect(DEFAULT_THRESHOLDS.memory.critical).toBe(95);
      expect(DEFAULT_THRESHOLDS.disk.warn).toBe(90);
      expect(DEFAULT_THRESHOLDS.disk.critical).toBe(95);
    });
  });

  describe('DEFAULT_MONITOR_CONFIG', () => {
    it('alerts after 5 consecutive minutes', () => {
      expect(DEFAULT_MONITOR_CONFIG.alertAfterMinutes).toBe(5);
    });
  });
});
