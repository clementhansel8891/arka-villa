/**
 * Monitoring utilities - barrel export.
 *
 * Consolidates resource monitoring, circuit breaker pattern,
 * and graceful degradation for the multi-villa platform.
 *
 * Requirements: 16.1, 16.3, 16.6, 37.2, 37.4, 37.5, 37.6
 */

// Resource Monitor
export {
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
export type {
  ResourceLevel,
  ResourceMetrics,
  CpuMetrics,
  MemoryMetrics,
  DiskMetrics,
  ResourceThresholds,
  ResourceAlert,
  ResourceMonitorConfig,
  AlertTracker,
} from './resource-monitor';

// Circuit Breaker
export {
  createCircuitBreakerState,
  shouldAllowRequest,
  transitionToHalfOpen,
  recordSuccess,
  recordFailure,
  createRejectionEvent,
  executeWithCircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './circuit-breaker';
export type {
  CircuitState,
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitBreakerEvent,
  CircuitBreakerListener,
} from './circuit-breaker';

// Graceful Degradation
export {
  getOverallResourceLevel,
  getFeatureAction,
  evaluateDegradation,
  checkFeatureAvailability,
  getDegradedModeMessage,
  PLATFORM_FEATURES,
  DEFAULT_DEGRADATION_CONFIG,
} from './graceful-degradation';
export type {
  FeaturePriority,
  DegradationAction,
  FeatureConfig,
  DegradationDecision,
  DegradationStatus,
  DegradationConfig,
} from './graceful-degradation';
