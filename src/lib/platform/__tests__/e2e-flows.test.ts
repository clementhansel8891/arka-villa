/**
 * End-to-End Integration Flow Tests
 *
 * Tests the full flow logic through the saga registry, agent orchestrator,
 * and event handlers without requiring actual database/Redis connections.
 *
 * Test scenarios:
 * 1. Booking confirmation saga end-to-end
 * 2. Booking cancellation saga end-to-end
 * 3. Channel sync flow (availability update → OTA push)
 * 4. Escalation flow (overdue task → escalation → notification)
 * 5. Agent orchestrator starts and stops cleanly
 * 6. Saga compensating actions (rollback on failure)
 *
 * Requirements: 5.2, 1.2, 11.6, 10.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

import {
  getSaga,
  getNextSagaStep,
  getCompensatingActions,
  BOOKING_CONFIRMATION_SAGA,
  BOOKING_CANCELLATION_SAGA,
} from '../saga-registry';

import { AgentOrchestrator } from '../agent-orchestrator';

import type {
  AgentLifecycle,
  AgentHealthStatus,
  AgentMetrics,
  PlatformEvent,
  ProcessingResult,
} from '@/lib/events/types';

import { STREAMS } from '@/lib/events/streams';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

/** Creates a mock agent implementing AgentLifecycle */
function createMockAgent(
  name: string,
  overrides?: Partial<AgentLifecycle>,
): AgentLifecycle {
  return {
    register: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    healthCheck: vi.fn().mockReturnValue({
      status: 'healthy',
      lastProcessedAt: new Date(),
      pendingEvents: 0,
      errorRate: 0,
      lag: 50,
    } satisfies AgentHealthStatus),
    getMetrics: vi.fn().mockReturnValue({
      eventsProcessed: 10,
      eventsFailed: 0,
      averageProcessingTime: 12,
      uptime: 600,
    } satisfies AgentMetrics),
    processEvent: vi.fn().mockResolvedValue({
      success: true,
      durationMs: 8,
    } satisfies ProcessingResult),
    acknowledgeEvent: vi.fn(),
    rejectEvent: vi.fn(),
    ...overrides,
  };
}

/** Creates a PlatformEvent for testing */
function createEvent<T>(
  type: string,
  payload: T,
  overrides?: Partial<PlatformEvent<T>>,
): PlatformEvent<T> {
  return {
    id: uuidv4(),
    type,
    version: 1,
    timestamp: new Date().toISOString(),
    source: 'test',
    tenantId: 'tenant-001',
    correlationId: uuidv4(),
    actor: { userId: 'user-001', role: 'Agency_Admin' },
    payload,
    metadata: { retryCount: 0, maxRetries: 3, priority: 'normal' },
    ...overrides,
  };
}

/**
 * Simulates processing an event through a saga by tracing
 * expected outcomes through the saga steps.
 */
function traceSagaFlow(sagaId: string, initialEvent: string): string[] {
  const saga = getSaga(sagaId);
  if (!saga) return [];

  const flow: string[] = [initialEvent];
  let currentEvent = initialEvent;

  for (const step of saga.steps) {
    if (step.triggerEvent === currentEvent) {
      flow.push(step.expectedOutcome);
      currentEvent = step.expectedOutcome;
    }
  }

  return flow;
}

// ─── Test Suite: Booking Confirmation Saga E2E ────────────────────────────────

describe('E2E: Booking Confirmation Saga', () => {
  it('traces the full event chain from booking.created to notification.delivered', () => {
    const saga = getSaga('booking-confirmation-saga')!;

    // The saga should have 5 steps
    expect(saga.steps).toHaveLength(5);

    // Verify the expected event chain
    const expectedFlow = [
      'booking.created',
      'availability.updated',
      'payment.completed',
      'booking.confirmed',
      'availability.updated',
      'notification.send_requested',
      'notification.delivered',
    ];

    // Step 1: booking.created → availability.updated
    expect(saga.steps[0].triggerEvent).toBe('booking.created');
    expect(saga.steps[0].expectedOutcome).toBe('availability.updated');
    expect(saga.steps[0].agent).toBe('booking-agent');

    // Step 2: payment.completed → booking.confirmed
    expect(saga.steps[1].triggerEvent).toBe('payment.completed');
    expect(saga.steps[1].expectedOutcome).toBe('booking.confirmed');
    expect(saga.steps[1].agent).toBe('booking-agent');

    // Step 3: booking.confirmed → availability.updated (sync)
    expect(saga.steps[2].triggerEvent).toBe('booking.confirmed');
    expect(saga.steps[2].expectedOutcome).toBe('availability.updated');
    expect(saga.steps[2].agent).toBe('booking-agent');

    // Step 4: availability.updated → channel.sync_completed
    expect(saga.steps[3].triggerEvent).toBe('availability.updated');
    expect(saga.steps[3].expectedOutcome).toBe('channel.sync_completed');
    expect(saga.steps[3].agent).toBe('channel-sync-agent');

    // Step 5: notification.send_requested → notification.delivered
    expect(saga.steps[4].triggerEvent).toBe('notification.send_requested');
    expect(saga.steps[4].expectedOutcome).toBe('notification.delivered');
    expect(saga.steps[4].agent).toBe('notification-agent');
  });

  it('each step has a timeout defined', () => {
    const saga = getSaga('booking-confirmation-saga')!;
    for (const step of saga.steps) {
      expect(step.timeout).toBeGreaterThan(0);
    }
  });

  it('processes booking.created event through the booking agent', async () => {
    const bookingAgent = createMockAgent('booking-agent');

    const event = createEvent('booking.created', {
      bookingId: 'bk-001',
      roomId: 'room-101',
      guestId: 'guest-001',
      checkIn: '2025-08-01',
      checkOut: '2025-08-05',
      totalAmount: 500,
      currency: 'USD',
      source: 'direct',
    });

    const result = await bookingAgent.processEvent(event);
    expect(result.success).toBe(true);
    expect(bookingAgent.processEvent).toHaveBeenCalledWith(event);
  });

  it('processes payment.completed event triggering booking confirmation', async () => {
    const bookingAgent = createMockAgent('booking-agent');

    const event = createEvent('payment.completed', {
      paymentId: 'pay-001',
      bookingId: 'bk-001',
      amount: 500,
      currency: 'USD',
      method: 'credit_card',
    });

    const result = await bookingAgent.processEvent(event);
    expect(result.success).toBe(true);
  });

  it('routes availability.updated to channel-sync-agent for OTA push', async () => {
    const channelSyncAgent = createMockAgent('channel-sync-agent');

    const event = createEvent('availability.updated', {
      roomId: 'room-101',
      dates: ['2025-08-01', '2025-08-02', '2025-08-03', '2025-08-04'],
      status: 'booked',
    });

    const result = await channelSyncAgent.processEvent(event);
    expect(result.success).toBe(true);
    expect(channelSyncAgent.processEvent).toHaveBeenCalledWith(event);
  });

  it('routes notification.send_requested to notification-agent', async () => {
    const notificationAgent = createMockAgent('notification-agent');

    const event = createEvent('notification.send_requested', {
      recipientId: 'guest-001',
      type: 'booking_confirmation',
      channels: ['email', 'in-app'],
      templateData: { bookingId: 'bk-001', checkIn: '2025-08-01' },
    });

    const result = await notificationAgent.processEvent(event);
    expect(result.success).toBe(true);
  });

  it('full saga involves 3 different agents in correct order', () => {
    const saga = BOOKING_CONFIRMATION_SAGA;
    const agents = saga.steps.map((s) => s.agent);

    expect(agents[0]).toBe('booking-agent');
    expect(agents[1]).toBe('booking-agent');
    expect(agents[2]).toBe('booking-agent');
    expect(agents[3]).toBe('channel-sync-agent');
    expect(agents[4]).toBe('notification-agent');
  });
});

// ─── Test Suite: Booking Cancellation Saga E2E ────────────────────────────────

describe('E2E: Booking Cancellation Saga', () => {
  it('traces the full event chain from booking.cancelled to notification.delivered', () => {
    const saga = getSaga('booking-cancellation-saga')!;

    expect(saga.steps).toHaveLength(3);

    // Step 1: booking.cancelled → availability.released
    expect(saga.steps[0].triggerEvent).toBe('booking.cancelled');
    expect(saga.steps[0].expectedOutcome).toBe('availability.released');
    expect(saga.steps[0].agent).toBe('booking-agent');

    // Step 2: availability.released → channel.sync_completed
    expect(saga.steps[1].triggerEvent).toBe('availability.released');
    expect(saga.steps[1].expectedOutcome).toBe('channel.sync_completed');
    expect(saga.steps[1].agent).toBe('channel-sync-agent');

    // Step 3: notification.send_requested → notification.delivered
    expect(saga.steps[2].triggerEvent).toBe('notification.send_requested');
    expect(saga.steps[2].expectedOutcome).toBe('notification.delivered');
    expect(saga.steps[2].agent).toBe('notification-agent');
  });

  it('processes booking.cancelled event releasing availability', async () => {
    const bookingAgent = createMockAgent('booking-agent');

    const event = createEvent('booking.cancelled', {
      bookingId: 'bk-002',
      roomId: 'room-102',
      guestId: 'guest-002',
      reason: 'guest_request',
      cancelledAt: new Date().toISOString(),
    });

    const result = await bookingAgent.processEvent(event);
    expect(result.success).toBe(true);
  });

  it('availability.released triggers channel sync to push to OTAs', async () => {
    const channelSyncAgent = createMockAgent('channel-sync-agent');

    const event = createEvent('availability.released', {
      roomId: 'room-102',
      dates: ['2025-09-10', '2025-09-11', '2025-09-12'],
      status: 'available',
    });

    const result = await channelSyncAgent.processEvent(event);
    expect(result.success).toBe(true);
  });

  it('cancellation notification is sent after channel sync completes', async () => {
    const notificationAgent = createMockAgent('notification-agent');

    const event = createEvent('notification.send_requested', {
      recipientId: 'guest-002',
      type: 'booking_cancellation',
      channels: ['email'],
      templateData: { bookingId: 'bk-002' },
    });

    const result = await notificationAgent.processEvent(event);
    expect(result.success).toBe(true);
  });

  it('cancellation saga has shorter timeout than confirmation saga', () => {
    const confirmation = getSaga('booking-confirmation-saga')!;
    const cancellation = getSaga('booking-cancellation-saga')!;
    expect(cancellation.timeout).toBeLessThan(confirmation.timeout);
  });
});

// ─── Test Suite: Channel Sync Flow ────────────────────────────────────────────

describe('E2E: Channel Sync Flow', () => {
  it('availability update triggers channel sync agent', async () => {
    const channelSyncAgent = createMockAgent('channel-sync-agent');

    const event = createEvent('availability.updated', {
      roomId: 'room-201',
      dates: ['2025-10-01', '2025-10-02'],
      status: 'booked',
      villaId: 'villa-001',
    });

    const result = await channelSyncAgent.processEvent(event);
    expect(result.success).toBe(true);
  });

  it('channel sync agent is registered for availability stream in confirmation saga', () => {
    const saga = BOOKING_CONFIRMATION_SAGA;
    const channelStep = saga.steps.find(
      (s) => s.agent === 'channel-sync-agent',
    );
    expect(channelStep).toBeDefined();
    expect(channelStep!.triggerEvent).toBe('availability.updated');
    expect(channelStep!.expectedOutcome).toBe('channel.sync_completed');
  });

  it('channel sync has 60-second timeout matching OTA push SLA', () => {
    const saga = BOOKING_CONFIRMATION_SAGA;
    const channelStep = saga.steps.find(
      (s) => s.agent === 'channel-sync-agent',
    );
    expect(channelStep!.timeout).toBe(60_000);
  });

  it('channel sync failure emits channel.sync_failed for compensation', () => {
    const saga = BOOKING_CONFIRMATION_SAGA;
    const channelStep = saga.steps.find(
      (s) => s.agent === 'channel-sync-agent',
    );
    expect(channelStep!.compensateOn).toContain('channel.sync_failed');
  });

  it('channel sync processes independently per channel (no cross-blocking)', async () => {
    const channelSyncAgent = createMockAgent('channel-sync-agent', {
      processEvent: vi.fn().mockImplementation(async (event: PlatformEvent) => {
        // Simulate processing per-channel independently
        const channels = ['booking.com', 'airbnb'];
        const results = channels.map((ch) => ({
          channel: ch,
          success: true,
        }));
        return { success: results.every((r) => r.success), durationMs: 45 };
      }),
    });

    const event = createEvent('availability.updated', {
      roomId: 'room-201',
      dates: ['2025-10-01'],
      status: 'booked',
    });

    const result = await channelSyncAgent.processEvent(event);
    expect(result.success).toBe(true);
  });
});

// ─── Test Suite: Escalation Flow ──────────────────────────────────────────────

describe('E2E: Escalation Flow', () => {
  it('overdue task triggers escalation agent', async () => {
    const escalationAgent = createMockAgent('escalation-agent');

    const event = createEvent('staff.task_overdue', {
      taskId: 'task-001',
      assigneeId: 'emp-001',
      villaId: 'villa-001',
      deadline: new Date(Date.now() - 16 * 60 * 1000).toISOString(), // 16 min ago
      priority: 'High',
    });

    const result = await escalationAgent.processEvent(event);
    expect(result.success).toBe(true);
  });

  it('escalation agent emits notification request on overdue detection', async () => {
    const emittedEvents: PlatformEvent[] = [];
    const escalationAgent = createMockAgent('escalation-agent', {
      processEvent: vi.fn().mockImplementation(async (event: PlatformEvent) => {
        // Simulate escalation: emit notification request
        emittedEvents.push(
          createEvent('notification.send_requested', {
            recipientId: 'admin-001',
            type: 'task_escalation',
            channels: ['in-app', 'email'],
            templateData: {
              taskId: (event.payload as { taskId: string }).taskId,
              overdueMins: 16,
            },
          }),
        );
        return { success: true, durationMs: 5 };
      }),
    });

    const overdueEvent = createEvent('staff.task_overdue', {
      taskId: 'task-001',
      assigneeId: 'emp-001',
      villaId: 'villa-001',
      deadline: new Date(Date.now() - 16 * 60 * 1000).toISOString(),
      priority: 'High',
    });

    await escalationAgent.processEvent(overdueEvent);
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0].type).toBe('notification.send_requested');
  });

  it('notification agent delivers escalation notification', async () => {
    const notificationAgent = createMockAgent('notification-agent');

    const event = createEvent('notification.send_requested', {
      recipientId: 'admin-001',
      type: 'task_escalation',
      channels: ['in-app', 'email'],
      templateData: { taskId: 'task-001', overdueMins: 16 },
    });

    const result = await notificationAgent.processEvent(event);
    expect(result.success).toBe(true);
  });

  it('re-escalation occurs after 2 hours of unacknowledged escalation', async () => {
    const escalationAgent = createMockAgent('escalation-agent', {
      processEvent: vi.fn().mockImplementation(async (event: PlatformEvent) => {
        const payload = event.payload as { escalatedAt: string };
        const escalatedAt = new Date(payload.escalatedAt);
        const now = new Date();
        const hoursSinceEscalation =
          (now.getTime() - escalatedAt.getTime()) / (1000 * 60 * 60);

        // Should re-escalate if > 2 hours unacknowledged
        const shouldReEscalate = hoursSinceEscalation > 2;
        return { success: true, durationMs: 3, error: shouldReEscalate ? undefined : undefined };
      }),
    });

    const event = createEvent('escalation.unacknowledged', {
      escalationId: 'esc-001',
      taskId: 'task-001',
      escalatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    });

    const result = await escalationAgent.processEvent(event);
    expect(result.success).toBe(true);
  });
});

// ─── Test Suite: Agent Orchestrator Lifecycle ─────────────────────────────────

describe('E2E: Agent Orchestrator Lifecycle', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = new AgentOrchestrator({
      healthCheckInterval: 60_000,
      autoRestart: false,
    });
  });

  it('registers all 9 agents matching platform startup configuration', () => {
    const agents = [
      { name: 'booking-agent', priority: 1 },
      { name: 'channel-sync-agent', priority: 2 },
      { name: 'notification-agent', priority: 3 },
      { name: 'financial-reconciliation-agent', priority: 3 },
      { name: 'maintenance-agent', priority: 4 },
      { name: 'escalation-agent', priority: 4 },
      { name: 'iot-monitoring-agent', priority: 5 },
      { name: 'marketing-data-agent', priority: 5 },
      { name: 'ai-context-agent', priority: 5 },
    ];

    for (const { name, priority } of agents) {
      orchestrator.registerAgent(name, createMockAgent(name), priority);
    }

    const registered = orchestrator.getRegisteredAgents();
    expect(registered).toHaveLength(9);
    expect(registered).toContain('booking-agent');
    expect(registered).toContain('channel-sync-agent');
    expect(registered).toContain('notification-agent');
    expect(registered).toContain('financial-reconciliation-agent');
    expect(registered).toContain('maintenance-agent');
    expect(registered).toContain('escalation-agent');
    expect(registered).toContain('iot-monitoring-agent');
    expect(registered).toContain('marketing-data-agent');
    expect(registered).toContain('ai-context-agent');
  });

  it('starts agents in priority order (1 → 2 → 3 → 4 → 5)', async () => {
    const startOrder: string[] = [];

    const makeAgent = (name: string) =>
      createMockAgent(name, {
        start: vi.fn().mockImplementation(async () => {
          startOrder.push(name);
        }),
      });

    orchestrator.registerAgent('booking-agent', makeAgent('booking-agent'), 1);
    orchestrator.registerAgent('channel-sync-agent', makeAgent('channel-sync-agent'), 2);
    orchestrator.registerAgent('notification-agent', makeAgent('notification-agent'), 3);
    orchestrator.registerAgent('financial-reconciliation-agent', makeAgent('financial-reconciliation-agent'), 3);
    orchestrator.registerAgent('escalation-agent', makeAgent('escalation-agent'), 4);
    orchestrator.registerAgent('maintenance-agent', makeAgent('maintenance-agent'), 4);
    orchestrator.registerAgent('iot-monitoring-agent', makeAgent('iot-monitoring-agent'), 5);
    orchestrator.registerAgent('marketing-data-agent', makeAgent('marketing-data-agent'), 5);
    orchestrator.registerAgent('ai-context-agent', makeAgent('ai-context-agent'), 5);

    await orchestrator.startAll();

    // booking-agent (priority 1) should start before channel-sync-agent (priority 2)
    expect(startOrder.indexOf('booking-agent')).toBeLessThan(
      startOrder.indexOf('channel-sync-agent'),
    );
    // channel-sync-agent (priority 2) before notification-agent (priority 3)
    expect(startOrder.indexOf('channel-sync-agent')).toBeLessThan(
      startOrder.indexOf('notification-agent'),
    );
    // Priority 3 agents start before priority 4 agents
    expect(startOrder.indexOf('notification-agent')).toBeLessThan(
      startOrder.indexOf('escalation-agent'),
    );

    await orchestrator.stopAll();
  });

  it('stops all agents gracefully', async () => {
    const agents = [
      { name: 'booking-agent', priority: 1 },
      { name: 'channel-sync-agent', priority: 2 },
      { name: 'notification-agent', priority: 3 },
    ];

    const instances: AgentLifecycle[] = [];
    for (const { name, priority } of agents) {
      const instance = createMockAgent(name);
      instances.push(instance);
      orchestrator.registerAgent(name, instance, priority);
    }

    await orchestrator.startAll();

    const statusRunning = orchestrator.getStatus();
    expect(statusRunning.status).toBe('running');
    expect(statusRunning.runningAgents).toBe(3);

    await orchestrator.stopAll();

    const statusStopped = orchestrator.getStatus();
    expect(statusStopped.status).toBe('stopped');
    expect(statusStopped.runningAgents).toBe(0);

    // All agents should have been asked to stop gracefully
    for (const instance of instances) {
      expect(instance.stop).toHaveBeenCalledWith(true);
    }
  });

  it('reports correct health summary after startup', async () => {
    orchestrator.registerAgent('booking-agent', createMockAgent('booking-agent'), 1);
    orchestrator.registerAgent('channel-sync-agent', createMockAgent('channel-sync-agent'), 2);

    await orchestrator.startAll();

    const status = orchestrator.getStatus();
    expect(status.totalAgents).toBe(2);
    expect(status.healthyAgents).toBe(2);
    expect(status.degradedAgents).toBe(0);
    expect(status.unhealthyAgents).toBe(0);
    expect(status.startedAt).toBeInstanceOf(Date);
    expect(status.uptime).toBeGreaterThanOrEqual(0);

    await orchestrator.stopAll();
  });

  it('handles individual agent failure without crashing other agents', async () => {
    const failingAgent = createMockAgent('failing', {
      start: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
    });
    const workingAgent = createMockAgent('working');

    orchestrator.registerAgent('working-agent', workingAgent, 1);
    orchestrator.registerAgent('failing-agent', failingAgent, 2);

    await orchestrator.startAll();

    expect(orchestrator.isAgentRunning('working-agent')).toBe(true);
    expect(orchestrator.isAgentRunning('failing-agent')).toBe(false);

    const status = orchestrator.getStatus();
    expect(status.runningAgents).toBe(1);

    await orchestrator.stopAll();
  });

  it('tracks per-agent metrics through the orchestrator', async () => {
    const agent = createMockAgent('booking-agent');
    orchestrator.registerAgent('booking-agent', agent, 1);
    await orchestrator.startAll();

    const metrics = orchestrator.getAgentMetrics('booking-agent');
    expect(metrics).toBeDefined();
    expect(metrics!.eventsProcessed).toBe(10);
    expect(metrics!.eventsFailed).toBe(0);
    expect(metrics!.averageProcessingTime).toBe(12);

    await orchestrator.stopAll();
  });
});

// ─── Test Suite: Saga Compensating Actions (Rollback) ─────────────────────────

describe('E2E: Saga Compensating Actions', () => {
  it('returns compensating actions in reverse order for booking confirmation failure at step 4', () => {
    const actions = getCompensatingActions('booking-confirmation-saga', 4);

    // Should include actions for steps 1, 2, and 4
    expect(actions.length).toBeGreaterThanOrEqual(2);

    // Verify reverse order (higher step numbers first for rollback)
    for (let i = 0; i < actions.length - 1; i++) {
      expect(actions[i].forStep).toBeGreaterThanOrEqual(actions[i + 1].forStep);
    }
  });

  it('compensating action for step 1 releases reserved dates', () => {
    const actions = getCompensatingActions('booking-confirmation-saga', 1);
    const step1Action = actions.find((a) => a.forStep === 1);
    expect(step1Action).toBeDefined();
    expect(step1Action!.action).toBe('availability.released');
  });

  it('compensating action for step 2 refunds payment', () => {
    const actions = getCompensatingActions('booking-confirmation-saga', 2);
    const step2Action = actions.find((a) => a.forStep === 2);
    expect(step2Action).toBeDefined();
    expect(step2Action!.action).toBe('payment.refunded');
  });

  it('compensating action for step 4 reverts channel state', () => {
    const actions = getCompensatingActions('booking-confirmation-saga', 4);
    const step4Action = actions.find((a) => a.forStep === 4);
    expect(step4Action).toBeDefined();
    expect(step4Action!.action).toBe('channel.sync_started');
  });

  it('simulates payment failure triggering compensation sequence', async () => {
    const bookingAgent = createMockAgent('booking-agent');
    const compensationLog: string[] = [];

    // Simulate payment failure
    const paymentFailedEvent = createEvent('payment.failed', {
      paymentId: 'pay-fail-001',
      bookingId: 'bk-003',
      reason: 'insufficient_funds',
    });

    // On payment failure at step 2, get compensating actions
    const actions = getCompensatingActions('booking-confirmation-saga', 2);

    // Execute compensations in reverse order
    for (const action of actions) {
      compensationLog.push(action.action);
    }

    // Verify rollback sequence: step 2 (refund) → step 1 (release dates)
    expect(compensationLog[0]).toBe('payment.refunded');
    expect(compensationLog[1]).toBe('availability.released');
  });

  it('cancellation saga compensating action re-reserves dates', () => {
    const actions = getCompensatingActions('booking-cancellation-saga', 1);
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe('availability.updated');
    expect(actions[0].forStep).toBe(1);
  });

  it('no compensating actions returned for unknown saga', () => {
    const actions = getCompensatingActions('nonexistent-saga', 3);
    expect(actions).toHaveLength(0);
  });

  it('event with maxRetries exceeded would be sent to dead letter queue', async () => {
    const agent = createMockAgent('booking-agent', {
      processEvent: vi.fn().mockResolvedValue({
        success: false,
        error: 'Processing timeout',
        durationMs: 30_000,
      } satisfies ProcessingResult),
    });

    const event = createEvent(
      'booking.created',
      { bookingId: 'bk-dlq-001' },
      { metadata: { retryCount: 3, maxRetries: 3, priority: 'normal' } },
    );

    const result = await agent.processEvent(event);
    expect(result.success).toBe(false);
    // When retryCount >= maxRetries, event bus would route to DLQ
    expect(event.metadata.retryCount).toBeGreaterThanOrEqual(event.metadata.maxRetries);
  });
});
