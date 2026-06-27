/**
 * CCTV service — business logic orchestration.
 *
 * Coordinates live stream proxying (via Frigate NVR),
 * historical recording queries, retention management,
 * and RBAC-based access control for camera feeds.
 *
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6, 36.7, 36.8
 */

import { getDeviceById, listDevices } from '@/modules/iot/repository';
import type { IoTDevice } from '@/modules/iot/types';
import {
  listRecordings,
  getRecordingById,
  insertRecording,
  deleteExpiredRecordings,
  getRetentionDays,
  setRetentionDays,
} from './repository';
import type {
  CCTVRecording,
  CCTVAccessContext,
  StreamProxyResult,
  GetRecordingsRequest,
  RetentionConfig,
  StreamProtocol,
} from './types';
import {
  FRIGATE_NVR_BASE_URL,
  STREAM_CONNECT_TIMEOUT_MS,
  MIN_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  DEFAULT_RETENTION_DAYS,
  MAX_GRID_CAMERAS,
} from './types';

// ─── Error Class ──────────────────────────────────────────────────────────────

export class CCTVError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_ERROR'
      | 'NOT_FOUND'
      | 'ACCESS_DENIED'
      | 'STREAM_UNAVAILABLE'
      | 'INTERNAL_ERROR',
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'CCTVError';
  }
}

// ─── Access Control ───────────────────────────────────────────────────────────

/**
 * Verify CCTV access based on RBAC rules.
 *
 * Requirement 36.7:
 * - Agency_Admin: access all cameras
 * - Villa_Owner: access cameras of their owned villas only
 * - Employee: no access unless explicitly granted
 */
export function verifyCCTVAccess(context: CCTVAccessContext): void {
  const { role, hasCctvGrant, ownedVillaIds, tenantId } = context;

  if (role === 'Agency_Admin') {
    // Full access to all cameras
    return;
  }

  if (role === 'Villa_Owner') {
    // Must own the villa (tenant) being accessed
    if (!ownedVillaIds || !ownedVillaIds.includes(tenantId)) {
      throw new CCTVError(
        'Villa_Owner can only access cameras of owned villas',
        'ACCESS_DENIED',
        403
      );
    }
    return;
  }

  if (role === 'Employee') {
    // No access unless explicitly granted
    if (!hasCctvGrant) {
      throw new CCTVError(
        'Employee does not have CCTV access grant',
        'ACCESS_DENIED',
        403
      );
    }
    return;
  }

  // Unknown role — deny
  throw new CCTVError('CCTV access denied', 'ACCESS_DENIED', 403);
}

// ─── Live Stream Proxy ────────────────────────────────────────────────────────

/**
 * Get stream proxy information for a camera device.
 *
 * Proxies RTSP/HLS feeds from Frigate NVR container.
 * Returns stream URL and status. If the feed is unavailable,
 * returns the last captured frame info for the interruption overlay.
 *
 * Requirements: 36.1, 36.2, 36.6, 36.8
 */
export async function getStreamProxy(
  tenantId: string,
  deviceId: string,
  accessContext: CCTVAccessContext
): Promise<StreamProxyResult> {
  // Verify RBAC access
  verifyCCTVAccess(accessContext);

  // Verify device exists and is a CCTV camera
  const device = await getDeviceById(tenantId, deviceId);
  if (!device) {
    throw new CCTVError(`Camera device not found: ${deviceId}`, 'NOT_FOUND', 404);
  }

  if (device.type !== 'cctv') {
    throw new CCTVError(
      `Device ${deviceId} is not a CCTV camera (type: ${device.type})`,
      'VALIDATION_ERROR'
    );
  }

  // Determine stream protocol from device config
  const protocol: StreamProtocol =
    (device.config as Record<string, unknown>)?.protocol === 'rtsp'
      ? 'rtsp'
      : 'hls';

  // Build Frigate NVR stream URL
  const cameraName = (device.config as Record<string, unknown>)?.cameraName ??
    device.name.toLowerCase().replace(/\s+/g, '_');
  const streamUrl = buildFrigateStreamUrl(cameraName as string, protocol);

  // Check if the device is online
  if (device.status !== 'online') {
    // Feed unavailable — return last frame info (Requirement 36.8)
    const lastFrame = (device.config as Record<string, unknown>)?.lastFramePath as string | null ?? null;
    const lastFrameTimestamp = device.lastHeartbeat;

    return {
      streamUrl,
      protocol,
      status: 'unavailable',
      lastFrame,
      lastFrameTimestamp,
    };
  }

  return {
    streamUrl,
    protocol,
    status: 'live',
    lastFrame: null,
    lastFrameTimestamp: null,
  };
}

/**
 * Build the Frigate NVR stream URL based on protocol.
 *
 * Requirement 36.6: Support RTSP and HLS protocols.
 */
function buildFrigateStreamUrl(cameraName: string, protocol: StreamProtocol): string {
  if (protocol === 'rtsp') {
    return `${FRIGATE_NVR_BASE_URL}/live/${cameraName}`;
  }
  // HLS (default)
  return `${FRIGATE_NVR_BASE_URL}/api/${cameraName}/latest.m3u8`;
}

// ─── Recordings ───────────────────────────────────────────────────────────────

/**
 * Get historical recordings with filtering.
 *
 * Requirement 36.4: Browse by camera, date, time range.
 * Playback beginning within 10 seconds of request.
 */
export async function getRecordings(
  tenantId: string,
  request: GetRecordingsRequest,
  accessContext: CCTVAccessContext
): Promise<CCTVRecording[]> {
  // Verify RBAC access
  verifyCCTVAccess(accessContext);

  // If filtering by device, verify it's a CCTV camera
  if (request.deviceId) {
    const device = await getDeviceById(tenantId, request.deviceId);
    if (!device) {
      throw new CCTVError(
        `Camera device not found: ${request.deviceId}`,
        'NOT_FOUND',
        404
      );
    }
    if (device.type !== 'cctv') {
      throw new CCTVError(
        `Device ${request.deviceId} is not a CCTV camera`,
        'VALIDATION_ERROR'
      );
    }
  }

  return listRecordings(tenantId, {
    deviceId: request.deviceId,
    date: request.date,
    startTime: request.startTime,
    endTime: request.endTime,
    limit: request.limit,
    offset: request.offset,
  });
}

/**
 * Get a single recording by ID.
 */
export async function getRecording(
  tenantId: string,
  recordingId: string,
  accessContext: CCTVAccessContext
): Promise<CCTVRecording> {
  verifyCCTVAccess(accessContext);

  const recording = await getRecordingById(tenantId, recordingId);
  if (!recording) {
    throw new CCTVError(`Recording not found: ${recordingId}`, 'NOT_FOUND', 404);
  }

  return recording;
}

/**
 * Create a recording entry (called by Frigate NVR webhook or retention agent).
 */
export async function createRecording(
  tenantId: string,
  deviceId: string,
  startTime: string,
  endTime: string,
  storagePath: string,
  fileSizeBytes: number
): Promise<CCTVRecording> {
  // Verify device exists and is CCTV
  const device = await getDeviceById(tenantId, deviceId);
  if (!device) {
    throw new CCTVError(`Camera device not found: ${deviceId}`, 'NOT_FOUND', 404);
  }
  if (device.type !== 'cctv') {
    throw new CCTVError(
      `Device ${deviceId} is not a CCTV camera`,
      'VALIDATION_ERROR'
    );
  }

  // Get retention days for this villa
  const retentionDays = await getRetentionDays(tenantId);

  return insertRecording(
    tenantId,
    deviceId,
    startTime,
    endTime,
    storagePath,
    fileSizeBytes,
    retentionDays
  );
}

// ─── Retention Management ─────────────────────────────────────────────────────

/**
 * Get retention configuration for a villa.
 *
 * Requirement 36.3: Configurable 7–90 days, default 30.
 */
export async function getRetentionConfig(
  tenantId: string
): Promise<RetentionConfig> {
  const retentionDays = await getRetentionDays(tenantId);
  return { tenantId, retentionDays };
}

/**
 * Update retention configuration for a villa.
 *
 * Requirement 36.3: Must be between 7 and 90 days.
 */
export async function updateRetentionConfig(
  tenantId: string,
  retentionDays: number
): Promise<RetentionConfig> {
  if (retentionDays < MIN_RETENTION_DAYS || retentionDays > MAX_RETENTION_DAYS) {
    throw new CCTVError(
      `Retention must be between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS} days`,
      'VALIDATION_ERROR'
    );
  }

  await setRetentionDays(tenantId, retentionDays);
  return { tenantId, retentionDays };
}

/**
 * Clean up expired recordings for a tenant.
 * Returns storage paths of deleted recordings for file removal.
 *
 * Called periodically by the IoT monitoring agent or n8n workflow.
 */
export async function cleanupExpiredRecordings(
  tenantId: string
): Promise<string[]> {
  return deleteExpiredRecordings(tenantId);
}

// ─── Camera Listing ───────────────────────────────────────────────────────────

/**
 * List all CCTV cameras for a tenant.
 *
 * Requirement 36.1: Live feed view for each registered CCTV camera.
 */
export async function listCameras(
  tenantId: string,
  accessContext: CCTVAccessContext
): Promise<IoTDevice[]> {
  verifyCCTVAccess(accessContext);
  return listDevices(tenantId, { type: 'cctv' });
}

/**
 * Get cameras for grid view (max 4 simultaneous).
 *
 * Requirement 36.5: Up to 4 live feeds on desktop grid.
 */
export async function getCamerasForGrid(
  tenantId: string,
  deviceIds: string[],
  accessContext: CCTVAccessContext
): Promise<StreamProxyResult[]> {
  verifyCCTVAccess(accessContext);

  if (deviceIds.length > MAX_GRID_CAMERAS) {
    throw new CCTVError(
      `Maximum ${MAX_GRID_CAMERAS} cameras for simultaneous viewing`,
      'VALIDATION_ERROR'
    );
  }

  const results: StreamProxyResult[] = [];
  for (const deviceId of deviceIds) {
    const result = await getStreamProxy(tenantId, deviceId, accessContext);
    results.push(result);
  }

  return results;
}
