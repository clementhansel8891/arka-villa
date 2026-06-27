/**
 * Saga Registry
 *
 * Registry of saga definitions and their steps for coordinating
 * multi-step distributed flows across agents.
 *
 * Sagas follow the choreography pattern: each agent handles its step
 * and emits events that trigger the next step. The registry documents
 * the expected flow and provides compensating actions for rollback.
 *
 * Requirements: 5.2, 5.5, 8.1, 11.6, 42.3
 */

// ─── Saga Types ───────────────────────────────────────────────────────────────

export interface SagaStep {
  /** Step order within the saga */
  order: number;
  /** Agent responsible for this step */
  agent: string;
  /** Event type that triggers this step */
  triggerEvent: string;
  /** Expected success event emitted on completion */
  expectedOutcome: string;
  /** Step-level timeout in milliseconds */
  timeout: number;
  /** Events that trigger compensation for this step */
  compensateOn: string[];
  /** Human-readable description of the step */
  description: string;
}

export interface CompensatingAction {
  /** Which step this compensates */
  forStep: number;
  /** Event to emit for rollback */
  action: string;
  /** Description of the compensating action */
  description: string;
}

export interface SagaDefinition {
  /** Unique saga identifier */
  id: string;
  /** Human-readable saga name */
  name: string;
  /** Ordered saga steps */
  steps: SagaStep[];
  /** Compensating actions for rollback on failure */
  compensatingActions: CompensatingAction[];
  /** Overall saga timeout in milliseconds */
  timeout: number;
}

// ─── Saga Definitions ─────────────────────────────────────────────────────────

/**
 * Booking Confirmation Saga
 *
 * Flow: booking.created → reserve dates → process payment →
 *       booking.confirmed → sync channels → notify guest
 *
 * Requirements: 5.2, 42.3
 */
export const BOOKING_CONFIRMATION_SAGA: SagaDefinition = {
  id: 'booking-confirmation-saga',
  name: 'Booking Confirmation',
  timeout: 300_000, // 5 minutes overall
  steps: [
    {
      order: 1,
      agent: 'booking-agent',
      triggerEvent: 'booking.created',
      expectedOutcome: 'availability.updated',
      timeout: 10_000,
      compensateOn: ['payment.failed'],
      description: 'Booking created, emit availability update to reserve dates',
    },
    {
      order: 2,
      agent: 'booking-agent',
      triggerEvent: 'payment.completed',
      expectedOutcome: 'booking.confirmed',
      timeout: 30_000,
      compensateOn: ['payment.failed', 'payment.refunded'],
      description: 'Payment completed, confirm the booking',
    },
    {
      order: 3,
      agent: 'booking-agent',
      triggerEvent: 'booking.confirmed',
      expectedOutcome: 'availability.updated',
      timeout: 60_000,
      compensateOn: [],
      description: 'Booking confirmed, generate financial transactions and emit availability sync',
    },
    {
      order: 4,
      agent: 'channel-sync-agent',
      triggerEvent: 'availability.updated',
      expectedOutcome: 'channel.sync_completed',
      timeout: 60_000,
      compensateOn: ['channel.sync_failed'],
      description: 'Channel Sync Agent pushes updated availability to OTAs',
    },
    {
      order: 5,
      agent: 'notification-agent',
      triggerEvent: 'notification.send_requested',
      expectedOutcome: 'notification.delivered',
      timeout: 30_000,
      compensateOn: [],
      description: 'Notification Agent sends confirmation to guest',
    },
  ],
  compensatingActions: [
    {
      forStep: 1,
      action: 'availability.released',
      description: 'Release reserved dates back to available',
    },
    {
      forStep: 2,
      action: 'payment.refunded',
      description: 'Refund payment if booking confirmation fails',
    },
    {
      forStep: 4,
      action: 'channel.sync_started',
      description: 'Revert channel state to previous availability',
    },
  ],
};

/**
 * Booking Cancellation Saga
 *
 * Flow: booking.cancelled → release dates → refund →
 *       sync channels → notify guest
 *
 * Requirements: 5.5
 */
export const BOOKING_CANCELLATION_SAGA: SagaDefinition = {
  id: 'booking-cancellation-saga',
  name: 'Booking Cancellation',
  timeout: 180_000, // 3 minutes overall
  steps: [
    {
      order: 1,
      agent: 'booking-agent',
      triggerEvent: 'booking.cancelled',
      expectedOutcome: 'availability.released',
      timeout: 10_000,
      compensateOn: [],
      description: 'Booking cancelled, emit availability.released to free dates',
    },
    {
      order: 2,
      agent: 'channel-sync-agent',
      triggerEvent: 'availability.released',
      expectedOutcome: 'channel.sync_completed',
      timeout: 60_000,
      compensateOn: ['channel.sync_failed'],
      description: 'Channel Sync Agent pushes updated availability to OTAs',
    },
    {
      order: 3,
      agent: 'notification-agent',
      triggerEvent: 'notification.send_requested',
      expectedOutcome: 'notification.delivered',
      timeout: 30_000,
      compensateOn: [],
      description: 'Notification Agent sends cancellation notice to guest',
    },
  ],
  compensatingActions: [
    {
      forStep: 1,
      action: 'availability.updated',
      description: 'Re-reserve dates if cancellation needs to be reversed',
    },
  ],
};

/**
 * Maintenance Completion Saga
 *
 * Flow: maintenance completed → verify evidence → update status →
 *       record cost → notify owner
 *
 * Requirements: 11.6
 */
export const MAINTENANCE_COMPLETION_SAGA: SagaDefinition = {
  id: 'maintenance-completion-saga',
  name: 'Maintenance Completion',
  timeout: 120_000, // 2 minutes overall
  steps: [
    {
      order: 1,
      agent: 'maintenance-agent',
      triggerEvent: 'maintenance.completed',
      expectedOutcome: 'maintenance.completed',
      timeout: 10_000,
      compensateOn: [],
      description: 'Verify completion evidence (timestamp + photos) before accepting',
    },
    {
      order: 2,
      agent: 'financial-reconciliation-agent',
      triggerEvent: 'maintenance.completed',
      expectedOutcome: 'payment.reconciled',
      timeout: 30_000,
      compensateOn: [],
      description: 'Record maintenance cost as financial transaction',
    },
    {
      order: 3,
      agent: 'notification-agent',
      triggerEvent: 'notification.send_requested',
      expectedOutcome: 'notification.delivered',
      timeout: 30_000,
      compensateOn: [],
      description: 'Notify villa owner of completed maintenance and cost',
    },
  ],
  compensatingActions: [
    {
      forStep: 1,
      action: 'maintenance.assigned',
      description: 'Revert ticket status back to in-progress',
    },
    {
      forStep: 2,
      action: 'payment.refunded',
      description: 'Remove recorded cost entry',
    },
  ],
};

/**
 * Villa Registration Saga
 *
 * Flow: tenant created → provision schema → configure channels →
 *       generate website
 *
 * Requirements: 8.1
 */
export const VILLA_REGISTRATION_SAGA: SagaDefinition = {
  id: 'villa-registration-saga',
  name: 'Villa Registration',
  timeout: 60_000, // 1 minute overall
  steps: [
    {
      order: 1,
      agent: 'system',
      triggerEvent: 'tenant.created',
      expectedOutcome: 'tenant.schema_provisioned',
      timeout: 10_000,
      compensateOn: ['tenant.schema_provision_failed'],
      description: 'Create tenant and provision dedicated PostgreSQL schema',
    },
    {
      order: 2,
      agent: 'channel-sync-agent',
      triggerEvent: 'tenant.schema_provisioned',
      expectedOutcome: 'channel.configured',
      timeout: 20_000,
      compensateOn: ['channel.configuration_failed'],
      description: 'Configure OTA channel connections for new villa',
    },
    {
      order: 3,
      agent: 'system',
      triggerEvent: 'channel.configured',
      expectedOutcome: 'villa_site.generated',
      timeout: 30_000,
      compensateOn: ['villa_site.generation_failed'],
      description: 'Generate villa website with subdomain',
    },
  ],
  compensatingActions: [
    {
      forStep: 1,
      action: 'tenant.schema_dropped',
      description: 'Drop the provisioned schema on failure',
    },
    {
      forStep: 2,
      action: 'channel.configuration_reverted',
      description: 'Remove channel configurations',
    },
    {
      forStep: 3,
      action: 'villa_site.removed',
      description: 'Remove the generated website and subdomain',
    },
  ],
};

// ─── Saga Registry ────────────────────────────────────────────────────────────

/** All registered saga definitions */
const SAGA_REGISTRY: Map<string, SagaDefinition> = new Map([
  [BOOKING_CONFIRMATION_SAGA.id, BOOKING_CONFIRMATION_SAGA],
  [BOOKING_CANCELLATION_SAGA.id, BOOKING_CANCELLATION_SAGA],
  [MAINTENANCE_COMPLETION_SAGA.id, MAINTENANCE_COMPLETION_SAGA],
  [VILLA_REGISTRATION_SAGA.id, VILLA_REGISTRATION_SAGA],
]);

/**
 * Get a saga definition by ID.
 */
export function getSaga(sagaId: string): SagaDefinition | undefined {
  return SAGA_REGISTRY.get(sagaId);
}

/**
 * Get all registered saga definitions.
 */
export function getAllSagas(): SagaDefinition[] {
  return Array.from(SAGA_REGISTRY.values());
}

/**
 * Get sagas that involve a specific agent.
 */
export function getSagasForAgent(agentName: string): SagaDefinition[] {
  return getAllSagas().filter((saga) =>
    saga.steps.some((step) => step.agent === agentName),
  );
}

/**
 * Get the next step in a saga given the current event type.
 * Returns undefined if no matching step or if it's the final step.
 */
export function getNextSagaStep(
  sagaId: string,
  currentEvent: string,
): SagaStep | undefined {
  const saga = SAGA_REGISTRY.get(sagaId);
  if (!saga) return undefined;

  const currentStep = saga.steps.find(
    (step) => step.triggerEvent === currentEvent,
  );
  if (!currentStep) return undefined;

  return saga.steps.find((step) => step.order === currentStep.order + 1);
}

/**
 * Get compensating actions for a saga step that failed.
 * Returns actions for the failed step and all preceding completed steps.
 */
export function getCompensatingActions(
  sagaId: string,
  failedAtStep: number,
): CompensatingAction[] {
  const saga = SAGA_REGISTRY.get(sagaId);
  if (!saga) return [];

  // Return compensating actions for the failed step and all preceding steps
  return saga.compensatingActions
    .filter((ca) => ca.forStep <= failedAtStep)
    .sort((a, b) => b.forStep - a.forStep); // Reverse order for rollback
}
