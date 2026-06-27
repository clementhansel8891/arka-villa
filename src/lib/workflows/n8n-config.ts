/**
 * n8n Workflow Engine Configuration.
 *
 * Defines scheduled workflow configurations and integration settings
 * for the n8n sidecar service. The n8n container communicates with
 * the platform via internal webhook endpoints authenticated with a
 * shared service key.
 *
 * Integration pattern:
 * - n8n → Platform: POST /api/v1/internal/events/emit (event bus bridge)
 * - n8n → Platform: POST /api/v1/internal/workflows/trigger (operations)
 * - Platform → n8n: n8n webhook trigger URLs (event-driven workflows)
 */

import type { StreamName } from '@/lib/events';

// ─── Internal Service Authentication ──────────────────────────────────

/**
 * Header name for the internal service key used to authenticate
 * n8n webhook requests to the platform.
 */
export const INTERNAL_SERVICE_KEY_HEADER = 'x-internal-service-key';

/**
 * Validates the internal service key from a request header.
 * The key is configured via the N8N_INTERNAL_SERVICE_KEY environment variable.
 */
export function validateInternalServiceKey(key: string | null): boolean {
  const expectedKey = process.env.N8N_INTERNAL_SERVICE_KEY;
  if (!expectedKey || !key) {
    return false;
  }
  // Constant-time comparison to prevent timing attacks
  if (key.length !== expectedKey.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < key.length; i++) {
    mismatch |= key.charCodeAt(i) ^ expectedKey.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Workflow Schedule Definitions ────────────────────────────────────

/**
 * Cron expression type for n8n schedule triggers.
 * Uses standard cron format: minute hour day-of-month month day-of-week
 */
export type CronExpression = string;

/**
 * Interval-based schedule using a fixed period.
 */
export interface IntervalSchedule {
  type: 'interval';
  /** Interval value */
  value: number;
  /** Interval unit */
  unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks';
}

/**
 * Cron-based schedule for specific timing.
 */
export interface CronSchedule {
  type: 'cron';
  /** Standard cron expression */
  expression: CronExpression;
}

export type WorkflowSchedule = IntervalSchedule | CronSchedule;

/**
 * Represents an n8n workflow configuration with its schedule
 * and metadata for platform coordination.
 */
export interface N8nWorkflowConfig {
  /** Unique identifier for the workflow */
  id: string;
  /** Human-readable workflow name */
  name: string;
  /** Description of what the workflow does */
  description: string;
  /** Schedule configuration */
  schedule: WorkflowSchedule;
  /** Whether this workflow is active */
  enabled: boolean;
  /** Event streams this workflow interacts with */
  targetStreams: StreamName[];
  /** The platform operation this workflow triggers (if applicable) */
  operation?: string;
  /** Timeout in milliseconds for workflow execution */
  timeoutMs: number;
}

// ─── Scheduled Workflow Configurations ────────────────────────────────

export const WORKFLOW_CONFIGS: Record<string, N8nWorkflowConfig> = {
  /**
   * Marketing Metrics Sync (hourly)
   * Pulls advertising metrics from Meta and Google Ads APIs
   * and updates the marketing dashboard data.
   */
  MARKETING_METRICS_SYNC: {
    id: 'marketing-metrics-sync',
    name: 'Marketing Metrics Sync',
    description:
      'Pulls advertising metrics (impressions, clicks, cost, conversions) from Meta and Google Ads APIs and syncs to the platform.',
    schedule: { type: 'interval', value: 1, unit: 'hours' },
    enabled: true,
    targetStreams: ['stream:bookings' as StreamName],
    operation: 'marketing.syncMetrics',
    timeoutMs: 120_000, // 2 minutes
  },

  /**
   * Financial Report Generation (daily at 02:00 UTC)
   * Generates daily financial reconciliation reports and
   * monthly summaries for all villas.
   */
  FINANCIAL_REPORT_GENERATION: {
    id: 'financial-report-generation',
    name: 'Financial Report Generation',
    description:
      'Generates daily financial reconciliation data and monthly summaries per villa. Runs during off-peak hours.',
    schedule: { type: 'cron', expression: '0 2 * * *' },
    enabled: true,
    targetStreams: ['stream:payments' as StreamName],
    operation: 'financial.generateReports',
    timeoutMs: 300_000, // 5 minutes
  },

  /**
   * Recurring Maintenance Check (daily)
   * Evaluates all recurring maintenance tasks and creates
   * tickets for those that are due.
   */
  RECURRING_MAINTENANCE_CHECK: {
    id: 'recurring-maintenance-check',
    name: 'Recurring Maintenance Check',
    description:
      'Checks all recurring maintenance schedules and creates tickets for tasks that are due today.',
    schedule: { type: 'cron', expression: '0 6 * * *' },
    enabled: true,
    targetStreams: ['stream:maintenance' as StreamName],
    operation: 'maintenance.checkRecurring',
    timeoutMs: 60_000, // 1 minute
  },

  /**
   * Guest Pre-Arrival Messages (every 6 hours)
   * Sends automated pre-arrival messages to guests checking in
   * within the next 48 hours.
   */
  GUEST_PRE_ARRIVAL_MESSAGES: {
    id: 'guest-pre-arrival-messages',
    name: 'Guest Pre-Arrival Messages',
    description:
      'Sends automated check-in instructions, directions, and house rules to guests with check-in within 48 hours.',
    schedule: { type: 'interval', value: 6, unit: 'hours' },
    enabled: true,
    targetStreams: ['stream:notifications' as StreamName],
    operation: 'notifications.sendPreArrival',
    timeoutMs: 120_000, // 2 minutes
  },

  /**
   * IoT Retention Cleanup (weekly)
   * Purges expired IoT sensor readings and CCTV recordings
   * beyond their configured retention periods.
   */
  IOT_RETENTION_CLEANUP: {
    id: 'iot-retention-cleanup',
    name: 'IoT Retention Cleanup',
    description:
      'Purges expired IoT sensor readings (>90 days) and CCTV recordings beyond configured retention period.',
    schedule: { type: 'interval', value: 1, unit: 'weeks' },
    enabled: true,
    targetStreams: ['stream:iot' as StreamName],
    operation: 'iot.cleanupRetention',
    timeoutMs: 600_000, // 10 minutes
  },

  /**
   * Channel Polling (every 60 seconds)
   * Polls connected OTA channels (Booking.com, Airbnb) for
   * inbound reservations and availability changes.
   */
  CHANNEL_POLLING: {
    id: 'channel-polling',
    name: 'Channel Polling',
    description:
      'Polls all connected OTA channels for inbound reservations and availability changes every 60 seconds.',
    schedule: { type: 'interval', value: 60, unit: 'seconds' },
    enabled: true,
    targetStreams: [
      'stream:channels' as StreamName,
      'stream:availability' as StreamName,
    ],
    operation: 'channels.poll',
    timeoutMs: 45_000, // 45 seconds (must complete before next poll)
  },

  /**
   * Escalation Digest (daily)
   * Compiles a daily summary of all unresolved escalations
   * and DLQ entries and notifies the Agency_Admin.
   */
  ESCALATION_DIGEST: {
    id: 'escalation-digest',
    name: 'Escalation Digest',
    description:
      'Compiles and sends a daily digest of unresolved escalations, overdue tasks, and DLQ entries to Agency_Admin.',
    schedule: { type: 'cron', expression: '0 8 * * *' },
    enabled: true,
    targetStreams: [
      'stream:escalations' as StreamName,
      'stream:notifications' as StreamName,
    ],
    operation: 'escalations.sendDigest',
    timeoutMs: 60_000, // 1 minute
  },
} as const;

// ─── Workflow Operation Registry ──────────────────────────────────────

/**
 * Registry of valid platform operations that n8n can trigger.
 * Used for validation in the /api/v1/internal/workflows/trigger endpoint.
 */
export const VALID_OPERATIONS = [
  'marketing.syncMetrics',
  'financial.generateReports',
  'maintenance.checkRecurring',
  'notifications.sendPreArrival',
  'iot.cleanupRetention',
  'channels.poll',
  'escalations.sendDigest',
  'bookings.syncAvailability',
  'staff.checkOverdue',
  'ai.pruneContext',
] as const;

export type ValidOperation = (typeof VALID_OPERATIONS)[number];

/**
 * Check if a given operation string is a valid platform operation.
 */
export function isValidOperation(operation: string): operation is ValidOperation {
  return (VALID_OPERATIONS as readonly string[]).includes(operation);
}

// ─── n8n Connection Configuration ─────────────────────────────────────

/**
 * Configuration for connecting to the n8n instance.
 * Used when the platform needs to trigger n8n workflows via webhooks.
 */
export interface N8nConnectionConfig {
  /** Base URL of the n8n instance */
  baseUrl: string;
  /** Basic auth credentials for n8n API access */
  basicAuth: {
    user: string;
    password: string;
  };
}

/**
 * Get the n8n connection configuration from environment variables.
 */
export function getN8nConnectionConfig(): N8nConnectionConfig {
  return {
    baseUrl: process.env.N8N_WEBHOOK_URL ?? 'http://n8n:5678',
    basicAuth: {
      user: process.env.N8N_BASIC_AUTH_USER ?? 'admin',
      password: process.env.N8N_BASIC_AUTH_PASSWORD ?? '',
    },
  };
}

/**
 * Get all active workflow configurations.
 */
export function getActiveWorkflows(): N8nWorkflowConfig[] {
  return Object.values(WORKFLOW_CONFIGS).filter((w) => w.enabled);
}

/**
 * Get a workflow configuration by its ID.
 */
export function getWorkflowById(id: string): N8nWorkflowConfig | undefined {
  return Object.values(WORKFLOW_CONFIGS).find((w) => w.id === id);
}
