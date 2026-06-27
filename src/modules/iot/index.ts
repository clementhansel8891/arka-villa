/**
 * IoT Module
 *
 * Device registration, health monitoring, heartbeat tracking,
 * alert threshold management, and auto-maintenance integration.
 *
 * Requirements: 35.1, 35.2, 35.3, 35.4, 35.5, 35.6, 35.7
 */

export * from './types';

export {
  registerDevice,
  getDeviceStatusOverview,
  getDevices,
  getDevice,
  recordHeartbeat,
  checkHeartbeats,
  verifyConnectivity,
  configureAlertThreshold,
  getDeviceThresholds,
  recordReading,
  checkOfflineDevicesForMaintenance,
  IoTError,
} from './service';

export type {
  RegisterDeviceRequest,
  ConfigureThresholdRequest,
  DeviceStatusOverview,
  DeviceType,
  DeviceStatus,
  AlertThreshold,
  IoTDevice,
  IoTReading,
} from './types';
