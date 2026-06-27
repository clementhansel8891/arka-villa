/**
 * IoT service — business logic orchestration.
 *
 * Coordinates device registration, heartbeat monitoring,
 * connectivity verification, alert threshold management,
 * and auto-maintenance ticket creation for offline devices.
 *
 * Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6, 35.7
 */

import { v4 as uuidv4 } from 'uuid';

import { EventBus } from '@/lib/events/event-bus';
import { STREAMS } from '@/lib/events/streams';
import type { PlatformEvent } from '@/lib/events/types';
import { redis, createRedisClient } from '@/lib/db/redis';
import {
  createDevice,
  getDeviceById,
  listDevices,
  countDevices,
  updateDeviceStatus,
  updateDeviceHeartbeat,
  getDeviceStatusSummary,
  getDevicesOfflineLongerThan,
  upsertAlertThreshold,
  getThresholdsForDevice,
  getThresholdsByDeviceType,
  insertReading,
} from './repository';
import type {
  IoTDevice,
  DeviceType,
  DeviceStatus,
  DeviceStatusOverview,
  RegisterDeviceRequest,
  ConfigureThresholdRequest,
  AlertThreshold,
  DeviceRegisteredPayload,
  DeviceOnlinePayload,
  DeviceOfflinePayload,
  DeviceAlertPayload,
} from './types';
import {
  MAX_DEVICES_PER_VILLA,
  MAX_CCTV_TOTAL,
  HEARTBEAT_TIMEOUT_SECONDS,
  CONNECTIVITY_VERIFY_SECONDS,
  OFFLINE_MAINTENANCE_THRESHOLD_HOURS,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_DEVICE_TYPES: DeviceType[] = ['cctv', 'motion', 'door', 'environmental', 'smart_home'];

/** Redis key prefix for device heartbeat tracking. */
const HEARTBEAT_KEY_PREFIX = 'iot:heartbeat:';

/** Redis key for global CCTV counter. */
const CCTV_GLOBAL_COUNT_KEY = 'iot:cctv:global_count';

/** Redis key prefix for connectivity verification. */
const CONNECTIVITY_KEY_PREFIX = 'iot:connectivity:';

// ─── Error Classes ────────────────────────────────────────────────────────────

export class IoTError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_ERROR'
      | 'NOT_FOUND'
      | 'CAPACITY_EXCEEDED'
      | 'CONNECTIVITY_FAILED'
      | 'INTERNAL_ERROR',
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'IoTError';
  }
}

// ─── Event Emission Helper ────────────────────────────────────────────────────

let eventBusInstance: EventBus | null = null;

async function getEventBus(): Promise<EventBus> {
  if (!eventBusInstance) {
    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    eventBusInstance = new EventBus({ publisher, subscriber });
  }
  return eventBusInstance;
}

async function emitIoTEvent<T>(
  type: string,
  tenantId: string,
  payload: T,
  actorUserId: string,
  actorRole: string,
  priority: 'critical' | 'high' | 'normal' | 'low' = 'normal',
  correlationId?: string
): Promise<void> {
  try {
    const eventBus = await getEventBus();

    const event: PlatformEvent<T> = {
      id: uuidv4(),
      type,
      version: 1,
      timestamp: new Date().toISOString(),
      source: 'iot',
      tenantId,
      correlationId: correlationId ?? uuidv4(),
      actor: {
        userId: actorUserId,
        role: actorRole,
      },
      payload,
      metadata: {
        retryCount: 0,
        maxRetries: 3,
        priority,
      },
    };

    await eventBus.emit(STREAMS.IOT, event);
  } catch {
    // Event emission failure should not break IoT operation flow.
    console.error(`[IoT] Failed to emit event: ${type}`);
  }
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Register a new IoT device.
 *
 * Validates:
 * - Device type is valid
 * - Name and location are provided
 * - Per-villa capacity limit (20 devices)
 * - Global CCTV limit (50 total)
 *
 * After registration, initiates connectivity verification within 60 seconds.
 *
 * Requirements: 35.1, 35.3, 35.6
 */
export async function registerDevice(
  tenantId: string,
  request: RegisterDeviceRequest,
  actorUserId: string,
  actorRole: string
): Promise<IoTDevice> {
  // Validate name
  if (!request.name || request.name.trim().length === 0) {
    throw new IoTError('name is required', 'VALIDATION_ERROR');
  }

  // Validate type
  if (!request.type || !VALID_DEVICE_TYPES.includes(request.type)) {
    throw new IoTError(
      `type must be one of: ${VALID_DEVICE_TYPES.join(', ')}`,
      'VALIDATION_ERROR'
    );
  }

  // Validate location
  if (!request.location || request.location.trim().length === 0) {
    throw new IoTError('location is required', 'VALIDATION_ERROR');
  }

  // Check per-villa device capacity (Requirement 35.6)
  const currentCount = await countDevices(tenantId);
  if (currentCount >= MAX_DEVICES_PER_VILLA) {
    throw new IoTError(
      `Maximum device capacity reached (${MAX_DEVICES_PER_VILLA} devices per villa)`,
      'CAPACITY_EXCEEDED'
    );
  }

  // Check global CCTV limit (Requirement 35.6)
  if (request.type === 'cctv') {
    const globalCctvCount = await getGlobalCctvCount();
    if (globalCctvCount >= MAX_CCTV_TOTAL) {
      throw new IoTError(
        `Maximum CCTV capacity reached (${MAX_CCTV_TOTAL} cameras total across all villas)`,
        'CAPACITY_EXCEEDED'
      );
    }
  }

  // Create device in database
  const device = await createDevice(
    tenantId,
    request.name.trim(),
    request.type,
    request.location.trim(),
    request.config ?? {}
  );

  // If CCTV, increment global counter
  if (request.type === 'cctv') {
    await redis.incr(CCTV_GLOBAL_COUNT_KEY);
  }

  // Set connectivity verification key with 60-second TTL (Requirement 35.3)
  await redis.set(
    `${CONNECTIVITY_KEY_PREFIX}${device.id}`,
    'pending',
    'EX',
    CONNECTIVITY_VERIFY_SECONDS
  );

  // Emit device registered event
  const payload: DeviceRegisteredPayload = {
    deviceId: device.id,
    name: device.name,
    type: device.type,
    location: device.location,
  };

  await emitIoTEvent(
    'iot.device_registered',
    tenantId,
    payload,
    actorUserId,
    actorRole,
    'normal',
    device.id
  );

  return device;
}

/**
 * Get device status overview grouped by type for a villa.
 *
 * Requirement 35.2
 */
export async function getDeviceStatusOverview(
  tenantId: string
): Promise<DeviceStatusOverview[]> {
  // Get summary counts
  const summary = await getDeviceStatusSummary(tenantId);

  // Get all devices grouped by type
  const devices = await listDevices(tenantId, { limit: 100 });

  // Group devices by type
  const devicesByType = new Map<DeviceType, IoTDevice[]>();
  for (const device of devices) {
    const existing = devicesByType.get(device.type) ?? [];
    existing.push(device);
    devicesByType.set(device.type, existing);
  }

  // Merge summary with device lists
  return summary.map((s) => ({
    type: s.type,
    total: s.total,
    online: s.online,
    offline: s.offline,
    error: s.error,
    devices: devicesByType.get(s.type) ?? [],
  }));
}

/**
 * Get all devices for a tenant with optional filtering.
 */
export async function getDevices(
  tenantId: string,
  filters?: { type?: DeviceType; status?: DeviceStatus; limit?: number; offset?: number }
): Promise<IoTDevice[]> {
  return listDevices(tenantId, filters);
}

/**
 * Get a single device by ID.
 */
export async function getDevice(
  tenantId: string,
  deviceId: string
): Promise<IoTDevice> {
  const device = await getDeviceById(tenantId, deviceId);
  if (!device) {
    throw new IoTError(`Device not found: ${deviceId}`, 'NOT_FOUND', 404);
  }
  return device;
}

/**
 * Record a device heartbeat.
 *
 * Updates the device's last_heartbeat timestamp and sets status to online.
 * Sets a Redis key with 5-minute TTL for heartbeat monitoring.
 *
 * Requirement 35.4
 */
export async function recordHeartbeat(
  tenantId: string,
  deviceId: string
): Promise<IoTDevice> {
  // Update heartbeat in database
  const device = await updateDeviceHeartbeat(tenantId, deviceId);
  if (!device) {
    throw new IoTError(`Device not found: ${deviceId}`, 'NOT_FOUND', 404);
  }

  // Set heartbeat key in Redis with 5-min TTL
  const heartbeatKey = `${HEARTBEAT_KEY_PREFIX}${deviceId}`;
  await redis.set(heartbeatKey, new Date().toISOString(), 'EX', HEARTBEAT_TIMEOUT_SECONDS);

  // If device was previously offline, emit online event
  if (device.status === 'online') {
    const payload: DeviceOnlinePayload = {
      deviceId: device.id,
      name: device.name,
      type: device.type,
    };

    await emitIoTEvent(
      'iot.device_online',
      tenantId,
      payload,
      'system',
      'system',
      'normal',
      device.id
    );
  }

  return device;
}

/**
 * Check heartbeat status for all devices of a tenant.
 * Mark devices offline if their heartbeat has expired.
 *
 * Requirement 35.4: Mark offline after 5-min timeout.
 */
export async function checkHeartbeats(tenantId: string): Promise<IoTDevice[]> {
  const devices = await listDevices(tenantId, { status: 'online' });
  const offlineDevices: IoTDevice[] = [];

  for (const device of devices) {
    const heartbeatKey = `${HEARTBEAT_KEY_PREFIX}${device.id}`;
    const heartbeat = await redis.get(heartbeatKey);

    if (!heartbeat) {
      // Heartbeat expired — mark device offline
      const updated = await updateDeviceStatus(tenantId, device.id, 'offline');
      if (updated) {
        offlineDevices.push(updated);

        // Emit offline event
        const lastHeartbeat = device.lastHeartbeat;
        const offlineDuration = lastHeartbeat
          ? Math.round((Date.now() - new Date(lastHeartbeat).getTime()) / (1000 * 60))
          : 0;

        const payload: DeviceOfflinePayload = {
          deviceId: device.id,
          name: device.name,
          type: device.type,
          lastHeartbeat,
          offlineDurationMinutes: offlineDuration,
        };

        await emitIoTEvent(
          'iot.device_offline',
          tenantId,
          payload,
          'system',
          'system',
          'high',
          device.id
        );
      }
    }
  }

  return offlineDevices;
}

/**
 * Verify device connectivity within 60 seconds of registration.
 *
 * Requirement 35.3: Verify connectivity within 60 seconds.
 * Returns true if the device sent a heartbeat before the 60s window expired.
 */
export async function verifyConnectivity(
  tenantId: string,
  deviceId: string
): Promise<boolean> {
  const connectivityKey = `${CONNECTIVITY_KEY_PREFIX}${deviceId}`;
  const pending = await redis.get(connectivityKey);

  // If the key still exists as 'pending', connectivity not yet verified
  if (pending === 'pending') {
    // Check if device has sent a heartbeat
    const heartbeatKey = `${HEARTBEAT_KEY_PREFIX}${deviceId}`;
    const heartbeat = await redis.get(heartbeatKey);

    if (heartbeat) {
      // Device is connected — mark verification as complete
      await redis.set(connectivityKey, 'verified', 'EX', 60);
      return true;
    }
    return false;
  }

  // Key expired or already verified
  if (pending === 'verified') return true;

  // Key expired without verification
  const device = await getDeviceById(tenantId, deviceId);
  if (device && device.status === 'online') return true;

  return false;
}

/**
 * Configure alert threshold for a device type + metric.
 *
 * Requirement 35.5
 */
export async function configureAlertThreshold(
  tenantId: string,
  request: ConfigureThresholdRequest,
  actorUserId: string,
  actorRole: string
): Promise<AlertThreshold> {
  // Validate device exists
  if (!request.deviceId) {
    throw new IoTError('deviceId is required', 'VALIDATION_ERROR');
  }

  const device = await getDeviceById(tenantId, request.deviceId);
  if (!device) {
    throw new IoTError(`Device not found: ${request.deviceId}`, 'NOT_FOUND', 404);
  }

  // Validate metric
  if (!request.metric || request.metric.trim().length === 0) {
    throw new IoTError('metric is required', 'VALIDATION_ERROR');
  }

  // At least one threshold value must be provided
  if (request.minValue == null && request.maxValue == null) {
    throw new IoTError(
      'At least one of minValue or maxValue must be provided',
      'VALIDATION_ERROR'
    );
  }

  // Validate min < max if both provided
  if (request.minValue != null && request.maxValue != null && request.minValue >= request.maxValue) {
    throw new IoTError('minValue must be less than maxValue', 'VALIDATION_ERROR');
  }

  const threshold = await upsertAlertThreshold(
    tenantId,
    request.deviceId,
    request.deviceType ?? device.type,
    request.metric.trim(),
    request.minValue ?? null,
    request.maxValue ?? null
  );

  return threshold;
}

/**
 * Get alert thresholds for a device.
 */
export async function getDeviceThresholds(
  tenantId: string,
  deviceId: string
): Promise<AlertThreshold[]> {
  return getThresholdsForDevice(tenantId, deviceId);
}

/**
 * Record an IoT sensor reading and check against thresholds.
 *
 * Requirement 35.7 (TimescaleDB hypertable with 90-day retention)
 */
export async function recordReading(
  tenantId: string,
  deviceId: string,
  metricType: string,
  value: number,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  // Insert reading into TimescaleDB hypertable
  await insertReading(deviceId, tenantId, metricType, value, metadata);

  // Check against alert thresholds
  const thresholds = await getThresholdsForDevice(tenantId, deviceId);
  const matchingThreshold = thresholds.find((t) => t.metric === metricType);

  if (matchingThreshold) {
    const breached =
      (matchingThreshold.minValue != null && value < matchingThreshold.minValue) ||
      (matchingThreshold.maxValue != null && value > matchingThreshold.maxValue);

    if (breached) {
      const device = await getDeviceById(tenantId, deviceId);
      if (device) {
        const alertPayload: DeviceAlertPayload = {
          deviceId: device.id,
          name: device.name,
          type: device.type,
          metric: metricType,
          value,
          threshold: {
            min: matchingThreshold.minValue,
            max: matchingThreshold.maxValue,
          },
        };

        await emitIoTEvent(
          'iot.alert_triggered',
          tenantId,
          alertPayload,
          'system',
          'system',
          'high',
          device.id
        );
      }
    }
  }
}

/**
 * Check for devices offline >24 hours and auto-create maintenance tickets.
 *
 * Emits a maintenance.ticket_created event for the maintenance module to handle.
 * Called periodically by the IoT monitoring agent.
 */
export async function checkOfflineDevicesForMaintenance(
  tenantId: string
): Promise<IoTDevice[]> {
  const offlineDevices = await getDevicesOfflineLongerThan(
    tenantId,
    OFFLINE_MAINTENANCE_THRESHOLD_HOURS
  );

  for (const device of offlineDevices) {
    // Emit event to maintenance stream to auto-create ticket
    try {
      const eventBus = await getEventBus();

      const maintenanceEvent: PlatformEvent<{
        deviceId: string;
        deviceName: string;
        deviceType: DeviceType;
        lastHeartbeat: string | null;
        offlineHours: number;
      }> = {
        id: uuidv4(),
        type: 'maintenance.ticket_created',
        version: 1,
        timestamp: new Date().toISOString(),
        source: 'iot',
        tenantId,
        correlationId: device.id,
        actor: { userId: 'system', role: 'system' },
        payload: {
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          lastHeartbeat: device.lastHeartbeat,
          offlineHours: OFFLINE_MAINTENANCE_THRESHOLD_HOURS,
        },
        metadata: {
          retryCount: 0,
          maxRetries: 3,
          priority: 'high',
        },
      };

      await eventBus.emit(STREAMS.MAINTENANCE, maintenanceEvent);
    } catch {
      console.error(
        `[IoT] Failed to emit maintenance ticket event for device ${device.id}`
      );
    }

    // Also emit to IoT stream
    const offlinePayload: DeviceOfflinePayload = {
      deviceId: device.id,
      name: device.name,
      type: device.type,
      lastHeartbeat: device.lastHeartbeat,
      offlineDurationMinutes: OFFLINE_MAINTENANCE_THRESHOLD_HOURS * 60,
    };

    await emitIoTEvent(
      'iot.device_unreachable',
      tenantId,
      offlinePayload,
      'system',
      'system',
      'high',
      device.id
    );
  }

  return offlineDevices;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get global CCTV count from Redis.
 * Falls back to 0 if the key doesn't exist.
 */
async function getGlobalCctvCount(): Promise<number> {
  const count = await redis.get(CCTV_GLOBAL_COUNT_KEY);
  return count ? parseInt(count, 10) : 0;
}
