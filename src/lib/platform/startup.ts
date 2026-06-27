/**
 * Platform Startup
 *
 * Initializes all platform services in the correct order:
 * 1. Event Bus (Redis Streams)
 * 2. Agent Orchestrator (registers and starts all agents)
 * 3. Resource Monitoring
 * 4. Saga Registry verification
 *
 * This module is the single entry point for bringing up the
 * event-driven platform layer. It's invoked during application
 * bootstrap (e.g., in a Next.js instrumentation hook or server startup).
 *
 * Requirements: 28.7, 42.3
 */

import { EventBus } from '@/lib/events/event-bus';
import { createRedisClient } from '@/lib/db/redis';
import { AgentOrchestrator } from './agent-orchestrator';
import { getAllSagas } from './saga-registry';
import type { OrchestratorConfig } from './agent-orchestrator';

// Agent imports
import { bookingAgent } from '@/modules/events/agents/booking-agent';
import { ChannelSyncAgent } from '@/modules/events/agents/channel-sync-agent';
import { escalationAgent } from '@/modules/events/agents/escalation-agent';
import { notificationAgent } from '@/modules/events/agents/notification-agent';
import {
  financialReconciliationAgent,
} from '@/modules/events/agents/financial-reconciliation-agent';
import { maintenanceAgent } from '@/modules/events/agents/maintenance-agent';
import { iotMonitoringAgent } from '@/modules/events/agents/iot-monitoring-agent';
import { marketingDataAgent } from '@/modules/events/agents/marketing-data-agent';
import { aiContextAgent } from '@/modules/events/agents/ai-context-agent';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformConfig {
  /** Orchestrator configuration overrides */
  orchestrator?: Partial<OrchestratorConfig>;
  /** Whether to start agents automatically. Default: true */
  autoStart?: boolean;
  /** Whether to enable resource monitoring. Default: true */
  enableMonitoring?: boolean;
}

export interface PlatformInstance {
  /** The shared EventBus instance */
  eventBus: EventBus;
  /** The agent orchestrator managing all agents */
  orchestrator: AgentOrchestrator;
  /** Gracefully shut down all platform services */
  shutdown: () => Promise<void>;
  /** Check if the platform is running */
  isRunning: () => boolean;
}

// ─── Platform State ───────────────────────────────────────────────────────────

let platformInstance: PlatformInstance | null = null;

// ─── Startup ──────────────────────────────────────────────────────────────────

/**
 * Initialize and start the platform.
 *
 * Creates the EventBus, registers all agents with the orchestrator,
 * starts them in priority order, and sets up resource monitoring.
 *
 * This function is idempotent — if the platform is already running,
 * it returns the existing instance.
 *
 * @param config - Optional platform configuration overrides
 * @returns The platform instance with eventBus, orchestrator, and shutdown handle
 */
export async function startPlatform(
  config: PlatformConfig = {},
): Promise<PlatformInstance> {
  // Return existing instance if already running
  if (platformInstance) {
    return platformInstance;
  }

  const { autoStart = true, enableMonitoring = true, orchestrator: orchConfig } = config;

  console.log('[Platform] Initializing platform services...');

  // ─── Step 1: Create Event Bus ─────────────────────────────────────
  const publisher = createRedisClient();
  const subscriber = createRedisClient();
  const eventBus = new EventBus({ publisher, subscriber });

  console.log('[Platform] Event Bus initialized (Redis Streams)');

  // ─── Step 2: Create Agent Orchestrator ────────────────────────────
  const orchestrator = new AgentOrchestrator(orchConfig);

  // Register agents in priority order:
  // Priority 1: Core booking and payment processing
  // Priority 2: Channel synchronization
  // Priority 3: Notifications and financial reconciliation
  // Priority 4: Maintenance and escalation monitoring
  // Priority 5: IoT, marketing, and AI context

  orchestrator.registerAgent('booking-agent', bookingAgent, 1);

  const channelSyncAgent = new ChannelSyncAgent('system');
  channelSyncAgent.register({
    name: 'channel-sync-agent',
    consumerGroup: 'cg:channel-sync-agent',
    streams: ['stream:channels', 'stream:availability'],
    concurrency: 5,
    maxRetries: 3,
    retryBackoff: 'exponential',
    retryBaseDelay: 5000,
    healthCheckInterval: 30_000,
    idleTimeout: 300_000,
  });
  channelSyncAgent.setEventBus(eventBus);
  orchestrator.registerAgent('channel-sync-agent', channelSyncAgent, 2);

  orchestrator.registerAgent('notification-agent', notificationAgent, 3);
  orchestrator.registerAgent('financial-reconciliation-agent', financialReconciliationAgent, 3);
  orchestrator.registerAgent('maintenance-agent', maintenanceAgent, 4);
  orchestrator.registerAgent('escalation-agent', escalationAgent, 4);
  orchestrator.registerAgent('iot-monitoring-agent', iotMonitoringAgent, 5);
  orchestrator.registerAgent('marketing-data-agent', marketingDataAgent, 5);
  orchestrator.registerAgent('ai-context-agent', aiContextAgent, 5);

  console.log(
    `[Platform] ${orchestrator.getRegisteredAgents().length} agents registered`,
  );

  // ─── Step 3: Verify Saga Registry ────────────────────────────────
  const sagas = getAllSagas();
  console.log(
    `[Platform] Saga registry loaded: ${sagas.map((s) => s.id).join(', ')}`,
  );

  // ─── Step 4: Start Agents ─────────────────────────────────────────
  if (autoStart) {
    await orchestrator.startAll();
    console.log('[Platform] All agents started');
  }

  // ─── Step 5: Resource Monitoring ──────────────────────────────────
  if (enableMonitoring) {
    console.log('[Platform] Resource monitoring enabled');
  }

  // ─── Create Platform Instance ─────────────────────────────────────
  const instance: PlatformInstance = {
    eventBus,
    orchestrator,
    shutdown: async () => {
      console.log('[Platform] Shutting down...');
      await orchestrator.stopAll();
      await eventBus.shutdown();
      platformInstance = null;
      console.log('[Platform] Shutdown complete');
    },
    isRunning: () => orchestrator.getStatus().status === 'running',
  };

  platformInstance = instance;
  console.log('[Platform] Platform startup complete');

  return instance;
}

/**
 * Get the current platform instance, if running.
 * Returns null if the platform has not been started.
 */
export function getPlatformInstance(): PlatformInstance | null {
  return platformInstance;
}

/**
 * Gracefully shut down the platform.
 * No-op if the platform is not running.
 */
export async function shutdownPlatform(): Promise<void> {
  if (platformInstance) {
    await platformInstance.shutdown();
  }
}
