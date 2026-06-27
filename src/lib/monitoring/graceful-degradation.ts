/**
 * Graceful Degradation - Feature shedding under resource pressure.
 *
 * Implements a priority-based degradation strategy:
 * - NEVER shed: bookings, payments, authentication
 * - DELAY under load: report generation, AI responses
 * - SHED first: analytics sync, non-critical notifications, marketing data
 *
 * Requirements: 37.6, 16.6, 16.3
 */

import type { ResourceMetrics, ResourceLevel } from './resource-monitor';

// --- Types ---

export type FeaturePriority = 'critical' | 'high' | 'medium' | 'low';

export type DegradationAction = 'allow' | 'delay' | 'shed';

export interface FeatureConfig {
  name: string;
  priority: FeaturePriority;
  /** Optional delay in ms when feature is in 'delay' mode */
  delayMs?: number;
  /** Description for logging/monitoring */
  description: string;
}

export interface DegradationDecision {
  feature: string;
  action: DegradationAction;
  reason: string;
  delayMs?: number;
  timestamp: number;
}

export interface DegradationStatus {
  isActive: boolean;
  level: 'none' | 'partial' | 'aggressive';
  degradedFeatures: DegradationDecision[];
  timestamp: number;
}

export interface DegradationConfig {
  /** Overall resource level that triggers partial degradation */
  partialDegradationLevel: ResourceLevel;
  /** Overall resource level that triggers aggressive degradation */
  aggressiveDegradationLevel: ResourceLevel;
  /** Default delay for medium-priority features under partial degradation */
  defaultDelayMs: number;
}

// --- Feature Registry ---

/**
 * Platform features organized by priority for degradation decisions.
 * Critical features are NEVER degraded.
 */
export const PLATFORM_FEATURES: FeatureConfig[] = [
  // Critical - never shed
  {
    name: 'bookings',
    priority: 'critical',
    description: 'Booking creation, modification, and confirmation',
  },
  {
    name: 'payments',
    priority: 'critical',
    description: 'Payment processing and refunds (Stripe/Midtrans)',
  },
  {
    name: 'authentication',
    priority: 'critical',
    description: 'Login, logout, session management, MFA',
  },
  {
    name: 'channel-sync-inbound',
    priority: 'critical',
    description: 'Inbound reservation sync from OTAs',
  },

  // High - delayed only under aggressive degradation
  {
    name: 'guest-messaging',
    priority: 'high',
    description: 'Guest communication and notifications',
  },
  {
    name: 'channel-sync-outbound',
    priority: 'high',
    description: 'Outbound availability/rate pushes to OTAs',
  },
  {
    name: 'maintenance-critical',
    priority: 'high',
    description: 'Critical maintenance ticket creation and alerts',
  },
  {
    name: 'escalations',
    priority: 'high',
    description: 'Overdue task and SLA breach escalations',
  },

  // Medium - delayed under partial, shed under aggressive
  {
    name: 'report-generation',
    priority: 'medium',
    delayMs: 5000,
    description: 'Financial and occupancy report generation',
  },
  {
    name: 'ai-responses',
    priority: 'medium',
    delayMs: 3000,
    description: 'AI chat responses and context preparation',
  },
  {
    name: 'maintenance-non-critical',
    priority: 'medium',
    delayMs: 2000,
    description: 'Non-critical maintenance ticket processing',
  },
  {
    name: 'staff-tasks',
    priority: 'medium',
    delayMs: 2000,
    description: 'Staff task assignment and updates',
  },

  // Low - shed first
  {
    name: 'analytics-sync',
    priority: 'low',
    description: 'Marketing analytics data synchronization',
  },
  {
    name: 'non-critical-notifications',
    priority: 'low',
    description: 'Low-priority digest notifications',
  },
  {
    name: 'marketing-data-pull',
    priority: 'low',
    description: 'Meta/Google Ads metrics polling',
  },
  {
    name: 'ai-context-preparation',
    priority: 'low',
    description: 'Background AI context indexing and pruning',
  },
  {
    name: 'iot-non-critical',
    priority: 'low',
    description: 'Non-critical IoT device telemetry processing',
  },
];

// --- Default Configuration ---

export const DEFAULT_DEGRADATION_CONFIG: DegradationConfig = {
  partialDegradationLevel: 'warn',
  aggressiveDegradationLevel: 'critical',
  defaultDelayMs: 3000,
};

// --- Core Logic ---

/**
 * Determines the worst resource level across all metrics.
 */
export function getOverallResourceLevel(metrics: ResourceMetrics): ResourceLevel {
  const levels: ResourceLevel[] = [
    metrics.cpu.level,
    metrics.memory.level,
    metrics.disk.level,
  ];

  if (levels.includes('critical')) return 'critical';
  if (levels.includes('warn')) return 'warn';
  return 'normal';
}

/**
 * Determines the degradation action for a feature based on
 * the current overall resource level.
 */
export function getFeatureAction(
  feature: FeatureConfig,
  overallLevel: ResourceLevel,
  config: DegradationConfig = DEFAULT_DEGRADATION_CONFIG
): DegradationAction {
  // Normal conditions - everything is allowed
  if (overallLevel === 'normal') return 'allow';

  // Based on priority
  switch (feature.priority) {
    case 'critical':
      // Never degrade critical features
      return 'allow';

    case 'high':
      // High-priority: allowed under warn, delayed under critical
      if (overallLevel === 'warn') return 'allow';
      return 'delay';

    case 'medium':
      // Medium-priority: delayed under warn, shed under critical
      if (overallLevel === 'warn') return 'delay';
      return 'shed';

    case 'low':
      // Low-priority: shed under both warn and critical
      return 'shed';

    default:
      return 'allow';
  }
}

/**
 * Evaluates the full degradation status for all features
 * based on current resource metrics.
 */
export function evaluateDegradation(
  metrics: ResourceMetrics,
  features: FeatureConfig[] = PLATFORM_FEATURES,
  config: DegradationConfig = DEFAULT_DEGRADATION_CONFIG
): DegradationStatus {
  const overallLevel = getOverallResourceLevel(metrics);
  const now = metrics.timestamp;

  if (overallLevel === 'normal') {
    return {
      isActive: false,
      level: 'none',
      degradedFeatures: [],
      timestamp: now,
    };
  }

  const degradedFeatures: DegradationDecision[] = [];

  for (const feature of features) {
    const action = getFeatureAction(feature, overallLevel, config);

    if (action !== 'allow') {
      const decision: DegradationDecision = {
        feature: feature.name,
        action,
        reason: buildDegradationReason(feature, overallLevel, metrics),
        timestamp: now,
      };

      if (action === 'delay') {
        decision.delayMs = feature.delayMs ?? config.defaultDelayMs;
      }

      degradedFeatures.push(decision);
    }
  }

  const level = overallLevel === 'critical' ? 'aggressive' : 'partial';

  return {
    isActive: true,
    level,
    degradedFeatures,
    timestamp: now,
  };
}

/**
 * Checks if a specific feature should be allowed to proceed.
 * Returns the degradation decision for the feature.
 */
export function checkFeatureAvailability(
  featureName: string,
  metrics: ResourceMetrics,
  features: FeatureConfig[] = PLATFORM_FEATURES,
  config: DegradationConfig = DEFAULT_DEGRADATION_CONFIG
): DegradationDecision {
  const feature = features.find((f) => f.name === featureName);
  const overallLevel = getOverallResourceLevel(metrics);
  const now = metrics.timestamp;

  if (!feature) {
    // Unknown features are treated as medium priority
    const action = overallLevel === 'normal' ? 'allow' : overallLevel === 'warn' ? 'delay' : 'shed';
    return {
      feature: featureName,
      action,
      reason: `Unknown feature "${featureName}" treated as medium priority`,
      timestamp: now,
      delayMs: action === 'delay' ? config.defaultDelayMs : undefined,
    };
  }

  const action = getFeatureAction(feature, overallLevel, config);

  return {
    feature: featureName,
    action,
    reason:
      action === 'allow'
        ? `Feature "${featureName}" is allowed (priority: ${feature.priority})`
        : buildDegradationReason(feature, overallLevel, metrics),
    timestamp: now,
    delayMs: action === 'delay' ? (feature.delayMs ?? config.defaultDelayMs) : undefined,
  };
}

// --- Helpers ---

function buildDegradationReason(
  feature: FeatureConfig,
  overallLevel: ResourceLevel,
  metrics: ResourceMetrics
): string {
  const constrainedResources: string[] = [];
  if (metrics.cpu.level !== 'normal') constrainedResources.push(`CPU ${metrics.cpu.usagePercent.toFixed(1)}%`);
  if (metrics.memory.level !== 'normal') constrainedResources.push(`Memory ${metrics.memory.usagePercent.toFixed(1)}%`);
  if (metrics.disk.level !== 'normal') constrainedResources.push(`Disk ${metrics.disk.usagePercent.toFixed(1)}%`);

  const action = getFeatureAction(feature, overallLevel);
  return `Feature "${feature.name}" ${action === 'shed' ? 'shed' : 'delayed'}: resource pressure (${constrainedResources.join(', ')})`;
}

/**
 * Returns the degraded-mode user-facing message per Requirement 16.6:
 * "serve a degraded-mode response indicating temporary high demand"
 */
export function getDegradedModeMessage(status: DegradationStatus): string | null {
  if (!status.isActive) return null;

  if (status.level === 'aggressive') {
    return 'The platform is experiencing high demand. Some features may be temporarily unavailable or slower than usual. Bookings and payments continue to operate normally.';
  }

  return 'The platform is experiencing elevated load. Some background operations may be delayed. All core features remain available.';
}
