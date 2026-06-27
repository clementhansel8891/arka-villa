/**
 * CCTV Module
 *
 * Live feed proxy via Frigate NVR, historical recording playback,
 * configurable retention (7–90 days), and RBAC-controlled access.
 *
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5, 36.6, 36.7, 36.8
 */

export * from './types';

export {
  getStreamProxy,
  getRecordings,
  getRecording,
  createRecording,
  getRetentionConfig,
  updateRetentionConfig,
  cleanupExpiredRecordings,
  listCameras,
  getCamerasForGrid,
  verifyCCTVAccess,
  CCTVError,
} from './service';

export type {
  CCTVRecording,
  CCTVRecordingRow,
  RetentionConfig,
  StreamInfo,
  StreamProxyResult,
  GetRecordingsRequest,
  CCTVAccessContext,
  CCTVRole,
  StreamProtocol,
  FeedStatus,
} from './types';
