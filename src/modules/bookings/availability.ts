/**
 * Availability state machine and conflict resolution.
 *
 * Manages room availability transitions:
 * - Available → Booked (on booking creation)
 * - Available → Blocked (on manual block)
 * - Booked → Available (on cancellation)
 * - Blocked → Available (on unblock)
 *
 * Check-out date logic: the check-out date itself remains available
 * for new check-ins, enabling back-to-back bookings.
 *
 * Concurrent booking conflict resolution uses SELECT ... FOR UPDATE NOWAIT
 * to ensure only the first confirmed request wins.
 *
 * Requirements: 5.1, 5.3, 5.5, 5.10
 */

import { pool } from '@/lib/db/pool';
import { getTenantSchemaName } from '@/lib/db/tenant-query';
import type { RoomAvailabilityState, AvailabilityEntry } from './types';

/**
 * Valid state transitions for room availability.
 */
const VALID_TRANSITIONS: Record<
  RoomAvailabilityState,
  RoomAvailabilityState[]
> = {
  available: ['booked', 'blocked'],
  booked: ['available'],
  blocked: ['available'],
};

/**
 * Check if a state transition is valid.
 */
export function isValidTransition(
  from: RoomAvailabilityState,
  to: RoomAvailabilityState
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check room availability for a date range.
 *
 * Important: The check-out date is NOT considered occupied.
 * A booking occupies [checkIn, checkOut) — the check-out date
 * is available for new check-ins.
 *
 * @param tenantId - Tenant identifier
 * @param roomId - Room to check
 * @param checkIn - Start date (YYYY-MM-DD)
 * @param checkOut - End date (YYYY-MM-DD)
 * @returns true if the room is available for the entire range
 */
export async function isRoomAvailable(
  tenantId: string,
  roomId: string,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  const schema = getTenantSchemaName(tenantId);
  const client = await pool.connect();

  try {
    await client.query(`SET search_path TO ${schema}, public`);

    // Check for overlapping bookings that are not cancelled.
    // Overlap condition with check-out date logic:
    // A booking B conflicts if B.check_in < our checkOut AND B.check_out > our checkIn
    // This means the check-out date is free for new check-in.
    const result = await client.query(
      `SELECT COUNT(*) AS conflict_count
       FROM bookings
       WHERE room_id = $1
         AND status NOT IN ('cancelled')
         AND check_in < $3
         AND check_out > $2`,
      [roomId, checkIn, checkOut]
    );

    return parseInt(result.rows[0].conflict_count, 10) === 0;
  } finally {
    await client.query('SET search_path TO public').catch(() => {});
    client.release();
  }
}

/**
 * Attempt to reserve a room using SELECT ... FOR UPDATE NOWAIT
 * for pessimistic locking to prevent double-bookings.
 *
 * If another transaction holds a conflicting lock, this will throw
 * immediately rather than waiting — the caller should handle the
 * error and return an availability conflict message.
 *
 * Requirements: 5.3
 *
 * @param tenantId - Tenant identifier
 * @param roomId - Room to reserve
 * @param checkIn - Start date (YYYY-MM-DD)
 * @param checkOut - End date (YYYY-MM-DD)
 * @returns true if reservation lock acquired, false if conflict detected
 */
export async function acquireBookingLock(
  tenantId: string,
  roomId: string,
  checkIn: string,
  checkOut: string
): Promise<boolean> {
  const schema = getTenantSchemaName(tenantId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SET search_path TO ${schema}, public`);

    // Lock conflicting booking rows to prevent concurrent inserts.
    // NOWAIT will throw an error if another transaction holds a lock.
    try {
      const lockResult = await client.query(
        `SELECT id FROM bookings
         WHERE room_id = $1
           AND status NOT IN ('cancelled')
           AND check_in < $3
           AND check_out > $2
         FOR UPDATE NOWAIT`,
        [roomId, checkIn, checkOut]
      );

      if (lockResult.rows.length > 0) {
        // Conflicting bookings exist
        await client.query('ROLLBACK');
        return false;
      }
    } catch (err: unknown) {
      // NOWAIT throws if rows are locked by another transaction
      await client.query('ROLLBACK');
      if (
        err instanceof Error &&
        (err.message.includes('could not obtain lock') ||
          err.message.includes('55P03'))
      ) {
        return false;
      }
      throw err;
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    await client.query('SET search_path TO public').catch(() => {});
    client.release();
  }
}

/**
 * Get availability calendar for rooms in a date range.
 *
 * Returns daily availability state per room, considering:
 * - Active (non-cancelled) bookings mark dates as "booked"
 * - Rooms with status "blocked" mark dates as "blocked"
 * - Check-out dates are marked as "available" (not booked)
 *
 * Requirements: 5.1, 5.10
 */
export async function getAvailabilityCalendar(
  tenantId: string,
  startDate: string,
  endDate: string,
  roomId?: string
): Promise<AvailabilityEntry[]> {
  const schema = getTenantSchemaName(tenantId);
  const client = await pool.connect();

  try {
    await client.query(`SET search_path TO ${schema}, public`);

    // Get rooms (optionally filtered)
    const roomQuery = roomId
      ? `SELECT id, name, status FROM rooms WHERE id = $1`
      : `SELECT id, name, status FROM rooms ORDER BY name`;
    const roomParams = roomId ? [roomId] : [];
    const roomsResult = await client.query(roomQuery, roomParams);

    // Get bookings in the date range
    const bookingsResult = await client.query(
      `SELECT room_id, check_in, check_out, id AS booking_id
       FROM bookings
       WHERE status NOT IN ('cancelled')
         AND check_in < $2
         AND check_out > $1
       ORDER BY check_in`,
      [startDate, endDate]
    );

    const entries: AvailabilityEntry[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (const room of roomsResult.rows) {
      const roomBookings = bookingsResult.rows.filter(
        (b: { room_id: string }) => b.room_id === room.id
      );

      // Generate entries for each date in the range
      const current = new Date(start);
      while (current < end) {
        const dateStr = current.toISOString().split('T')[0];
        let state: RoomAvailabilityState = 'available';
        let bookingId: string | undefined;

        // Check if room is blocked at room level
        if (room.status === 'blocked') {
          state = 'blocked';
        } else {
          // Check if date falls within any booking
          // A date is booked if: booking.check_in <= date < booking.check_out
          for (const booking of roomBookings) {
            const bCheckIn = new Date(booking.check_in).toISOString().split('T')[0];
            const bCheckOut = new Date(booking.check_out).toISOString().split('T')[0];

            if (dateStr >= bCheckIn && dateStr < bCheckOut) {
              state = 'booked';
              bookingId = booking.booking_id;
              break;
            }
          }
        }

        entries.push({
          date: dateStr,
          roomId: room.id,
          roomName: room.name,
          state,
          ...(bookingId && { bookingId }),
        });

        current.setDate(current.getDate() + 1);
      }
    }

    return entries;
  } finally {
    await client.query('SET search_path TO public').catch(() => {});
    client.release();
  }
}
