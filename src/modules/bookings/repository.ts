/**
 * Bookings repository — tenant-scoped database queries.
 *
 * All queries use the tenant-scoped connection helper to ensure
 * data isolation between tenants.
 *
 * Requirements: 5.1, 5.2, 5.7, 5.8
 */

import { tenantQuery } from '@/lib/db/tenant-query';
import type {
  Booking,
  BookingRow,
  BookingStatus,
  PaymentStatus,
  RatePlan,
  RatePlanRow,
  GuestRow,
  RoomRow,
  ModifyBookingRequest,
} from './types';

// ─── Row → Domain Mappers ─────────────────────────────────────────────────────

function mapBookingRow(row: BookingRow): Booking {
  return {
    id: row.id,
    guestId: row.guest_id,
    roomId: row.room_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status,
    paymentStatus: row.payment_status,
    totalAmount: row.total_amount ? parseFloat(row.total_amount) : null,
    currency: row.currency,
    source: row.source,
    specialRequests: row.special_requests,
    numGuests: row.num_guests,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRatePlanRow(row: RatePlanRow): RatePlan {
  return {
    id: row.id,
    roomTypeId: row.room_type_id,
    name: row.name,
    type: row.type,
    rate: parseFloat(row.rate),
    currency: row.currency,
    minStay: row.min_stay,
    discountPercent: parseFloat(row.discount_percent),
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
  };
}

// ─── Guest Queries ────────────────────────────────────────────────────────────

/**
 * Find or create a guest record.
 * If a guest with the given email already exists, return that record.
 * Otherwise, create a new guest.
 */
export async function findOrCreateGuest(
  tenantId: string,
  name: string,
  email: string,
  phone: string,
  nationality?: string
): Promise<string> {
  // Try to find existing guest by email
  if (email) {
    const existing = await tenantQuery<GuestRow>(
      tenantId,
      `SELECT id FROM guests WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
  }

  // Create new guest
  const result = await tenantQuery<{ id: string }>(
    tenantId,
    `INSERT INTO guests (name, email, phone, nationality)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [name, email, phone, nationality ?? null]
  );

  return result.rows[0].id;
}

// ─── Room Queries ─────────────────────────────────────────────────────────────

/**
 * Get room details including room type ID.
 */
export async function getRoom(
  tenantId: string,
  roomId: string
): Promise<RoomRow | null> {
  const result = await tenantQuery<RoomRow>(
    tenantId,
    `SELECT id, room_type_id, name, floor, status FROM rooms WHERE id = $1`,
    [roomId]
  );
  return result.rows[0] ?? null;
}

// ─── Rate Plan Queries ────────────────────────────────────────────────────────

/**
 * Get all active rate plans for a room type.
 */
export async function getRatePlansForRoomType(
  tenantId: string,
  roomTypeId: string
): Promise<RatePlan[]> {
  const result = await tenantQuery<RatePlanRow>(
    tenantId,
    `SELECT id, room_type_id, name, type, rate, currency,
            min_stay, discount_percent, start_date, end_date, is_active
     FROM rate_plans
     WHERE room_type_id = $1 AND is_active = TRUE
     ORDER BY type DESC, rate ASC`,
    [roomTypeId]
  );
  return result.rows.map(mapRatePlanRow);
}

// ─── Booking Queries ──────────────────────────────────────────────────────────

/**
 * Create a new booking record.
 */
export async function createBookingRecord(
  tenantId: string,
  guestId: string,
  roomId: string,
  checkIn: string,
  checkOut: string,
  totalAmount: number | null,
  currency: string,
  numGuests: number,
  specialRequests: string | null,
  source: string
): Promise<Booking> {
  const result = await tenantQuery<BookingRow>(
    tenantId,
    `INSERT INTO bookings
       (guest_id, room_id, check_in, check_out, status, payment_status,
        total_amount, currency, num_guests, special_requests, source)
     VALUES ($1, $2, $3, $4, 'pending', 'pending', $5, $6, $7, $8, $9)
     RETURNING id, guest_id, room_id, check_in, check_out, status,
               payment_status, total_amount, currency, source,
               special_requests, num_guests, created_at, updated_at`,
    [
      guestId,
      roomId,
      checkIn,
      checkOut,
      totalAmount,
      currency,
      numGuests,
      specialRequests,
      source,
    ]
  );

  return mapBookingRow(result.rows[0]);
}

/**
 * Fetch a booking by ID.
 */
export async function getBookingById(
  tenantId: string,
  bookingId: string
): Promise<Booking | null> {
  const result = await tenantQuery<BookingRow>(
    tenantId,
    `SELECT id, guest_id, room_id, check_in, check_out, status,
            payment_status, total_amount, currency, source,
            special_requests, num_guests, created_at, updated_at
     FROM bookings
     WHERE id = $1`,
    [bookingId]
  );

  if (result.rows.length === 0) return null;
  return mapBookingRow(result.rows[0]);
}

/**
 * List bookings with optional filters.
 */
export async function listBookings(
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
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters?.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters?.roomId) {
    conditions.push(`room_id = $${paramIdx++}`);
    params.push(filters.roomId);
  }
  if (filters?.startDate) {
    conditions.push(`check_in >= $${paramIdx++}`);
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    conditions.push(`check_out <= $${paramIdx++}`);
    params.push(filters.endDate);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const countResult = await tenantQuery<{ count: string }>(
    tenantId,
    `SELECT COUNT(*) AS count FROM bookings ${whereClause}`,
    params
  );

  const result = await tenantQuery<BookingRow>(
    tenantId,
    `SELECT id, guest_id, room_id, check_in, check_out, status,
            payment_status, total_amount, currency, source,
            special_requests, num_guests, created_at, updated_at
     FROM bookings
     ${whereClause}
     ORDER BY check_in DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset]
  );

  return {
    bookings: result.rows.map(mapBookingRow),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Update a booking (modifications and status changes).
 */
export async function updateBooking(
  tenantId: string,
  bookingId: string,
  updates: ModifyBookingRequest
): Promise<Booking | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (updates.checkIn !== undefined) {
    setClauses.push(`check_in = $${paramIdx++}`);
    params.push(updates.checkIn);
  }
  if (updates.checkOut !== undefined) {
    setClauses.push(`check_out = $${paramIdx++}`);
    params.push(updates.checkOut);
  }
  if (updates.roomId !== undefined) {
    setClauses.push(`room_id = $${paramIdx++}`);
    params.push(updates.roomId);
  }
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    params.push(updates.status);
  }
  if (updates.paymentStatus !== undefined) {
    setClauses.push(`payment_status = $${paramIdx++}`);
    params.push(updates.paymentStatus);
  }
  if (updates.numGuests !== undefined) {
    setClauses.push(`num_guests = $${paramIdx++}`);
    params.push(updates.numGuests);
  }
  if (updates.specialRequests !== undefined) {
    setClauses.push(`special_requests = $${paramIdx++}`);
    params.push(updates.specialRequests);
  }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = NOW()`);

  const result = await tenantQuery<BookingRow>(
    tenantId,
    `UPDATE bookings
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIdx}
     RETURNING id, guest_id, room_id, check_in, check_out, status,
               payment_status, total_amount, currency, source,
               special_requests, num_guests, created_at, updated_at`,
    [...params, bookingId]
  );

  if (result.rows.length === 0) return null;
  return mapBookingRow(result.rows[0]);
}
