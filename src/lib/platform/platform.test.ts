/**
 * Platform Module Tests
 *
 * Tests for the saga registry, agent orchestrator, and startup module.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
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

import { AgentOrchestrator } from './agent-orchestrator';

import type {
  AgentLifecycle,
  AgentConfig,
  AgentHealthStatus,
  AgentMetrics,
  PlatformEvent,
  ProcessingResult,
} from '@/lib/events/types';

// ─── Mock Agent for Testing ───────────────────────────────────────────────────

function createMockAgent(overrides?: Partial<AgentLifecycle>): AgentLifecycle {
  return {
    register: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    healthCheck: vi.fn().mockReturnValue({
      status: 'healthy',
      lastProcessedAt: new Date(),
      pendingEvents: 0,
      errorRate: 0,
      lag: 100,
    } satisfies AgentHealthStatus),
    getMetrics: vi.fn().mockReturnValue({
      eventsProcessed: 42,
      eventsFailed: 1,
      averageProcessingTime: 15,
      uptime: 3600,
    } satisfies AgentMetrics),
    processEvent: vi.fn().mockResolvedValue({ success: true, durationMs: 10 }),
    acknowledgeEvent: vi.fn(),
    rejectEvent: vi.fn(),
    ...overrides,
  };
}

// ─── Saga Registry Tests ──────────────────────────────────────────────────────

describe('Saga Registry', () => {
  describe('getSaga', () => {
    it('returns the booking confirmation saga by ID', () => {
      const saga = getSaga('booking-confirmation-saga');
      expect(saga).toBeDefined();
      expect(saga!.name).toBe('Booking Confirmation');
      expect(saga!.steps).toHaveLength(5);
    });

    it('returns the booking cancellation saga by ID', () => {
      const saga = getSaga('booking-cancellation-saga');
      expect(saga).toBeDefined();
      expect(saga!.name).toBe('Booking Cancellation');
      expect(saga!.steps).toHaveLength(3);
    });

    it('returns the maintenance completion saga by ID', () => {
      const saga = getSaga('maintenance-completion-saga');
      expect(saga).toBeDefined();
      expect(saga!.name).toBe('Maintenance Completion');
      expect(saga!.steps).toHaveLength(3);
    });

    it('returns the villa registration saga by ID', () => {
      const saga = getSaga('villa-registration-saga');
      expect(saga).toBeDefined();
      expect(saga!.name).toBe('Villa Registration');
      expect(saga!.steps).toHaveLength(3);
    });

    it('returns undefined for an unknown saga ID', () => {
      const saga = getSaga('nonexistent-saga');
      expect(saga).toBeUndefined();
    });
  });

  describe('getAllSagas', () => {
    it('returns all 4 registered sagas', () => {
      const sagas = getAllSagas();
      expect(sagas).toHaveLength(4);
    });

    it('includes all expected saga IDs', () => {
      const sagas = getAllSagas();
      const ids = sagas.map((s) => s.id);
      expect(ids).toContain('booking-confirmation-saga');
      expect(ids).toContain('booking-cancellation-saga');
      expect(ids).toContain('maintenance-completion-saga');
      expect(ids).toContain('villa-registration-saga');
    });
  });

  describe('getSagasForAgent', () => {
    it('returns sagas involving the booking-agent', () => {
      const sagas = getSagasForAgent('booking-agent');
      expect(sagas.length).toBeGreaterThanOrEqual(2);
      const ids = sagas.map((s) => s.id);
      expect(ids).toContain('booking-confirmation-saga');
      expect(ids).toContain('booking-cancellation-saga');
    });

    it('returns sagas involving the channel-sync-agent', () => {
      const sagas = getSagasForAgent('channel-sync-agent');
      expect(sagas.length).toBeGreaterThanOrEqual(2);
      const ids = sagas.map((s) => s.id);
      expect(ids).toContain('booking-confirmation-saga');
      expect(ids).toContain('booking-cancellation-saga');
    });

    it('returns sagas involving the notification-agent', () => {
      const sagas = getSagasForAgent('notification-agent');
      expect(sagas.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array for an unregistered agent', () => {
      const sagas = getSagasForAgent('unknown-agent');
      expect(sagas).toHaveLength(0);
    });
  });

  describe('getNextSagaStep', () => {
    it('returns the next step after booking.created in confirmation saga', () => {
      const nextStep = getNextSagaStep(
        'booking-confirmation-saga',
        'booking.created',
      );
      expect(nextStep).toBeDefined();
      expect(nextStep!.triggerEvent).toBe('payment.completed');
      expect(nextStep!.agent).toBe('booking-agent');
    });

    it('returns the next step after payment.completed in confirmation saga', () => {
      const nextStep = getNextSagaStep(
        'booking-confirmation-saga',
        'payment.completed',
      );
      expect(nextStep).toBeDefined();
      expect(nextStep!.triggerEvent).toBe('booking.confirmed');
    });

    it('returns undefined for the last step (no next step exists)', () => {
      const nextStep = getNextSagaStep(
        'booking-cancellation-saga',
        'notification.send_requested',
      );
      expect(nextStep).toBeUndefined();
    });

    it('returns undefined for unknown saga', () => {
      const nextStep = getNextSagaStep('nonexistent', 'booking.created');
      expect(nextStep).toBeUndefined();
    });

    it('returns undefined for unknown event type', () => {
      const nextStep = getNextSagaStep(
        'booking-confirmation-saga',
        'unknown.event',
      );
      expect(nextStep).toBeUndefined();
    });
  });

  describe('getCompensatingActions', () => {
    it('returns compensating actions for failed step 2 in confirmation saga', () => {
      const actions = getCompensatingActions(
        'booking-confirmation-saga',
        2,
      );
      expect(actions.length).toBeGreaterThanOrEqual(1);
      // Should include step 1 and 2 compensations in reverse order
      expect(actions[0].forStep).toBeGreaterThanOrEqual(actions[actions.length - 1].forStep);
    });

    it('returns compensating actions in reverse order for rollback', () => {
      const actions = getCompensatingActions(
        'booking-confirmation-saga',
        4,
      );
      // Should be sorted in descending step order
      for (let i = 0; i < actions.length - 1; i++) {
        expect(actions[i].forStep).toBeGreaterThanOrEqual(actions[i + 1].forStep);
      }
    });

    it('returns empty array for unknown saga', () => {
      const actions = getCompensatingActions('nonexistent', 1);
      expect(actions).toHaveLength(0);
    });
  });

  describe('Booking Confirmation Saga structure', () => {
    it('has steps in correct order', () => {
      const steps = BOOKING_CONFIRMATION_SAGA.steps;
      for (let i = 0; i < steps.length - 1; i++) {
        expect(steps[i].order).toBeLessThan(steps[i + 1].order);
      }
    });

    it('step 1 is triggered by booking.created', () => {
      expect(BOOKING_CONFIRMATION_SAGA.steps[0].triggerEvent).toBe(
        'booking.created',
      );
    });

    it('step 4 is handled by channel-sync-agent', () => {
      expect(BOOKING_CONFIRMATION_SAGA.steps[3].agent).toBe(
        'channel-sync-agent',
      );
    });

    it('step 5 is handled by notification-agent', () => {
      expect(BOOKING_CONFIRMATION_SAGA.steps[4].agent).toBe(
        'notification-agent',
      );
    });

    it('has an overall timeout defined', () => {
      expect(BOOKING_CONFIRMATION_SAGA.timeout).toBeGreaterThan(0);
    });
  });

  describe('Booking Cancellation Saga structure', () => {
    it('starts with booking.cancelled trigger', () => {
      expect(BOOKING_CANCELLATION_SAGA.steps[0].triggerEvent).toBe(
        'booking.cancelled',
      );
    });

    it('step 1 emits availability.released', () => {
      expect(BOOKING_CANCELLATION_SAGA.steps[0].expectedOutcome).toBe(
        'availability.released',
      );
    });

    it('step 2 involves channel-sync-agent', () => {
      expect(BOOKING_CANCELLATION_SAGA.steps[1].agent).toBe(
        'channel-sync-agent',
      );
    });
  });
});

// ─── Agent Orchestrator Tests ─────────────────────────────────────────────────

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = new AgentOrchestrator({
      healthCheckInterval: 60_000, // Long interval so it doesn't fire in tests
      autoRestart: false,
    });
  });

  describe('registerAgent', () => {
    it('registers an agent successfully', () => {
      const agent = createMockAgent();
      orchestrator.registerAgent('test-agent', agent, 1);
      expect(orchestrator.getRegisteredAgents()).toContain('test-agent');
    });

    it('throws if registering a duplicate agent name', () => {
      const agent = createMockAgent();
      orchestrator.registerAgent('test-agent', agent, 1);
      expect(() => orchestrator.registerAgent('test-agent', agent, 1)).toThrow(
        'already registered',
      );
    });
  });

  describe('startAll / stopAll', () => {
    it('starts all registered agents', async () => {
      const agent1 = createMockAgent();
      const agent2 = createMockAgent();
      orchestrator.registerAgent('agent-1', agent1, 1);
      orchestrator.registerAgent('agent-2', agent2, 2);

      await orchestrator.startAll();

      expect(agent1.start).toHaveBeenCalledTimes(1);
      expect(agent2.start).toHaveBeenCalledTimes(1);
      expect(orchestrator.isAgentRunning('agent-1')).toBe(true);
      expect(orchestrator.isAgentRunning('agent-2')).toBe(true);

      await orchestrator.stopAll();
    });

    it('stops all running agents', async () => {
      const agent1 = createMockAgent();
      const agent2 = createMockAgent();
      orchestrator.registerAgent('agent-1', agent1, 1);
      orchestrator.registerAgent('agent-2', agent2, 2);

      await orchestrator.startAll();
      await orchestrator.stopAll();

      expect(agent1.stop).toHaveBeenCalledWith(true);
      expect(agent2.stop).toHaveBeenCalledWith(true);
      expect(orchestrator.isAgentRunning('agent-1')).toBe(false);
      expect(orchestrator.isAgentRunning('agent-2')).toBe(false);
    });

    it('starts agents in priority order (lower priority first)', async () => {
      const order: string[] = [];
      const agentLow = createMockAgent({
        start: vi.fn().mockImplementation(async () => {
          order.push('low');
        }),
      });
      const agentHigh = createMockAgent({
        start: vi.fn().mockImplementation(async () => {
          order.push('high');
        }),
      });

      orchestrator.registerAgent('high-priority', agentLow, 1);
      orchestrator.registerAgent('low-priority', agentHigh, 10);

      await orchestrator.startAll();

      expect(order[0]).toBe('low'); // priority 1 starts first
      expect(order[1]).toBe('high'); // priority 10 starts second

      await orchestrator.stopAll();
    });

    it('handles start failure gracefully without stopping other agents', async () => {
      const workingAgent = createMockAgent();
      const failingAgent = createMockAgent({
        start: vi.fn().mockRejectedValue(new Error('Connection refused')),
      });

      orchestrator.registerAgent('working', workingAgent, 1);
      orchestrator.registerAgent('failing', failingAgent, 2);

      await orchestrator.startAll();

      expect(orchestrator.isAgentRunning('working')).toBe(true);
      expect(orchestrator.isAgentRunning('failing')).toBe(false);

      await orchestrator.stopAll();
    });
  });

  describe('startAgent / stopAgent', () => {
    it('starts a specific agent by name', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgent('test-agent', agent, 1);

      await orchestrator.startAgent('test-agent');

      expect(agent.start).toHaveBeenCalledTimes(1);
      expect(orchestrator.isAgentRunning('test-agent')).toBe(true);

      await orchestrator.stopAgent('test-agent');
    });

    it('stops a specific agent by name', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgent('test-agent', agent, 1);

      await orchestrator.startAgent('test-agent');
      await orchestrator.stopAgent('test-agent');

      expect(agent.stop).toHaveBeenCalledWith(true);
      expect(orchestrator.isAgentRunning('test-agent')).toBe(false);
    });

    it('throws when starting an unregistered agent', async () => {
      await expect(orchestrator.startAgent('unknown')).rejects.toThrow(
        'not registered',
      );
    });

    it('throws when stopping an unregistered agent', async () => {
      await expect(orchestrator.stopAgent('unknown')).rejects.toThrow(
        'not registered',
      );
    });

    it('is idempotent when starting an already-running agent', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgent('test-agent', agent, 1);

      await orchestrator.startAgent('test-agent');
      await orchestrator.startAgent('test-agent');

      expect(agent.start).toHaveBeenCalledTimes(1); // Only called once

      await orchestrator.stopAgent('test-agent');
    });
  });

  describe('getStatus', () => {
    it('reports correct status when all agents are healthy', async () => {
      const agent1 = createMockAgent();
      const agent2 = createMockAgent();
      orchestrator.registerAgent('agent-1', agent1, 1);
      orchestrator.registerAgent('agent-2', agent2, 2);

      await orchestrator.startAll();

      const status = orchestrator.getStatus();
      expect(status.status).toBe('running');
      expect(status.totalAgents).toBe(2);
      expect(status.runningAgents).toBe(2);
      expect(status.healthyAgents).toBe(2);
      expect(status.degradedAgents).toBe(0);
      expect(status.unhealthyAgents).toBe(0);

      await orchestrator.stopAll();
    });

    it('reports degraded status correctly', async () => {
      const healthyAgent = createMockAgent();
      const degradedAgent = createMockAgent({
        healthCheck: vi.fn().mockReturnValue({
          status: 'degraded',
          lastProcessedAt: new Date(),
          pendingEvents: 5,
          errorRate: 2,
          lag: 5000,
        }),
      });

      orchestrator.registerAgent('healthy', healthyAgent, 1);
      orchestrator.registerAgent('degraded', degradedAgent, 2);

      await orchestrator.startAll();

      const status = orchestrator.getStatus();
      expect(status.healthyAgents).toBe(1);
      expect(status.degradedAgents).toBe(1);

      await orchestrator.stopAll();
    });

    it('includes agent metrics in summary', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgent('test-agent', agent, 1);

      await orchestrator.startAll();

      const status = orchestrator.getStatus();
      const agentSummary = status.agents.find((a) => a.name === 'test-agent');
      expect(agentSummary).toBeDefined();
      expect(agentSummary!.metrics).toBeDefined();
      expect(agentSummary!.metrics!.eventsProcessed).toBe(42);

      await orchestrator.stopAll();
    });

    it('reports stopped status when not started', () => {
      orchestrator.registerAgent('test-agent', createMockAgent(), 1);
      const status = orchestrator.getStatus();
      expect(status.status).toBe('stopped');
      expect(status.runningAgents).toBe(0);
    });
  });

  describe('getAgentHealth / getAgentMetrics', () => {
    it('returns health for a running agent', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgent('test-agent', agent, 1);
      await orchestrator.startAgent('test-agent');

      const health = orchestrator.getAgentHealth('test-agent');
      expect(health).toBeDefined();
      expect(health!.status).toBe('healthy');

      await orchestrator.stopAgent('test-agent');
    });

    it('returns null health for a stopped agent', () => {
      orchestrator.registerAgent('test-agent', createMockAgent(), 1);
      const health = orchestrator.getAgentHealth('test-agent');
      expect(health).toBeNull();
    });

    it('returns null health for unknown agent', () => {
      const health = orchestrator.getAgentHealth('unknown');
      expect(health).toBeNull();
    });

    it('returns metrics for a running agent', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgent('test-agent', agent, 1);
      await orchestrator.startAgent('test-agent');

      const metrics = orchestrator.getAgentMetrics('test-agent');
      expect(metrics).toBeDefined();
      expect(metrics!.eventsProcessed).toBe(42);

      await orchestrator.stopAgent('test-agent');
    });
  });

  describe('unregisterAgent', () => {
    it('unregisters an agent', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgent('test-agent', agent, 1);

      await orchestrator.unregisterAgent('test-agent');

      expect(orchestrator.getRegisteredAgents()).not.toContain('test-agent');
    });

    it('stops a running agent before unregistering', async () => {
      const agent = createMockAgent();
      orchestrator.registerAgent('test-agent', agent, 1);
      await orchestrator.startAgent('test-agent');

      await orchestrator.unregisterAgent('test-agent');

      expect(agent.stop).toHaveBeenCalled();
      expect(orchestrator.getRegisteredAgents()).not.toContain('test-agent');
    });

    it('handles unregistering a non-existent agent gracefully', async () => {
      await expect(
        orchestrator.unregisterAgent('unknown'),
      ).resolves.not.toThrow();
    });
  });
});
