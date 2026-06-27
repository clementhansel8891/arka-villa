/**
 * IoT module types.
 *
 * Device registration, health monitoring, heartbeat tracking,
 * alert threshold configuration, and IoT readings.
 *
 * Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6, 35.7
 */

// ─── Device Types ─────────────────────────────────────────────────────────────

export type DeviceType = 'cctv' | 'motion' | 'door' | 'environmental' | 'smart_home';
export type DeviceStatus = 'online' | 'offline' | 'error';

export interface IoTDevice {
  id: string;
  tenantId: string;
  name: string;
  type: DeviceType;
  location: string;
  status: DeviceStatus;
  config: Record<string, unknown>;
  lastHeartbeat: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Database row shape for iot_devices table. */
export interface IoTDeviceRow {
  id: string;
  tenant_id: string;
  name: string;
  type: DeviceType;
  location: string;
  status: DeviceStatus;
  config: string | Record<string, unknown>;
  last_heartbeat: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Alert Threshold Types ────────────────────────────────────────────────────

export interface AlertThreshold {
  id: string;
  deviceId: string;
  deviceType: DeviceType;
  metric: string;
  minValue: number | null;
  maxValue: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertThresholdRow {
  id: string;
  device_id: string;
  device_type: DeviceType;
  metric: string;
  min_value: string | null;
  max_value: string | null;
  created_at: string;
  updated_at: string;
}

// ─── IoT Reading Types ────────────────────────────────────────────────────────

export interface IoTReading {
  time: string;
  deviceId: string;
  tenantId: string;
  metricType: string;
  value: number;
  metadata: Record<string, unknown>;
}

export interface IoTReadingRow {
  time: string;
  device_id: string;
  tenant_id: string;
  metric_type: string;
  value: number;
  metadata: string | Record<string, unknown>;
}

// ─── Request/Response Types ───────────────────────────────────────────────────

export interface RegisterDeviceRequest {
  name: string;
  type: DeviceType;
  location: string;
  config?: Record<string, unknown>;
}

export interface ConfigureThresholdRequest {
  deviceId: string;
  deviceType: DeviceType;
  metric: string;
  minValue?: number | null;
  maxValue?: number | null;
}

export interface DeviceStatusOverview {
  type: DeviceType;
  total: number;
  online: number;
  offline: number;
  error: number;
  devices: IoTDevice[];
}

// ─── Event Payloads ───────────────────────────────────────────────────────────

export interface DeviceRegisteredPayload {
  deviceId: string;
  name: string;
  type: DeviceType;
  location: string;
}

export interface DeviceOnlinePayload {
  deviceId: string;
  name: string;
  type: DeviceType;
}

export interface DeviceOfflinePayload {
  deviceId: string;
  name: string;
  type: DeviceType;
  lastHeartbeat: string | null;
  offlineDurationMinutes: number;
}

export interface DeviceAlertPayload {
  deviceId: string;
  name: string;
  type: DeviceType;
  metric: string;
  value: number;
  threshold: { min: number | null; max: number | null };
}

// ─── Capacity Limits ──────────────────────────────────────────────────────────

/** Maximum devices per villa. Requirement 35.6 */
export const MAX_DEVICES_PER_VILLA = 20;

/** Maximum CCTV devices across all villas. Requirement 35.6 */
export const MAX_CCTV_TOTAL = 50;

/** Heartbeat timeout in seconds (5 minutes). Requirement 35.4 */
export const HEARTBEAT_TIMEOUT_SECONDS = 300;

/** Connectivity verification timeout in seconds (60s). Requirement 35.3 */
export const CONNECTIVITY_VERIFY_SECONDS = 60;

/** Hours before auto-creating maintenance ticket for offline device. */
export const OFFLINE_MAINTENANCE_THRESHOLD_HOURS = 24;
