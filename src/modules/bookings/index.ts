/**
 * Bookings Module
 *
 * Reservation management, availability engine,
 * pricing calculation, booking lifecycle events,
 * and availability management (blocks, cache).
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10
 */

export * from './types';
export {
  createBooking,
  modifyBooking,
  checkAvailability,
  getPricingEstimate,
  getBooking,
  getBookings,
  BookingError,
} from './service';
export { calculatePricing, calculateNights, selectBestRatePlan } from './pricing';
export {
  isRoomAvailable,
  acquireBookingLock,
  getAvailabilityCalendar,
  isValidTransition,
} from './availability';
export {
  createBlock,
  removeBlock,
  createBulkBlock,
  cleanupExpiredBlocks,
  listBlocks,
  detectBookingConflicts,
  getCachedAvailability,
  setCachedAvailability,
  invalidateAvailabilityCache,
  buildCacheKey,
  AvailabilityManagementError,
} from './availability-management';
export type {
  AvailabilityBlock,
  CreateBlockRequest,
  BulkBlockRequest,
  BulkBlockResult,
  BlockConflict,
  BlockReason,
} from './availability-management';
