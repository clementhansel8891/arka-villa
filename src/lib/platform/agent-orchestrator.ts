/**
 * Agent Orchestrator
 *
 * Manages the lifecycle of all event-driven agents in the platform.
 * Starts, stops, and monitors agent health from a single orchestration point.
 *
 * Responsibilities:
 * - Start all agents in dependency order
 * - Stop all agents gracefully on shutdown
 * - Monitor agent health and report degraded/unhealthy states
 * - Provide aggregate health status for the Agency Dashboard
 * - Restart unhealthy agents with backoff
 *
 * Requirements: 28.7, 42.3
 */

import type {
  AgentLifecycle,
  AgentHealthStatus,
  AgentMetrics,
} from '@/lib/events/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisteredAgent {
  /** Unique agent name */
  name: string;
  /** The agent instance implementing AgentLifecycle */
  instance: AgentLifecycle;
  /** Whether this agent is currently running */
  running: boolean;
  /** Start order priority (lower = starts first) */
  priority: number;
  /** Last known health status */
  lastHealth: AgentHealthStatus | null;
  /** Number of restart attempts */
  restartAttempts: number;
}

export interface OrchestratorStatus {
  /** Overall orchestrator state */
  status: 'running' | 'stopped' | 'starting' | 'stopping';
  /** Total number of registered agents */
  totalAgents: number;
  /** Number of currently running agents */
  runningAgents: number;
  /** Number of healthy agents */
  healthyAgents: number;
  /** Number of degraded agents */
  degradedAgents: number;
  /** Number of unhealthy agents */
  unhealthyAgents: number;
  /** Per-agent health summary */
  agents: AgentSummary[];
  /** When the orchestrator was started */
  startedAt: Date | null;
  /** Uptime in seconds */
  uptime: number;
}

export interface AgentSummary {
  name: string;
  running: boolean;
  health: AgentHealthStatus['status'] | 'unknown';
  metrics: AgentMetrics | null;
  restartAttempts: number;
}

export interface OrchestratorConfig {
  /** Interval between health checks in milliseconds. Default: 30000 */
  healthCheckInterval: number;
  /** Maximum restart attempts before giving up. Default: 5 */
  maxRestartAttempts: number;
  /** Base delay between restart attempts in milliseconds. Default: 5000 */
  restartBackoffBase: number;
  /** Whether to auto-restart unhealthy agents. Default: true */
  autoRestart: boolean;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  healthCheckInterval: 30_000,
  maxRestartAttempts: 5,
  restartBackoffBase: 5_000,
  autoRestart: true,
};

// ─── Agent Orchestrator Implementation ────────────────────────────────────────

/**
 * AgentOrchestrator manages the lifecycle of all platform agents.
 *
 * Agents are registered with a priority that determines start order.
 * The orchestrator periodically checks agent health and can auto-restart
 * unhealthy agents with exponential backoff.
 */
export class AgentOrchestrator {
  private agents: Map<string, RegisteredAgent> = new Map();
  private config: OrchestratorConfig;
  private status: 'running' | 'stopped' | 'starting' | 'stopping' = 'stopped';
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private startedAt: Date | null = null;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Agent Registration ─────────────────────────────────────────────

  /**
   * Register an agent with the orchestrator.
   *
   * @param name - Unique agent identifier
   * @param instance - Agent implementing AgentLifecycle
   * @param priority - Start order (lower numbers start first). Default: 10
   */
  registerAgent(
    name: string,
    instance: AgentLifecycle,
    priority: number = 10,
  ): void {
    if (this.agents.has(name)) {
      throw new Error(`Agent "${name}" is already registered`);
    }

    this.agents.set(name, {
      name,
      instance,
      running: false,
      priority,
      lastHealth: null,
      restartAttempts: 0,
    });
  }

  /**
   * Unregister an agent. Stops it first if running.
   */
  async unregisterAgent(name: string): Promise<void> {
    const agent = this.agents.get(name);
    if (!agent) return;

    if (agent.running) {
      await this.stopAgent(name);
    }

    this.agents.delete(name);
  }

  // ─── Lifecycle Management ───────────────────────────────────────────

  /**
   * Start all registered agents in priority order.
   * Lower priority numbers start first.
   */
  async startAll(): Promise<void> {
    if (this.status === 'running') return;
    this.status = 'starting';

    const sortedAgents = this.getAgentsByPriority();

    for (const agent of sortedAgents) {
      try {
        await agent.instance.start();
        agent.running = true;
        agent.restartAttempts = 0;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `[AgentOrchestrator] Failed to start agent "${agent.name}": ${errorMsg}`,
        );
        agent.running = false;
      }
    }

    // Start health monitoring
    this.healthCheckTimer = setInterval(
      () => this.runHealthChecks(),
      this.config.healthCheckInterval,
    );

    this.status = 'running';
    this.startedAt = new Date();
  }

  /**
   * Stop all registered agents gracefully.
   * Agents are stopped in reverse priority order.
   */
  async stopAll(): Promise<void> {
    if (this.status === 'stopped') return;
    this.status = 'stopping';

    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Stop agents in reverse priority order
    const sortedAgents = this.getAgentsByPriority().reverse();

    for (const agent of sortedAgents) {
      if (agent.running) {
        try {
          await agent.instance.stop(true);
          agent.running = false;
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(
            `[AgentOrchestrator] Error stopping agent "${agent.name}": ${errorMsg}`,
          );
          // Force-stop on error
          try {
            await agent.instance.stop(false);
          } catch {
            // Swallow errors on force-stop
          }
          agent.running = false;
        }
      }
    }

    this.status = 'stopped';
  }

  /**
   * Start a specific agent by name.
   */
  async startAgent(name: string): Promise<void> {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(`Agent "${name}" is not registered`);
    }

    if (agent.running) return;

    await agent.instance.start();
    agent.running = true;
    agent.restartAttempts = 0;
  }

  /**
   * Stop a specific agent by name.
   */
  async stopAgent(name: string, graceful: boolean = true): Promise<void> {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(`Agent "${name}" is not registered`);
    }

    if (!agent.running) return;

    await agent.instance.stop(graceful);
    agent.running = false;
  }

  /**
   * Restart a specific agent (stop then start).
   */
  async restartAgent(name: string): Promise<void> {
    await this.stopAgent(name);
    // Brief pause before restarting
    await sleep(1000);
    await this.startAgent(name);
  }

  // ─── Health Monitoring ──────────────────────────────────────────────

  /**
   * Run health checks on all running agents.
   * Auto-restarts unhealthy agents if configured.
   */
  private async runHealthChecks(): Promise<void> {
    for (const [name, agent] of this.agents) {
      if (!agent.running) continue;

      try {
        const health = agent.instance.healthCheck();
        agent.lastHealth = health;

        // Auto-restart unhealthy agents
        if (
          health.status === 'unhealthy' &&
          this.config.autoRestart &&
          agent.restartAttempts < this.config.maxRestartAttempts
        ) {
          agent.restartAttempts++;
          const backoffMs =
            this.config.restartBackoffBase *
            Math.pow(2, agent.restartAttempts - 1);

          console.warn(
            `[AgentOrchestrator] Agent "${name}" is unhealthy. ` +
              `Scheduling restart attempt ${agent.restartAttempts}/${this.config.maxRestartAttempts} ` +
              `in ${backoffMs}ms.`,
          );

          setTimeout(async () => {
            try {
              await this.restartAgent(name);
              console.log(
                `[AgentOrchestrator] Agent "${name}" restarted successfully.`,
              );
            } catch (err: unknown) {
              const errorMsg =
                err instanceof Error ? err.message : String(err);
              console.error(
                `[AgentOrchestrator] Failed to restart agent "${name}": ${errorMsg}`,
              );
            }
          }, backoffMs);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(
          `[AgentOrchestrator] Health check failed for agent "${name}": ${errorMsg}`,
        );
      }
    }
  }

  /**
   * Get the health status of a specific agent.
   */
  getAgentHealth(name: string): AgentHealthStatus | null {
    const agent = this.agents.get(name);
    if (!agent) return null;

    if (!agent.running) return null;

    try {
      return agent.instance.healthCheck();
    } catch {
      return null;
    }
  }

  /**
   * Get metrics for a specific agent.
   */
  getAgentMetrics(name: string): AgentMetrics | null {
    const agent = this.agents.get(name);
    if (!agent || !agent.running) return null;

    try {
      return agent.instance.getMetrics();
    } catch {
      return null;
    }
  }

  // ─── Status Reporting ───────────────────────────────────────────────

  /**
   * Get the aggregate orchestrator status including all agent health.
   * Used by the Agency Dashboard monitoring panel.
   */
  getStatus(): OrchestratorStatus {
    const agentSummaries: AgentSummary[] = [];
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;
    let runningCount = 0;

    for (const [, agent] of this.agents) {
      if (agent.running) runningCount++;

      let healthStatus: AgentHealthStatus['status'] | 'unknown' = 'unknown';
      let metrics: AgentMetrics | null = null;

      if (agent.running) {
        try {
          const health = agent.instance.healthCheck();
          healthStatus = health.status;
          metrics = agent.instance.getMetrics();

          if (health.status === 'healthy') healthyCount++;
          else if (health.status === 'degraded') degradedCount++;
          else unhealthyCount++;
        } catch {
          healthStatus = 'unknown';
        }
      }

      agentSummaries.push({
        name: agent.name,
        running: agent.running,
        health: healthStatus,
        metrics,
        restartAttempts: agent.restartAttempts,
      });
    }

    const uptime = this.startedAt
      ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
      : 0;

    return {
      status: this.status,
      totalAgents: this.agents.size,
      runningAgents: runningCount,
      healthyAgents: healthyCount,
      degradedAgents: degradedCount,
      unhealthyAgents: unhealthyCount,
      agents: agentSummaries,
      startedAt: this.startedAt,
      uptime,
    };
  }

  /**
   * Get the list of registered agent names.
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Check if a specific agent is running.
   */
  isAgentRunning(name: string): boolean {
    const agent = this.agents.get(name);
    return agent?.running ?? false;
  }

  // ─── Private Helpers ────────────────────────────────────────────────

  /**
   * Get agents sorted by priority (lower first).
   */
  private getAgentsByPriority(): RegisteredAgent[] {
    return Array.from(this.agents.values()).sort(
      (a, b) => a.priority - b.priority,
    );
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
