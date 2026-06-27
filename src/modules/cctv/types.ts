/**
 * CCTV module types.
 *
 * Live feed proxy, recording playback, retention management,
 * and RBAC-controlled camera access.
 *
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6, 36.7, 36.8
 */

// ─── Stream Protocol ──────────────────────────────────────────────────────────

/** Supported video streaming protocols. Requirement 36.6 */
export type StreamProtocol = 'rtsp' | 'hls';

/** Feed status for a camera stream. */
export type FeedStatus = 'live' | 'unavailable' | 'connecting';

// ─── Recording Types ──────────────────────────────────────────────────────────

export interface CCTVRecording {
  id: string;
  deviceId: string;
  startTime: string;
  endTime: string;
  storagePath: string;
  fileSizeBytes: number;
  retentionUntil: string;
  createdAt: string;
}

export interface CCTVRecordingRow {
  id: string;
  device_id: string;
  start_time: string;
  end_time: string;
  storage_path: string;
  file_size_bytes: string;
  retention_until: string;
  created_at: string;
}

// ─── Retention Configuration ──────────────────────────────────────────────────

/** Retention config per villa. Requirement 36.3 */
export interface RetentionConfig {
  tenantId: string;
  retentionDays: number;
}

/** Minimum retention in days. */
export const MIN_RETENTION_DAYS = 7;

/** Maximum retention in days. */
export const MAX_RETENTION_DAYS = 90;

/** Default retention in days. Requirement 36.3 */
export const DEFAULT_RETENTION_DAYS = 30;

// ─── Stream Info ──────────────────────────────────────────────────────────────

/** Information about a live camera stream. */
export interface StreamInfo {
  deviceId: string;
  deviceName: string;
  protocol: StreamProtocol;
  streamUrl: string;
  status: FeedStatus;
  lastFrame: string | null;
  lastFrameTimestamp: string | null;
}

// ─── Request/Response Types ───────────────────────────────────────────────────

export interface GetRecordingsRequest {
  deviceId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

export interface StreamProxyResult {
  streamUrl: string;
  protocol: StreamProtocol;
  status: FeedStatus;
  lastFrame: string | null;
  lastFrameTimestamp: string | null;
}

// ─── RBAC Types ───────────────────────────────────────────────────────────────

/** Roles for CCTV access control. Requirement 36.7 */
export type CCTVRole = 'Agency_Admin' | 'Villa_Owner' | 'Employee';

export interface CCTVAccessContext {
  userId: string;
  role: CCTVRole;
  tenantId: string;
  /** Villa IDs owned by the user (for Villa_Owner role). */
  ownedVillaIds?: string[];
  /** Whether employee has explicit CCTV grant. */
  hasCctvGrant?: boolean;
}

// ─── Frigate NVR Integration ──────────────────────────────────────────────────

/** Frigate NVR base URL from environment. */
export const FRIGATE_NVR_BASE_URL =
  process.env.FRIGATE_NVR_URL ?? 'http://frigate:5000';

/** Timeout for stream connection in milliseconds. Requirement 36.2 */
export const STREAM_CONNECT_TIMEOUT_MS = 10_000;

/** Maximum latency for live feed in seconds. Requirement 36.2 */
export const MAX_LIVE_LATENCY_SECONDS = 5;

/** Maximum cameras for simultaneous grid view. Requirement 36.5 */
export const MAX_GRID_CAMERAS = 4;
