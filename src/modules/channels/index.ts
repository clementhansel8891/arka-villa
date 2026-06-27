/**
 * Channels Module
 *
 * OTA synchronization, channel adapters for Booking.com,
 * Airbnb, and other external platforms.
 *
 * Provides:
 * - ChannelAdapter interface for OTA integrations
 * - Booking.com and Airbnb adapters
 * - Sync orchestration with retry and conflict resolution
 * - Event logging with 90-day retention
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

export * from './types';

export {
  triggerManualSync,
  pollInboundReservations,
  pushAvailabilityToChannels,
  pushRatesToChannels,
  resolveConflicts,
  getChannelSyncStatus,
  getAllChannelStatuses,
  validateExternalReservation,
  calculateBackoffDelay,
  withRetry,
  ChannelError,
} from './service';

export {
  registerAdapter,
  getAdapter,
  getAllAdapters,
  getRegisteredChannelIds,
  unregisterAdapter,
  BookingComAdapter,
  AirbnbAdapter,
} from './adapters';

export { logSyncEvent, getSyncLogs, purgeSyncLogs } from './sync-log';
