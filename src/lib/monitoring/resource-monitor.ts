/**
 * Resource Monitor - Tracks CPU, memory, and disk usage on the VPS.
 *
 * Provides real-time metrics collection and threshold-based alerting
 * for the single VPS deployment (8 CPU, 32GB RAM, 500GB disk).
 *
 * Requirements: 37.2, 37.4, 37.5, 16.6
 */

// --- Types ---

export type ResourceLevel = 'normal' | 'warn' | 'critical';

export interface ResourceMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  timestamp: number;
}

export interface CpuMetrics {
  usagePercent: number;
  level: ResourceLevel;
  cores: number;
}

export interface MemoryMetrics {
  usagePercent: number;
  usedBytes: number;
  totalBytes: number;
  level: ResourceLevel;
}

export interface DiskMetrics {
  usagePercent: number;
  usedBytes: number;
  totalBytes: number;
  level: ResourceLevel;
}

export interface ResourceThresholds {
  cpu: { warn: number; critical: number };
  memory: { warn: number; critical: number };
  disk: { warn: number; critical: number };
}

export interface ResourceAlert {
  resource: 'cpu' | 'memory' | 'disk';
  level: ResourceLevel;
  currentValue: number;
  threshold: number;
  message: string;
  timestamp: number;
  consecutiveMinutes: number;
}

export interface ResourceMonitorConfig {
  thresholds: ResourceThresholds;
  alertAfterMinutes: number;
  pollIntervalMs: number;
}

// --- Default Configuration ---

export const DEFAULT_THRESHOLDS: ResourceThresholds = {
  cpu: { warn: 80, critical: 95 },
  memory: { warn: 85, critical: 95 },
  disk: { warn: 90, critical: 95 },
};

export const DEFAULT_MONITOR_CONFIG: ResourceMonitorConfig = {
  thresholds: DEFAULT_THRESHOLDS,
  alertAfterMinutes: 5,
  pollIntervalMs: 60_000,
};

// VPS envelope constants
export const VPS_SPECS = {
  cpuCores: 8,
  ramBytes: 32 * 1024 * 1024 * 1024, // 32GB
  diskBytes: 500 * 1024 * 1024 * 1024, // 500GB
} as const;

// --- Level Classification ---

export function classifyCpuLevel(
  usagePercent: number,
  thresholds: ResourceThresholds['cpu'] = DEFAULT_THRESHOLDS.cpu
): ResourceLevel {
  if (usagePercent >= thresholds.critical) return 'critical';
  if (usagePercent >= thresholds.warn) return 'warn';
  return 'normal';
}

export function classifyMemoryLevel(
  usagePercent: number,
  thresholds: ResourceThresholds['memory'] = DEFAULT_THRESHOLDS.memory
): ResourceLevel {
  if (usagePercent >= thresholds.critical) return 'critical';
  if (usagePercent >= thresholds.warn) return 'warn';
  return 'normal';
}

export function classifyDiskLevel(
  usagePercent: number,
  thresholds: ResourceThresholds['disk'] = DEFAULT_THRESHOLDS.disk
): ResourceLevel {
  if (usagePercent >= thresholds.critical) return 'critical';
  if (usagePercent >= thresholds.warn) return 'warn';
  return 'normal';
}

// --- Metrics Collection ---

/**
 * Collects current system resource metrics.
 * Uses Node.js process/OS APIs for CPU and memory,
 * and configurable disk usage provider for disk.
 */
export function collectMetrics(
  cpuUsagePercent: number,
  memoryUsedBytes: number,
  memoryTotalBytes: number,
  diskUsedBytes: number,
  diskTotalBytes: number,
  thresholds: ResourceThresholds = DEFAULT_THRESHOLDS
): ResourceMetrics {
  const cpuPercent = Math.max(0, Math.min(100, cpuUsagePercent));
  const memPercent =
    memoryTotalBytes > 0
      ? Math.max(0, Math.min(100, (memoryUsedBytes / memoryTotalBytes) * 100))
      : 0;
  const diskPercent =
    diskTotalBytes > 0
      ? Math.max(0, Math.min(100, (diskUsedBytes / diskTotalBytes) * 100))
      : 0;

  return {
    cpu: {
      usagePercent: cpuPercent,
      level: classifyCpuLevel(cpuPercent, thresholds.cpu),
      cores: VPS_SPECS.cpuCores,
    },
    memory: {
      usagePercent: memPercent,
      usedBytes: memoryUsedBytes,
      totalBytes: memoryTotalBytes,
      level: classifyMemoryLevel(memPercent, thresholds.memory),
    },
    disk: {
      usagePercent: diskPercent,
      usedBytes: diskUsedBytes,
      totalBytes: diskTotalBytes,
      level: classifyDiskLevel(diskPercent, thresholds.disk),
    },
    timestamp: Date.now(),
  };
}

// --- Alert History Tracking ---

export interface AlertTracker {
  cpuExceededSince: number | null;
  memoryExceededSince: number | null;
  diskExceededSince: number | null;
}

export function createAlertTracker(): AlertTracker {
  return {
    cpuExceededSince: null,
    memoryExceededSince: null,
    diskExceededSince: null,
  };
}

/**
 * Evaluates current metrics against thresholds and determines
 * if an alert should fire based on consecutive duration.
 *
 * Returns alerts for resources that have exceeded thresholds
 * for the configured alertAfterMinutes duration (default: 5 min).
 */
export function evaluateAlerts(
  metrics: ResourceMetrics,
  tracker: AlertTracker,
  config: ResourceMonitorConfig = DEFAULT_MONITOR_CONFIG
): { alerts: ResourceAlert[]; updatedTracker: AlertTracker } {
  const now = metrics.timestamp;
  const thresholdMs = config.alertAfterMinutes * 60 * 1000;
  const alerts: ResourceAlert[] = [];
  const updatedTracker = { ...tracker };

  // CPU
  if (metrics.cpu.level !== 'normal') {
    if (updatedTracker.cpuExceededSince === null) {
      updatedTracker.cpuExceededSince = now;
    }
    const duration = now - updatedTracker.cpuExceededSince;
    if (duration >= thresholdMs) {
      const threshold =
        metrics.cpu.level === 'critical'
          ? config.thresholds.cpu.critical
          : config.thresholds.cpu.warn;
      alerts.push({
        resource: 'cpu',
        level: metrics.cpu.level,
        currentValue: metrics.cpu.usagePercent,
        threshold,
        message: `CPU usage at ${metrics.cpu.usagePercent.toFixed(1)}% (threshold: ${threshold}%) for ${Math.round(duration / 60000)} minutes`,
        timestamp: now,
        consecutiveMinutes: Math.round(duration / 60000),
      });
    }
  } else {
    updatedTracker.cpuExceededSince = null;
  }

  // Memory
  if (metrics.memory.level !== 'normal') {
    if (updatedTracker.memoryExceededSince === null) {
      updatedTracker.memoryExceededSince = now;
    }
    const duration = now - updatedTracker.memoryExceededSince;
    if (duration >= thresholdMs) {
      const threshold =
        metrics.memory.level === 'critical'
          ? config.thresholds.memory.critical
          : config.thresholds.memory.warn;
      alerts.push({
        resource: 'memory',
        level: metrics.memory.level,
        currentValue: metrics.memory.usagePercent,
        threshold,
        message: `Memory usage at ${metrics.memory.usagePercent.toFixed(1)}% (threshold: ${threshold}%) for ${Math.round(duration / 60000)} minutes`,
        timestamp: now,
        consecutiveMinutes: Math.round(duration / 60000),
      });
    }
  } else {
    updatedTracker.memoryExceededSince = null;
  }

  // Disk
  if (metrics.disk.level !== 'normal') {
    if (updatedTracker.diskExceededSince === null) {
      updatedTracker.diskExceededSince = now;
    }
    const duration = now - updatedTracker.diskExceededSince;
    if (duration >= thresholdMs) {
      const threshold =
        metrics.disk.level === 'critical'
          ? config.thresholds.disk.critical
          : config.thresholds.disk.warn;
      alerts.push({
        resource: 'disk',
        level: metrics.disk.level,
        currentValue: metrics.disk.usagePercent,
        threshold,
        message: `Disk usage at ${metrics.disk.usagePercent.toFixed(1)}% (threshold: ${threshold}%) for ${Math.round(duration / 60000)} minutes`,
        timestamp: now,
        consecutiveMinutes: Math.round(duration / 60000),
      });
    }
  } else {
    updatedTracker.diskExceededSince = null;
  }

  return { alerts, updatedTracker };
}
