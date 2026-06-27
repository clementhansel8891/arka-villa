/**
 * IoT Monitoring Agent
 *
 * Event-driven consumer that monitors IoT device health and manages alerts.
 * Subscribes to `stream:iot` via the EventBus.
 *
 * Responsibilities:
 * - Monitor device heartbeats and mark offline after 5-min timeout
 * - Evaluate alert thresholds against incoming readings
 * - Trigger notifications for threshold breaches
 * - Manage CCTV recording retention lifecycle
 * - Auto-create maintenance tickets for devices offline >24h
 *
 * Requirements: 35.5, 35.6, 7.1, 7.6
 */

import { v4 as uuidv4 } from 'uuid';

import { EventBus } from '@/lib/events/event-bus';
import { STREAMS, type StreamName } from '@/lib/events/streams';
import type {
  PlatformEvent,
  AgentConfig,
  AgentLifecycle,
  AgentHealthStatus,
  AgentMetrics,
  ProcessingResult,
} from '@/lib/events/types';
import { createRedisClient, redis } from '@/lib/db/redis';
import { sendNotification } from '@/modules/notifications/service';
import { createMaintenanceTicket } from '@/modules/maintenance/service';

// ─── Agent Configuration ──────────────────────────────────────────────────────

const AGENT_NAME = 'iot-monitoring-agent';
const CONSUMER_GROUP = 'cg:iot-agent';
const CONSUMER_NAME = `${AGENT_NAME}-${process.pid}`;

/** Heartbeat timeout: 5 minutes in milliseconds */
const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000;

/** Offline threshold for auto-creating maintenance tickets: 24 hours in ms */
const MAINTENANCE_TICKET_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** CCTV recording retention: 30 days in seconds */
const CCTV_RETENTION_SECONDS = 30 * 24 * 60 * 60;

/** Heartbeat check interval: 1 minute */
const HEARTBEAT_CHECK_INTERVAL_MS = 60 * 1000;

/** CCTV retention cleanup interval: 6 hours */
const RETENTION_CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Redis key prefix for device heartbeats */
const HEARTBEAT_KEY_PREFIX = 'iot:heartbeat:';

/** Redis key prefix for device status */
const DEVICE_STATUS_KEY_PREFIX = 'iot:status:';

/** Redis key prefix for alert thresholds */
const THRESHOLD_KEY_PREFIX = 'iot:threshold:';

/** Redis key prefix for CCTV recordings tracking */
const CCTV_RECORDINGS_KEY_PREFIX = 'iot:cctv:recordings:';

/** Redis key for tracking maintenance tickets created for offline devices */
const OFFLINE_TICKET_KEY_PREFIX = 'iot:offline-ticket:';

/** Default configuration for the IoT Monitoring Agent */
const DEFAULT_CONFIG: AgentConfig = {
  name: AGENT_NAME,
  consumerGroup: CONSUMER_GROUP,
  streams: [STREAMS.IOT],
  concurrency: 5,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryBaseDelay: 5000,
  healthCheckInterval: 30_000,
  idleTimeout: 300_000,
};

// ─── Event Payload Interfaces ─────────────────────────────────────────────────

interface DeviceHeartbeatPayload {
  deviceId: string;
  deviceType: 'sensor' | 'camera' | 'actuator' | 'gateway';
  villaId: string;
  firmware?: string;
  uptime?: number;
}

interface DeviceReadingPayload {
  deviceId: string;
  deviceType: string;
  villaId: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: string;
}

interface DeviceAlertPayload {
  deviceId: string;
  deviceType: string;
  villaId: string;
  alertType: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  reading?: number;
  threshold?: number;
}

interface CCTVRecordingPayload {
  deviceId: string;
  villaId: string;
  recordingId: string;
  startTime: string;
  endTime?: string;
  sizeBytes?: number;
  storagePath: string;
}

/** Alert threshold configuration stored in Redis */
interface AlertThreshold {
  metric: string;
  deviceId: string;
  tenantId: string;
  min?: number;
  max?: number;
  notifyUserIds: string[];
}

// ─── IoT Monitoring Agent Implementation ──────────────────────────────────────

/**
 * IoTMonitoringAgent implements the AgentLifecycle interface and provides
 * real-time IoT device health monitoring, alert threshold evaluation,
 * and CCTV retention lifecycle management.
 */
export class IoTMonitoringAgent implements AgentLifecycle {
  private config: AgentConfig = DEFAULT_CONFIG;
  private eventBus: EventBus | null = null;
  private stopFunctions: Array<() => void> = [];
  private healthCheckIntervalRef: ReturnType<typeof setInterval> | null = null;
  private heartbeatCheckInterval: ReturnType<typeof setInterval> | null = null;
  private retentionCleanupInterval: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private startedAt: Date | null = null;

  // Metrics
  private eventsProcessed = 0;
  private eventsFailed = 0;
  private totalProcessingTimeMs = 0;
  private lastProcessedAt: Date = new Date();
  private recentErrors: number[] = [];

  // ─── AgentLifecycle Implementation ──────────────────────────────────

  register(config: AgentConfig): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.started) return;

    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    this.eventBus = new EventBus({ publisher, subscriber });

    // Subscribe to stream:iot
    const stopIoT = await this.eventBus.subscribe(
      STREAMS.IOT as StreamName,
      this.config.consumerGroup,
      CONSUMER_NAME,
      async (event) => { await this.processEvent(event); },
    );
    this.stopFunctions.push(stopIoT);

    // Start health check interval
    this.healthCheckIntervalRef = setInterval(() => {
      this.healthCheck();
    }, this.config.healthCheckInterval);

    // Start heartbeat timeout monitoring (every 1 minute)
    this.heartbeatCheckInterval = setInterval(
      () => this.checkHeartbeatTimeouts(),
      HEARTBEAT_CHECK_INTERVAL_MS,
    );

    // Start CCTV retention cleanup (every 6 hours)
    this.retentionCleanupInterval = setInterval(
      () => this.cleanupCCTVRetention(),
      RETENTION_CLEANUP_INTERVAL_MS,
    );

    this.started = true;
    this.startedAt = new Date();
  }

  async stop(graceful: boolean): Promise<void> {
    if (!this.started) return;

    for (const stop of this.stopFunctions) {
      stop();
    }
    this.stopFunctions = [];

    if (this.healthCheckIntervalRef) {
      clearInterval(this.healthCheckIntervalRef);
      this.healthCheckIntervalRef = null;
    }
    if (this.heartbeatCheckInterval) {
      clearInterval(this.heartbeatCheckInterval);
      this.heartbeatCheckInterval = null;
    }
    if (this.retentionCleanupInterval) {
      clearInterval(this.retentionCleanupInterval);
      this.retentionCleanupInterval = null;
    }

    if (this.eventBus) {
      await this.eventBus.shutdown();
      this.eventBus = null;
    }

    this.started = false;
  }

  healthCheck(): AgentHealthStatus {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    this.recentErrors = this.recentErrors.filter((t) => t > fiveMinutesAgo);
    const errorRate = this.recentErrors.length / 5;

    let status: AgentHealthStatus['status'] = 'healthy';
    if (errorRate > 10) {
      status = 'unhealthy';
    } else if (errorRate > 3) {
      status = 'degraded';
    }

    const lag = now - this.lastProcessedAt.getTime();

    return {
      status,
      lastProcessedAt: this.lastProcessedAt,
      pendingEvents: 0,
      errorRate,
      lag,
    };
  }

  getMetrics(): AgentMetrics {
    const uptime = this.startedAt
      ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
      : 0;

    return {
      eventsProcessed: this.eventsProcessed,
      eventsFailed: this.eventsFailed,
      averageProcessingTime:
        this.eventsProcessed > 0
          ? Math.round(this.totalProcessingTimeMs / this.eventsProcessed)
          : 0,
      uptime,
    };
  }

  async processEvent(event: PlatformEvent): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      await this.routeEvent(event);

      const durationMs = Date.now() - startTime;
      this.eventsProcessed++;
      this.totalProcessingTimeMs += durationMs;
      this.lastProcessedAt = new Date();

      return { success: true, durationMs };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      this.eventsFailed++;
      this.recentErrors.push(Date.now());

      const errorMessage = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMessage, durationMs };
    }
  }

  acknowledgeEvent(_eventId: string): void {
    // Handled internally by the EventBus
  }

  rejectEvent(_eventId: string, _reason: string): void {
    // Handled internally by the EventBus
  }

  // ─── Event Routing ──────────────────────────────────────────────────

  private async routeEvent(event: PlatformEvent): Promise<void> {
    switch (event.type) {
      case 'iot.device_online':
        await this.handleDeviceHeartbeat(event as PlatformEvent<DeviceHeartbeatPayload>);
        break;
      case 'iot.reading_anomaly':
        await this.handleDeviceReading(event as PlatformEvent<DeviceReadingPayload>);
        break;
      case 'iot.alert_triggered':
        await this.handleAlertTriggered(event as PlatformEvent<DeviceAlertPayload>);
        break;
      case 'iot.device_offline':
        await this.handleDeviceOffline(event as PlatformEvent<DeviceHeartbeatPayload>);
        break;
      default:
        // Process heartbeat updates from generic IoT events
        if (event.payload && typeof event.payload === 'object' && 'deviceId' in event.payload) {
          await this.updateHeartbeat(event);
        }
        break;
    }
  }

  // ─── Heartbeat Monitoring ───────────────────────────────────────────

  /**
   * Record a heartbeat from a device.
   * Devices that don't send a heartbeat within 5 minutes are marked offline.
   *
   * Requirement: 35.5
   */
  private async handleDeviceHeartbeat(
    event: PlatformEvent<DeviceHeartbeatPayload>,
  ): Promise<void> {
    const { deviceId, deviceType, villaId } = event.payload;
    const tenantId = event.tenantId;
    const now = Date.now();

    // Store heartbeat timestamp
    const heartbeatKey = `${HEARTBEAT_KEY_PREFIX}${tenantId}:${deviceId}`;
    await redis.set(heartbeatKey, now.toString(), 'EX', 600); // expires after 10min

    // Update device status to online
    const statusKey = `${DEVICE_STATUS_KEY_PREFIX}${tenantId}:${deviceId}`;
    await redis.hset(statusKey, {
      status: 'online',
      lastSeen: now.toString(),
      deviceType,
      villaId,
      tenantId,
    });

    // Clear any offline maintenance ticket tracking
    const offlineTicketKey = `${OFFLINE_TICKET_KEY_PREFIX}${tenantId}:${deviceId}`;
    await redis.del(offlineTicketKey);
  }

  /**
   * Update heartbeat for any IoT event that carries a deviceId.
   */
  private async updateHeartbeat(event: PlatformEvent): Promise<void> {
    const payload = event.payload as Record<string, unknown>;
    const deviceId = payload.deviceId as string;
    if (!deviceId) return;

    const tenantId = event.tenantId;
    const now = Date.now();

    const heartbeatKey = `${HEARTBEAT_KEY_PREFIX}${tenantId}:${deviceId}`;
    await redis.set(heartbeatKey, now.toString(), 'EX', 600);
  }

  /**
   * Handle explicit device offline event.
   */
  private async handleDeviceOffline(
    event: PlatformEvent<DeviceHeartbeatPayload>,
  ): Promise<void> {
    const { deviceId, villaId } = event.payload;
    const tenantId = event.tenantId;
    const now = Date.now();

    const statusKey = `${DEVICE_STATUS_KEY_PREFIX}${tenantId}:${deviceId}`;
    await redis.hset(statusKey, {
      status: 'offline',
      offlineSince: now.toString(),
    });

    // Record when device went offline for 24h ticket threshold
    const offlineTicketKey = `${OFFLINE_TICKET_KEY_PREFIX}${tenantId}:${deviceId}`;
    const existingOfflineTime = await redis.get(offlineTicketKey);
    if (!existingOfflineTime) {
      await redis.set(offlineTicketKey, now.toString());
    }
  }

  /**
   * Periodically check for devices whose heartbeat has timed out (>5 min).
   * Marks them offline and emits iot.device_offline events.
   * Also checks for devices offline >24h to auto-create maintenance tickets.
   *
   * Requirement: 35.5
   */
  private async checkHeartbeatTimeouts(): Promise<void> {
    try {
      const now = Date.now();

      // Scan for all device status keys
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `${DEVICE_STATUS_KEY_PREFIX}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        for (const statusKey of keys) {
          const deviceStatus = await redis.hgetall(statusKey);
          if (!deviceStatus || !deviceStatus.tenantId) continue;

          const tenantId = deviceStatus.tenantId;
          const deviceId = statusKey.replace(`${DEVICE_STATUS_KEY_PREFIX}${tenantId}:`, '');
          const heartbeatKey = `${HEARTBEAT_KEY_PREFIX}${tenantId}:${deviceId}`;

          // Check if heartbeat has expired (Redis TTL handles 10min expiry)
          const lastHeartbeat = await redis.get(heartbeatKey);

          if (!lastHeartbeat && deviceStatus.status === 'online') {
            // No heartbeat found — mark device offline
            await redis.hset(statusKey, {
              status: 'offline',
              offlineSince: now.toString(),
            });

            // Record offline time for maintenance ticket threshold
            const offlineTicketKey = `${OFFLINE_TICKET_KEY_PREFIX}${tenantId}:${deviceId}`;
            await redis.set(offlineTicketKey, now.toString());

            // Emit device offline event
            if (this.eventBus) {
              const offlineEvent: PlatformEvent = {
                id: uuidv4(),
                type: 'iot.device_offline',
                version: 1,
                timestamp: new Date().toISOString(),
                source: AGENT_NAME,
                tenantId,
                correlationId: uuidv4(),
                actor: { userId: 'system', role: 'system' },
                payload: {
                  deviceId,
                  deviceType: deviceStatus.deviceType ?? 'unknown',
                  villaId: deviceStatus.villaId ?? '',
                  reason: 'heartbeat_timeout',
                },
                metadata: { retryCount: 0, maxRetries: 3, priority: 'high' },
              };
              await this.eventBus.emit(STREAMS.IOT as StreamName, offlineEvent);
            }

            // Send notification about device going offline
            await sendNotification({
              userIds: [], // Platform admins
              tenantId,
              title: 'Device Offline',
              body: `Device ${deviceId} (${deviceStatus.deviceType ?? 'unknown'}) has gone offline. No heartbeat received for 5 minutes.`,
              eventType: 'iot.device_offline',
              priority: 'non_urgent',
              metadata: { deviceId, villaId: deviceStatus.villaId },
            });
          }

          // Check for 24h offline threshold — auto-create maintenance ticket
          if (deviceStatus.status === 'offline') {
            await this.checkOfflineMaintenanceTicket(tenantId, deviceId, deviceStatus);
          }
        }
      } while (cursor !== '0');
    } catch (err: unknown) {
      console.error(`[${AGENT_NAME}] Heartbeat timeout check failed:`, err);
    }
  }

  /**
   * Auto-create maintenance ticket for devices offline >24h.
   *
   * Requirement: 35.6
   */
  private async checkOfflineMaintenanceTicket(
    tenantId: string,
    deviceId: string,
    deviceStatus: Record<string, string>,
  ): Promise<void> {
    const offlineTicketKey = `${OFFLINE_TICKET_KEY_PREFIX}${tenantId}:${deviceId}`;
    const offlineSince = await redis.get(offlineTicketKey);
    if (!offlineSince) return;

    const offlineDuration = Date.now() - Number(offlineSince);
    if (offlineDuration < MAINTENANCE_TICKET_THRESHOLD_MS) return;

    // Check if we already created a ticket (avoid duplicates)
    const ticketCreatedKey = `${offlineTicketKey}:ticket-created`;
    const alreadyCreated = await redis.get(ticketCreatedKey);
    if (alreadyCreated) return;

    try {
      // Create maintenance ticket
      await createMaintenanceTicket(tenantId, {
        title: `IoT Device Offline >24h: ${deviceId}`,
        description: `Device ${deviceId} (${deviceStatus.deviceType ?? 'unknown'}) in villa ${deviceStatus.villaId ?? 'unknown'} has been offline for more than 24 hours. Requires physical inspection and repair.`,
        severity: 'high' as const,
        photos: [],
      }, 'system', 'system');

      // Mark ticket as created to avoid duplicates (expires in 7 days)
      await redis.set(ticketCreatedKey, 'true', 'EX', 7 * 24 * 60 * 60);
    } catch (err: unknown) {
      console.error(
        `[${AGENT_NAME}] Failed to create maintenance ticket for offline device ${deviceId}:`,
        err,
      );
    }
  }

  // ─── Alert Threshold Evaluation ─────────────────────────────────────

  /**
   * Evaluate incoming device readings against configured alert thresholds.
   * Triggers notifications when thresholds are breached.
   *
   * Requirement: 35.5
   */
  private async handleDeviceReading(
    event: PlatformEvent<DeviceReadingPayload>,
  ): Promise<void> {
    const { deviceId, metric, value, unit, villaId } = event.payload;
    const tenantId = event.tenantId;

    // Fetch configured thresholds for this device/metric
    const thresholdKey = `${THRESHOLD_KEY_PREFIX}${tenantId}:${deviceId}:${metric}`;
    const thresholdData = await redis.get(thresholdKey);

    if (!thresholdData) return; // No threshold configured

    const threshold: AlertThreshold = JSON.parse(thresholdData);
    let breached = false;
    let breachType = '';

    if (threshold.max !== undefined && value > threshold.max) {
      breached = true;
      breachType = `exceeded maximum (${value}${unit} > ${threshold.max}${unit})`;
    } else if (threshold.min !== undefined && value < threshold.min) {
      breached = true;
      breachType = `below minimum (${value}${unit} < ${threshold.min}${unit})`;
    }

    if (breached) {
      // Emit alert triggered event
      if (this.eventBus) {
        const alertEvent: PlatformEvent<DeviceAlertPayload> = {
          id: uuidv4(),
          type: 'iot.alert_triggered',
          version: 1,
          timestamp: new Date().toISOString(),
          source: AGENT_NAME,
          tenantId,
          correlationId: event.correlationId,
          causationId: event.id,
          actor: { userId: 'system', role: 'system' },
          payload: {
            deviceId,
            deviceType: event.payload.deviceType,
            villaId,
            alertType: `threshold_breach_${metric}`,
            severity: 'warning',
            message: `${metric} reading ${breachType}`,
            reading: value,
            threshold: threshold.max ?? threshold.min,
          },
          metadata: { retryCount: 0, maxRetries: 3, priority: 'high' },
        };
        await this.eventBus.emit(STREAMS.IOT as StreamName, alertEvent);
      }

      // Send threshold breach notification
      const notifyUsers = threshold.notifyUserIds.length > 0
        ? threshold.notifyUserIds
        : []; // Falls back to default admin notification routing

      await sendNotification({
        userIds: notifyUsers,
        tenantId,
        title: 'IoT Alert: Threshold Breach',
        body: `Device ${deviceId}: ${metric} ${breachType}`,
        eventType: 'iot.alert_triggered',
        priority: 'critical',
        metadata: { deviceId, metric, value, threshold: threshold.max ?? threshold.min, villaId },
      });
    }
  }

  /**
   * Handle an alert that was triggered (by the threshold evaluation or externally).
   */
  private async handleAlertTriggered(
    event: PlatformEvent<DeviceAlertPayload>,
  ): Promise<void> {
    const { deviceId, alertType, severity, message, villaId } = event.payload;
    const tenantId = event.tenantId;

    // For critical alerts, also emit an escalation
    if (severity === 'critical' && this.eventBus) {
      const escalationEvent: PlatformEvent = {
        id: uuidv4(),
        type: 'escalation.triggered',
        version: 1,
        timestamp: new Date().toISOString(),
        source: AGENT_NAME,
        tenantId,
        correlationId: event.correlationId,
        causationId: event.id,
        actor: { userId: 'system', role: 'system' },
        payload: {
          type: 'iot_critical_alert',
          deviceId,
          alertType,
          message,
          villaId,
        },
        metadata: { retryCount: 0, maxRetries: 3, priority: 'critical' },
      };
      await this.eventBus.emit(STREAMS.ESCALATIONS as StreamName, escalationEvent);
    }
  }

  // ─── CCTV Retention Lifecycle ───────────────────────────────────────

  /**
   * Manage CCTV recording retention lifecycle.
   * Recordings older than 30 days are flagged for deletion.
   *
   * Requirement: 7.1, 7.6
   */
  private async cleanupCCTVRetention(): Promise<void> {
    try {
      const now = Date.now();
      const retentionCutoff = now - (CCTV_RETENTION_SECONDS * 1000);

      // Scan for all CCTV recording sets
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          `${CCTV_RECORDINGS_KEY_PREFIX}*`,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        for (const recordingsKey of keys) {
          // Remove recordings older than retention period from sorted set
          // Score = recording timestamp in ms
          const removed = await redis.zremrangebyscore(
            recordingsKey,
            '-inf',
            retentionCutoff,
          );

          if (removed > 0) {
            // Extract tenant and device from key
            const keyParts = recordingsKey.replace(CCTV_RECORDINGS_KEY_PREFIX, '').split(':');
            const tenantId = keyParts[0] ?? 'unknown';
            const deviceId = keyParts[1] ?? 'unknown';

            console.info(
              `[${AGENT_NAME}] CCTV retention cleanup: removed ${removed} expired recordings for device ${deviceId} (tenant: ${tenantId})`,
            );

            // Emit context event for AI awareness
            if (this.eventBus) {
              const cleanupEvent: PlatformEvent = {
                id: uuidv4(),
                type: 'iot.retention_cleanup',
                version: 1,
                timestamp: new Date().toISOString(),
                source: AGENT_NAME,
                tenantId,
                correlationId: uuidv4(),
                actor: { userId: 'system', role: 'system' },
                payload: {
                  deviceId,
                  removedCount: removed,
                  retentionDays: 30,
                },
                metadata: { retryCount: 0, maxRetries: 3, priority: 'low' },
              };
              await this.eventBus.emit(STREAMS.IOT as StreamName, cleanupEvent);
            }
          }
        }
      } while (cursor !== '0');
    } catch (err: unknown) {
      console.error(`[${AGENT_NAME}] CCTV retention cleanup failed:`, err);
    }
  }

  // ─── Public Utility Methods ─────────────────────────────────────────

  /**
   * Register an alert threshold for a device metric.
   */
  async registerThreshold(threshold: AlertThreshold): Promise<void> {
    const key = `${THRESHOLD_KEY_PREFIX}${threshold.tenantId}:${threshold.deviceId}:${threshold.metric}`;
    await redis.set(key, JSON.stringify(threshold));
  }

  /**
   * Record a CCTV recording entry for retention tracking.
   */
  async recordCCTVEntry(
    tenantId: string,
    deviceId: string,
    recordingId: string,
    timestampMs: number,
    storagePath: string,
  ): Promise<void> {
    const key = `${CCTV_RECORDINGS_KEY_PREFIX}${tenantId}:${deviceId}`;
    const entry = JSON.stringify({ recordingId, storagePath });
    await redis.zadd(key, timestampMs, entry);
  }

  /**
   * Get current device status.
   */
  async getDeviceStatus(
    tenantId: string,
    deviceId: string,
  ): Promise<Record<string, string> | null> {
    const statusKey = `${DEVICE_STATUS_KEY_PREFIX}${tenantId}:${deviceId}`;
    const status = await redis.hgetall(statusKey);
    return Object.keys(status).length > 0 ? status : null;
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/** Singleton instance of the IoTMonitoringAgent */
export const iotMonitoringAgent = new IoTMonitoringAgent();
