/**
 * Bookings service — business logic orchestration.
 *
 * Coordinates booking creation, pricing calculation, availability
 * checks, modifications, and event emission.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10
 */

import { v4 as uuidv4 } from 'uuid';

import { EventBus } from '@/lib/events/event-bus';
import { STREAMS } from '@/lib/events/streams';
import type { PlatformEvent } from '@/lib/events/types';
import { createRedisClient } from '@/lib/db/redis';
import {
  findOrCreateGuest,
  getRoom,
  getRatePlansForRoomType,
  createBookingRecord,
  getBookingById,
  listBookings,
  updateBooking,
} from './repository';
import { calculatePricing } from './pricing';
import {
  isRoomAvailable,
  acquireBookingLock,
  getAvailabilityCalendar,
} from './availability';
import type {
  Booking,
  BookingStatus,
  CreateBookingRequest,
  ModifyBookingRequest,
  PricingBreakdown,
  AvailabilityEntry,
  AvailabilityQuery,
  BookingCreatedPayload,
  BookingCancelledPayload,
  BookingCompletedPayload,
} from './types';

// ─── Error Classes ────────────────────────────────────────────────────────────

export class BookingError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_ERROR'
      | 'AVAILABILITY_CONFLICT'
      | 'NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'PRICING_ERROR'
      | 'INTERNAL_ERROR',
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

// ─── Event Emission Helper ────────────────────────────────────────────────────

let eventBusInstance: EventBus | null = null;

/**
 * Get or create the EventBus singleton.
 * Lazily initialized to avoid creating connections at module load.
 */
async function getEventBus(): Promise<EventBus> {
  if (!eventBusInstance) {
    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    eventBusInstance = new EventBus({ publisher, subscriber });
  }
  return eventBusInstance;
}

/**
 * Emit a booking lifecycle event to the event bus.
 */
async function emitBookingEvent<T>(
  type: string,
  tenantId: string,
  payload: T,
  actorUserId: string,
  actorRole: string,
  correlationId?: string
): Promise<void> {
  try {
    const eventBus = await getEventBus();

    const event: PlatformEvent<T> = {
      id: uuidv4(),
      type,
      version: 1,
      timestamp: new Date().toISOString(),
      source: 'bookings',
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
        priority: 'normal',
      },
    };

    await eventBus.emit(STREAMS.BOOKINGS, event);
  } catch {
    // Event emission failure should not break the booking flow.
    // In production, log this for monitoring.
    console.error(`[Bookings] Failed to emit event: ${type}`);
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate create booking request fields.
 * Requirements: 5.8
 */
function validateCreateRequest(body: CreateBookingRequest): string[] {
  const errors: string[] = [];

  if (!body.checkIn) errors.push('checkIn is required');
  if (!body.checkOut) errors.push('checkOut is required');
  if (!body.roomId) errors.push('roomId is required');
  if (!body.guestName) errors.push('guestName is required');
  if (!body.guestEmail && !body.guestPhone) {
    errors.push('At least one of guestEmail or guestPhone is required');
  }

  // Validate date format
  if (body.checkIn && !/^\d{4}-\d{2}-\d{2}$/.test(body.checkIn)) {
    errors.push('checkIn must be in YYYY-MM-DD format');
  }
  if (body.checkOut && !/^\d{4}-\d{2}-\d{2}$/.test(body.checkOut)) {
    errors.push('checkOut must be in YYYY-MM-DD format');
  }

  // Validate check-out is after check-in
  if (body.checkIn && body.checkOut && body.checkOut <= body.checkIn) {
    errors.push('checkOut must be after checkIn');
  }

  return errors;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Create a new booking.
 *
 * Flow:
 * 1. Validate input fields
 * 2. Verify room exists
 * 3. Check availability with conflict resolution
 * 4. Calculate pricing
 * 5. Find or create guest
 * 6. Insert booking record
 * 7. Emit booking.created event
 *
 * Requirements: 5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 5.10
 */
export async function createBooking(
  tenantId: string,
  request: CreateBookingRequest,
  actorUserId: string,
  actorRole: string
): Promise<{ booking: Booking; pricing: PricingBreakdown | null }> {
  // 1. Validate
  const validationErrors = validateCreateRequest(request);
  if (validationErrors.length > 0) {
    throw new BookingError(
      `Validation failed: ${validationErrors.join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }

  // 2. Verify room exists
  const room = await getRoom(tenantId, request.roomId);
  if (!room) {
    throw new BookingError(
      `Room not found: ${request.roomId}`,
      'NOT_FOUND',
      404
    );
  }

  if (room.status === 'blocked' || room.status === 'maintenance') {
    throw new BookingError(
      `Room is not available (status: ${room.status})`,
      'AVAILABILITY_CONFLICT',
      409
    );
  }

  // 3. Check availability with concurrent conflict resolution
  const available = await isRoomAvailable(
    tenantId,
    request.roomId,
    request.checkIn,
    request.checkOut
  );

  if (!available) {
    throw new BookingError(
      'Room is not available for the selected dates',
      'AVAILABILITY_CONFLICT',
      409
    );
  }

  // Acquire lock to prevent concurrent double-booking
  const lockAcquired = await acquireBookingLock(
    tenantId,
    request.roomId,
    request.checkIn,
    request.checkOut
  );

  if (!lockAcquired) {
    throw new BookingError(
      'Availability conflict: another booking is being processed for these dates',
      'AVAILABILITY_CONFLICT',
      409
    );
  }

  // 4. Calculate pricing
  const ratePlans = await getRatePlansForRoomType(tenantId, room.room_type_id);
  const pricing = calculatePricing(
    ratePlans,
    room.room_type_id,
    request.checkIn,
    request.checkOut
  );

  // 5. Find or create guest
  const guestId = await findOrCreateGuest(
    tenantId,
    request.guestName,
    request.guestEmail,
    request.guestPhone,
    request.guestNationality
  );

  // 6. Create booking record
  const booking = await createBookingRecord(
    tenantId,
    guestId,
    request.roomId,
    request.checkIn,
    request.checkOut,
    pricing?.totalAmount ?? null,
    pricing?.currency ?? 'USD',
    request.numGuests ?? 1,
    request.specialRequests ?? null,
    request.source ?? 'direct'
  );

  // 7. Emit booking.created event
  const eventPayload: BookingCreatedPayload = {
    bookingId: booking.id,
    roomId: booking.roomId,
    guestId: booking.guestId,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    totalAmount: booking.totalAmount,
    currency: booking.currency,
    source: booking.source,
  };

  await emitBookingEvent(
    'booking.created',
    tenantId,
    eventPayload,
    actorUserId,
    actorRole,
    booking.id
  );

  return { booking, pricing };
}

/**
 * Modify an existing booking.
 *
 * Supports date changes, room changes, status transitions,
 * and payment status updates.
 *
 * On cancellation, emits booking.cancelled event.
 * On completion, emits booking.completed event.
 *
 * Requirements: 5.2, 5.5
 */
export async function modifyBooking(
  tenantId: string,
  bookingId: string,
  updates: ModifyBookingRequest,
  actorUserId: string,
  actorRole: string
): Promise<Booking> {
  // Verify booking exists
  const existing = await getBookingById(tenantId, bookingId);
  if (!existing) {
    throw new BookingError(
      `Booking not found: ${bookingId}`,
      'NOT_FOUND',
      404
    );
  }

  // Validate status transition if status is being changed
  if (updates.status) {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled', 'no_show'],
      cancelled: [],
      completed: [],
      no_show: [],
    };

    const allowed = validTransitions[existing.status] ?? [];
    if (!allowed.includes(updates.status)) {
      throw new BookingError(
        `Cannot transition from '${existing.status}' to '${updates.status}'`,
        'INVALID_TRANSITION',
        400
      );
    }
  }

  // If dates or room are changing, check availability
  const newCheckIn = updates.checkIn ?? existing.checkIn;
  const newCheckOut = updates.checkOut ?? existing.checkOut;
  const newRoomId = updates.roomId ?? existing.roomId;

  const datesOrRoomChanged =
    newCheckIn !== existing.checkIn ||
    newCheckOut !== existing.checkOut ||
    newRoomId !== existing.roomId;

  if (datesOrRoomChanged && updates.status !== 'cancelled') {
    // Check availability for the new dates/room, excluding the current booking
    const available = await isRoomAvailableExcluding(
      tenantId,
      newRoomId,
      newCheckIn,
      newCheckOut,
      bookingId
    );

    if (!available) {
      throw new BookingError(
        'Room is not available for the modified dates',
        'AVAILABILITY_CONFLICT',
        409
      );
    }
  }

  // Apply the update
  const updated = await updateBooking(tenantId, bookingId, updates);
  if (!updated) {
    throw new BookingError(
      'Failed to update booking',
      'INTERNAL_ERROR',
      500
    );
  }

  // Emit lifecycle events based on status change
  if (updates.status === 'cancelled') {
    const cancelPayload: BookingCancelledPayload = {
      bookingId: updated.id,
      roomId: updated.roomId,
      checkIn: updated.checkIn,
      checkOut: updated.checkOut,
    };
    await emitBookingEvent(
      'booking.cancelled',
      tenantId,
      cancelPayload,
      actorUserId,
      actorRole,
      bookingId
    );
  } else if (updates.status === 'confirmed') {
    await emitBookingEvent(
      'booking.confirmed',
      tenantId,
      {
        bookingId: updated.id,
        roomId: updated.roomId,
        guestId: updated.guestId,
        checkIn: updated.checkIn,
        checkOut: updated.checkOut,
      },
      actorUserId,
      actorRole,
      bookingId
    );
  } else if (updates.status === 'completed') {
    const completedPayload: BookingCompletedPayload = {
      bookingId: updated.id,
      roomId: updated.roomId,
      guestId: updated.guestId,
      checkIn: updated.checkIn,
      checkOut: updated.checkOut,
    };
    await emitBookingEvent(
      'booking.completed',
      tenantId,
      completedPayload,
      actorUserId,
      actorRole,
      bookingId
    );
  }

  return updated;
}

/**
 * Get booking availability calendar.
 *
 * Requirements: 5.1, 5.10
 */
export async function checkAvailability(
  tenantId: string,
  query: AvailabilityQuery
): Promise<AvailabilityEntry[]> {
  if (!query.startDate || !query.endDate) {
    throw new BookingError(
      'startDate and endDate are required',
      'VALIDATION_ERROR',
      400
    );
  }

  if (query.endDate <= query.startDate) {
    throw new BookingError(
      'endDate must be after startDate',
      'VALIDATION_ERROR',
      400
    );
  }

  return getAvailabilityCalendar(
    tenantId,
    query.startDate,
    query.endDate,
    query.roomId
  );
}

/**
 * Calculate pricing for a potential booking without creating it.
 */
export async function getPricingEstimate(
  tenantId: string,
  roomId: string,
  checkIn: string,
  checkOut: string
): Promise<PricingBreakdown | null> {
  const room = await getRoom(tenantId, roomId);
  if (!room) {
    throw new BookingError(`Room not found: ${roomId}`, 'NOT_FOUND', 404);
  }

  const ratePlans = await getRatePlansForRoomType(tenantId, room.room_type_id);
  return calculatePricing(ratePlans, room.room_type_id, checkIn, checkOut);
}

/**
 * Get a single booking by ID.
 */
export async function getBooking(
  tenantId: string,
  bookingId: string
): Promise<Booking> {
  const booking = await getBookingById(tenantId, bookingId);
  if (!booking) {
    throw new BookingError(
      `Booking not found: ${bookingId}`,
      'NOT_FOUND',
      404
    );
  }
  return booking;
}

/**
 * List bookings for a tenant.
 */
export async function getBookings(
  tenantId: string,
  filters?: {
    status?: BookingStatus;
    roomId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ bookings: Booking[]; total: number }> {
  return listBookings(tenantId, filters);
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Check room availability excluding a specific booking
 * (used during booking modification to allow the same booking's dates).
 */
async function isRoomAvailableExcluding(
  tenantId: string,
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId: string
): Promise<boolean> {
  const { tenantQuery: tq } = await import('@/lib/db/tenant-query');

  const result = await tq<{ conflict_count: string }>(
    tenantId,
    `SELECT COUNT(*) AS conflict_count
     FROM bookings
     WHERE room_id = $1
       AND id != $2
       AND status NOT IN ('cancelled')
       AND check_in < $4
       AND check_out > $3`,
    [roomId, excludeBookingId, checkIn, checkOut]
  );

  return parseInt(result.rows[0].conflict_count, 10) === 0;
}
