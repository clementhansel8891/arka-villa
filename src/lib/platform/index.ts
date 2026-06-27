/**
 * Platform Module - Barrel Export
 *
 * Orchestration layer for the multi-villa management platform.
 * Wires all event-driven agents together, manages saga flows,
 * and provides a single startup/shutdown interface.
 *
 * Usage:
 *   import { startPlatform, shutdownPlatform } from '@/lib/platform';
 *
 * Requirements: 5.2, 5.5, 8.1, 11.6, 28.7, 42.3
 */

// Platform Startup
export {
  startPlatform,
  getPlatformInstance,
  shutdownPlatform,
} from './startup';
export type { PlatformConfig, PlatformInstance } from './startup';

// Agent Orchestrator
export { AgentOrchestrator } from './agent-orchestrator';
export type {
  RegisteredAgent,
  OrchestratorStatus,
  AgentSummary,
  OrchestratorConfig,
} from './agent-orchestrator';

// Saga Registry
export {
  getSaga,
  getAllSagas,
  getSagasForAgent,
  getNextSagaStep,
  getCompensatingActions,
  BOOKING_CONFIRMATION_SAGA,
  BOOKING_CANCELLATION_SAGA,
  MAINTENANCE_COMPLETION_SAGA,
  VILLA_REGISTRATION_SAGA,
} from './saga-registry';
export type {
  SagaDefinition,
  SagaStep,
  CompensatingAction,
} from './saga-registry';
