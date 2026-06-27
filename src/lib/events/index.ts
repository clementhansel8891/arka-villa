/**
 * Events library exports.
 *
 * Core types, stream constants, validation, and event bus
 * for the platform event-driven architecture and agent system.
 */

export type {
  PlatformEvent,
  AgentConfig,
  AgentLifecycle,
  AgentHealthStatus,
  AgentMetrics,
  ProcessingResult,
} from './types';

export { STREAMS, ALL_STREAMS, type StreamName } from './streams';

export {
  validateEvent,
  assertValidEvent,
  EventValidationError,
  type ValidationError,
  type ValidationResult,
} from './validation';

export {
  EventBus,
  type EventHandler,
  type EventMetadata,
  type SubscribeOptions,
  type DeadLetterEntry,
  type EventBusOptions,
} from './event-bus';
