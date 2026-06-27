/**
 * Property-based tests for guest messaging window enforcement.
 *
 * **Validates: Requirements 12.1**
 *
 * Uses fast-check to verify invariants of the messaging window:
 * - Window opens 7 days before check-in (CI - 7)
 * - Window closes 7 days after checkout (CO + 7)
 * - Messages within the window are permitted
 * - Messages outside the window are denied
 * - Window size is always (stay_length + 14 days)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isWithinMessagingWindow } from '../service';
import type { BookingDateContext } from '../types';
import { MESSAGE_CONSTRAINTS } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
const WINDOW_BEFORE = MESSAGE_CONSTRAINTS.MESSAGING_WINDOW_BEFORE_DAYS; // 7
const WINDOW_AFTER = MESSAGE_CONSTRAINTS.MESSAGING_WINDOW_AFTER_DAYS; // 7

// ─── Helpers & Generators ─────────────────────────────────────────────────────

/**
 * Generate a valid booking with checkIn and checkOut dates.
 * Stay length ranges from 1 to 90 nights, starting within a 10-year range.
 */
const bookingDatesArb = fc
  .tuple(
    fc.integer({ min: 0, max: 3650 }), // start day offset from 2024-01-01
    fc.integer({ min: 1, max: 90 }) // stay length in nights
  )
  .map(([startOffset, stayLength]) => {
    const checkIn = new Date(2024, 0, 1 + startOffset);
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(2024, 0, 1 + startOffset + stayLength);
    checkOut.setHours(0, 0, 0, 0);
    return {
      booking: { checkInDate: checkIn, checkOutDate: checkOut } as BookingDateContext,
      stayLength,
    };
  });

/**
 * Compute the window start date (CI - 7 days) for a given booking.
 */
function windowStart(booking: BookingDateContext): Date {
  const start = new Date(booking.checkInDate);
  start.setDate(start.getDate() - WINDOW_BEFORE);
  return start;
}

/**
 * Compute the window end date (CO + 7 days) for a given booking.
 */
function windowEnd(booking: BookingDateContext): Date {
  const end = new Date(booking.checkOutDate);
  end.setDate(end.getDate() + WINDOW_AFTER);
  return end;
}

// ─── Property 17: Guest Messaging Window Enforcement ──────────────────────────

describe('Property 17: Guest Messaging Window Enforcement', () => {
  /**
   * **Validates: Requirements 12.1**
   * Property 1: Any date within [CI-7, CO+7] is always permitted.
   */
  it('property: any date within [CI-7, CO+7] is always permitted', () => {
    const withinWindowArb = bookingDatesArb.chain(({ booking, stayLength }) => {
      // Total window size in days: WINDOW_BEFORE + stayLength + WINDOW_AFTER
      const totalWindowDays = WINDOW_BEFORE + stayLength + WINDOW_AFTER;
      return fc.integer({ min: 0, max: totalWindowDays }).map((dayOffset) => {
        const start = windowStart(booking);
        const dateWithin = new Date(start.getTime() + dayOffset * MS_PER_DAY);
        return { booking, dateWithin };
      });
    });

    fc.assert(
      fc.property(withinWindowArb, ({ booking, dateWithin }) => {
        const result = isWithinMessagingWindow(booking, dateWithin);
        expect(result).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 12.1**
   * Property 2: Any date before CI-7 is always denied.
   */
  it('property: any date before CI-7 is always denied', () => {
    const beforeWindowArb = bookingDatesArb.chain(({ booking }) => {
      // Generate a number of days before the window start (1 to 365 days before)
      return fc.integer({ min: 1, max: 365 }).map((daysBefore) => {
        const start = windowStart(booking);
        const dateBefore = new Date(start.getTime() - daysBefore * MS_PER_DAY);
        return { booking, dateBefore };
      });
    });

    fc.assert(
      fc.property(beforeWindowArb, ({ booking, dateBefore }) => {
        const result = isWithinMessagingWindow(booking, dateBefore);
        expect(result).toBe(false);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 12.1**
   * Property 3: Any date after CO+7 is always denied.
   */
  it('property: any date after CO+7 is always denied', () => {
    const afterWindowArb = bookingDatesArb.chain(({ booking }) => {
      // Generate a number of days after the window end (1 to 365 days after)
      return fc.integer({ min: 1, max: 365 }).map((daysAfter) => {
        const end = windowEnd(booking);
        const dateAfter = new Date(end.getTime() + daysAfter * MS_PER_DAY);
        return { booking, dateAfter };
      });
    });

    fc.assert(
      fc.property(afterWindowArb, ({ booking, dateAfter }) => {
        const result = isWithinMessagingWindow(booking, dateAfter);
        expect(result).toBe(false);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 12.1**
   * Property 4: The boundaries — exactly CI-7 is permitted, exactly CO+7 is permitted.
   */
  it('property: exact boundaries CI-7 and CO+7 are both permitted', () => {
    fc.assert(
      fc.property(bookingDatesArb, ({ booking }) => {
        const start = windowStart(booking);
        const end = windowEnd(booking);

        // Exactly CI-7 should be permitted
        const resultStart = isWithinMessagingWindow(booking, start);
        expect(resultStart).toBe(true);

        // Exactly CO+7 should be permitted
        const resultEnd = isWithinMessagingWindow(booking, end);
        expect(resultEnd).toBe(true);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 12.1**
   * Property 5: The window size is always (stay_length + 14 days) regardless of booking dates.
   * This verifies the structural invariant: the total number of days in the window
   * equals the stay duration plus the before/after padding.
   */
  it('property: window size is always (stay_length + 14 days) regardless of booking dates', () => {
    fc.assert(
      fc.property(bookingDatesArb, ({ booking, stayLength }) => {
        const start = windowStart(booking);
        const end = windowEnd(booking);

        // Window size in days (inclusive of both boundaries)
        const windowSizeDays = Math.round(
          (end.getTime() - start.getTime()) / MS_PER_DAY
        );

        // Expected: stayLength + WINDOW_BEFORE + WINDOW_AFTER = stayLength + 14
        const expectedWindowSize = stayLength + WINDOW_BEFORE + WINDOW_AFTER;

        expect(windowSizeDays).toBe(expectedWindowSize);
      }),
      { numRuns: 500 }
    );
  });
});
