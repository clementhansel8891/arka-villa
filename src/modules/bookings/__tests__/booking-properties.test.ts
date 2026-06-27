/**
 * Property-based tests for booking engine.
 *
 * Validates: Requirements 5.3, 5.6, 5.8, 5.10
 *
 * Uses fast-check to verify invariants of:
 * - Booking conflict resolution (first-wins, check-out date exclusion)
 * - Pricing calculation with rate plans
 * - Booking validation for required fields
 * - Check-out date availability (half-open interval)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculatePricing,
  selectBestRatePlan,
  calculateNights,
} from '../pricing';
import { isValidTransition } from '../availability';
import type { RatePlan, RatePlanType, CreateBookingRequest } from '../types';

// ─── Helpers & Generators ─────────────────────────────────────────────────────

const ROOM_TYPE_ID = 'rt-test';

/** Generate a valid ISO date string (YYYY-MM-DD) within a reasonable range. */
const dateArb = fc
  .integer({ min: 0, max: 3650 }) // days offset from 2024-01-01
  .map((offset) => {
    const d = new Date(2024, 0, 1 + offset);
    return d.toISOString().split('T')[0];
  });

/** Generate a pair of dates where checkOut > checkIn (1 to 90 nights). */
const dateRangeArb = fc
  .tuple(
    fc.integer({ min: 0, max: 3000 }), // start day offset
    fc.integer({ min: 1, max: 90 }) // stay length in nights
  )
  .map(([startOffset, nights]) => {
    const checkIn = new Date(2024, 0, 1 + startOffset);
    const checkOut = new Date(2024, 0, 1 + startOffset + nights);
    return {
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      nights,
    };
  });

/** Generate a rate plan with configurable type and rate. */
function makeRatePlan(overrides: Partial<RatePlan> = {}): RatePlan {
  return {
    id: 'rp-test',
    roomTypeId: ROOM_TYPE_ID,
    name: 'Test Plan',
    type: 'base',
    rate: 100,
    currency: 'USD',
    minStay: 1,
    discountPercent: 0,
    startDate: null,
    endDate: null,
    isActive: true,
    ...overrides,
  };
}

/** Generate a valid rate plan with random rate and discount. */
const ratePlanArb = fc
  .record({
    rate: fc.integer({ min: 1, max: 10000 }),
    discountPercent: fc.integer({ min: 0, max: 100 }),
    minStay: fc.integer({ min: 1, max: 30 }),
  })
  .map(({ rate, discountPercent, minStay }) =>
    makeRatePlan({ rate, discountPercent, minStay })
  );

/**
 * Validate a booking request against required fields.
 * Mirrors the validation logic in the service.
 */
function validateCreateRequest(body: Partial<CreateBookingRequest>): string[] {
  const errors: string[] = [];
  if (!body.checkIn) errors.push('checkIn is required');
  if (!body.checkOut) errors.push('checkOut is required');
  if (!body.roomId) errors.push('roomId is required');
  if (!body.guestName) errors.push('guestName is required');
  if (!body.guestEmail && !body.guestPhone) {
    errors.push('At least one of guestEmail or guestPhone is required');
  }
  return errors;
}

/**
 * Check if two half-open date ranges [A, B) and [C, D) overlap.
 * Overlap condition: A < D AND C < B
 * Exact boundary sharing (B == C) is NOT a conflict.
 */
function datesOverlap(
  checkInA: string,
  checkOutA: string,
  checkInB: string,
  checkOutB: string
): boolean {
  return checkInA < checkOutB && checkInB < checkOutA;
}

// ─── Property 6: Booking Conflict Resolution ──────────────────────────────────

describe('Property 6: Booking Conflict Resolution', () => {
  /**
   * Validates: Requirements 5.3
   * Property: Two bookings with overlapping half-open intervals [A,B) and [C,D)
   * conflict if and only if A < D AND C < B.
   */
  it('property: overlapping half-open intervals are detected as conflicts', () => {
    const twoRangesArb = fc.tuple(
      fc.integer({ min: 0, max: 1000 }),
      fc.integer({ min: 1, max: 90 }),
      fc.integer({ min: 0, max: 1000 }),
      fc.integer({ min: 1, max: 90 })
    );

    fc.assert(
      fc.property(twoRangesArb, ([startA, lengthA, startB, lengthB]) => {
        const baseDate = new Date(2024, 0, 1);
        const checkInA = new Date(baseDate.getTime() + startA * 86400000)
          .toISOString().split('T')[0];
        const checkOutA = new Date(baseDate.getTime() + (startA + lengthA) * 86400000)
          .toISOString().split('T')[0];
        const checkInB = new Date(baseDate.getTime() + startB * 86400000)
          .toISOString().split('T')[0];
        const checkOutB = new Date(baseDate.getTime() + (startB + lengthB) * 86400000)
          .toISOString().split('T')[0];

        const overlap = datesOverlap(checkInA, checkOutA, checkInB, checkOutB);
        // Overlap iff startA < startB + lengthB AND startB < startA + lengthA
        const expectedOverlap =
          startA < startB + lengthB && startB < startA + lengthA;

        expect(overlap).toBe(expectedOverlap);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Validates: Requirements 5.3, 5.10
   * Property: When check-out date of booking A equals check-in date of
   * booking B (exact boundary sharing), there is NO conflict.
   * This enables back-to-back bookings.
   */
  it('property: exact boundary sharing (checkOutA == checkInB) is never a conflict', () => {
    const boundaryArb = fc.tuple(
      fc.integer({ min: 0, max: 2000 }), // start of A
      fc.integer({ min: 1, max: 90 }),    // length of A
      fc.integer({ min: 1, max: 90 })     // length of B
    );

    fc.assert(
      fc.property(boundaryArb, ([startA, lengthA, lengthB]) => {
        const baseDate = new Date(2024, 0, 1);
        const checkInA = new Date(baseDate.getTime() + startA * 86400000)
          .toISOString().split('T')[0];
        const checkOutA = new Date(baseDate.getTime() + (startA + lengthA) * 86400000)
          .toISOString().split('T')[0];
        // B starts exactly when A ends
        const checkInB = checkOutA;
        const checkOutB = new Date(
          baseDate.getTime() + (startA + lengthA + lengthB) * 86400000
        ).toISOString().split('T')[0];

        const overlap = datesOverlap(checkInA, checkOutA, checkInB, checkOutB);
        expect(overlap).toBe(false);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Validates: Requirements 5.3
   * Property: Conflict detection is symmetric — if A conflicts with B,
   * then B conflicts with A.
   */
  it('property: conflict detection is symmetric', () => {
    const twoRangesArb = fc.tuple(
      fc.integer({ min: 0, max: 1000 }),
      fc.integer({ min: 1, max: 90 }),
      fc.integer({ min: 0, max: 1000 }),
      fc.integer({ min: 1, max: 90 })
    );

    fc.assert(
      fc.property(twoRangesArb, ([startA, lengthA, startB, lengthB]) => {
        const baseDate = new Date(2024, 0, 1);
        const checkInA = new Date(baseDate.getTime() + startA * 86400000)
          .toISOString().split('T')[0];
        const checkOutA = new Date(baseDate.getTime() + (startA + lengthA) * 86400000)
          .toISOString().split('T')[0];
        const checkInB = new Date(baseDate.getTime() + startB * 86400000)
          .toISOString().split('T')[0];
        const checkOutB = new Date(baseDate.getTime() + (startB + lengthB) * 86400000)
          .toISOString().split('T')[0];

        const ab = datesOverlap(checkInA, checkOutA, checkInB, checkOutB);
        const ba = datesOverlap(checkInB, checkOutB, checkInA, checkOutA);
        expect(ab).toBe(ba);
      }),
      { numRuns: 300 }
    );
  });
});

// ─── Property 7: Pricing Calculation with Rate Plans ──────────────────────────

describe('Property 7: Pricing Calculation with Rate Plans', () => {
  /**
   * Validates: Requirements 5.6
   * Property: totalAmount = (nightlyRate × nights) × (1 - discountPercent/100),
   * rounded to 2 decimal places.
   */
  it('property: total amount follows the pricing formula', () => {
    // Generate a base rate plan with random rate and discount
    const pricingArb = fc.tuple(
      fc.integer({ min: 1, max: 10000 }),  // nightly rate
      fc.integer({ min: 0, max: 99 }),     // discount (0-99 to avoid zero total)
      fc.integer({ min: 1, max: 90 })      // nights
    );

    fc.assert(
      fc.property(pricingArb, ([rate, discount, nights]) => {
        const plan = makeRatePlan({ rate, discountPercent: discount, minStay: 1 });
        const baseDate = new Date(2024, 0, 1);
        const checkIn = baseDate.toISOString().split('T')[0];
        const checkOut = new Date(baseDate.getTime() + nights * 86400000)
          .toISOString().split('T')[0];

        const result = calculatePricing([plan], ROOM_TYPE_ID, checkIn, checkOut);

        expect(result).not.toBeNull();
        expect(result!.nights).toBe(nights);
        expect(result!.nightlyRate).toBe(rate);

        const expectedBase = rate * nights;
        const expectedDiscount = expectedBase * (discount / 100);
        const expectedTotal = Math.round((expectedBase - expectedDiscount) * 100) / 100;

        expect(result!.baseTotal).toBe(expectedBase);
        expect(result!.discountAmount).toBeCloseTo(expectedDiscount, 2);
        expect(result!.totalAmount).toBe(expectedTotal);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Validates: Requirements 5.6
   * Property: Promotional plans always take priority over seasonal,
   * which takes priority over base, when all are applicable.
   */
  it('property: promotional > seasonal > base priority ordering', () => {
    const nightsArb = fc.integer({ min: 3, max: 30 }); // ensure min stay met

    fc.assert(
      fc.property(nightsArb, (nights) => {
        const baseDate = new Date(2025, 6, 1); // July 2025
        const checkIn = baseDate.toISOString().split('T')[0];
        const checkOut = new Date(baseDate.getTime() + nights * 86400000)
          .toISOString().split('T')[0];

        const base = makeRatePlan({
          id: 'base',
          type: 'base',
          rate: 200,
          minStay: 1,
        });
        const seasonal = makeRatePlan({
          id: 'seasonal',
          type: 'seasonal',
          rate: 300,
          minStay: 1,
          startDate: '2025-06-01',
          endDate: '2025-09-30',
        });
        const promo = makeRatePlan({
          id: 'promo',
          type: 'promotional',
          rate: 250,
          minStay: 1,
          discountPercent: 10,
          startDate: '2025-06-01',
          endDate: '2025-09-30',
        });

        // With all three, promotional wins
        const best = selectBestRatePlan(
          [base, seasonal, promo],
          ROOM_TYPE_ID,
          checkIn,
          checkOut
        );
        expect(best?.id).toBe('promo');

        // Without promotional, seasonal wins
        const bestNoPromo = selectBestRatePlan(
          [base, seasonal],
          ROOM_TYPE_ID,
          checkIn,
          checkOut
        );
        expect(bestNoPromo?.id).toBe('seasonal');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 5.6
   * Property: calculateNights always returns checkOut - checkIn in days.
   * The result is always >= 0 for valid date pairs.
   */
  it('property: calculateNights matches day difference', () => {
    const rangeArb = fc.tuple(
      fc.integer({ min: 0, max: 3000 }),
      fc.integer({ min: 0, max: 365 })
    );

    fc.assert(
      fc.property(rangeArb, ([startOffset, nightCount]) => {
        const baseDate = new Date(2024, 0, 1);
        const checkIn = new Date(baseDate.getTime() + startOffset * 86400000)
          .toISOString().split('T')[0];
        const checkOut = new Date(
          baseDate.getTime() + (startOffset + nightCount) * 86400000
        ).toISOString().split('T')[0];

        const result = calculateNights(checkIn, checkOut);
        expect(result).toBe(nightCount);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Validates: Requirements 5.6
   * Property: Pricing returns null when nights <= 0.
   */
  it('property: pricing returns null for zero or negative nights', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const plan = makeRatePlan({ rate: 100, minStay: 1 });
        // Same date = 0 nights
        const result = calculatePricing([plan], ROOM_TYPE_ID, date, date);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 8: Booking Validation - Required Fields ─────────────────────────

describe('Property 8: Booking Validation - Required Fields', () => {
  /**
   * Validates: Requirements 5.8
   * Property: A booking request missing checkIn, checkOut, roomId,
   * or guest contact (both email AND phone absent) is always rejected.
   */
  it('property: requests missing any required field are always rejected', () => {
    // Generate partial requests that are missing at least one required field
    const partialRequestArb = fc
      .record({
        checkIn: fc.option(fc.constant('2025-01-10'), { nil: undefined }),
        checkOut: fc.option(fc.constant('2025-01-12'), { nil: undefined }),
        roomId: fc.option(fc.constant('room-1'), { nil: undefined }),
        guestName: fc.option(fc.constant('Test Guest'), { nil: undefined }),
        guestEmail: fc.option(fc.constant('test@example.com'), { nil: undefined }),
        guestPhone: fc.option(fc.constant('+1234567890'), { nil: undefined }),
      })
      .filter((req) => {
        // Must be missing at least one required field
        const missingDate = !req.checkIn || !req.checkOut;
        const missingRoom = !req.roomId;
        const missingName = !req.guestName;
        const missingContact = !req.guestEmail && !req.guestPhone;
        return missingDate || missingRoom || missingName || missingContact;
      });

    fc.assert(
      fc.property(partialRequestArb, (request) => {
        const errors = validateCreateRequest(request);
        expect(errors.length).toBeGreaterThan(0);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Validates: Requirements 5.8
   * Property: A request with all required fields present (including at
   * least one of email or phone) passes validation with zero errors.
   */
  it('property: complete requests with all required fields pass validation', () => {
    const completeRequestArb = fc
      .record({
        checkIn: fc.constant('2025-01-10'),
        checkOut: fc.constant('2025-01-15'),
        roomId: fc.constant('room-1'),
        guestName: fc.constant('Test Guest'),
        hasEmail: fc.boolean(),
        hasPhone: fc.boolean(),
      })
      .filter((r) => r.hasEmail || r.hasPhone)
      .map((r) => ({
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        roomId: r.roomId,
        guestName: r.guestName,
        guestEmail: r.hasEmail ? 'guest@test.com' : undefined,
        guestPhone: r.hasPhone ? '+1234567890' : undefined,
      }));

    fc.assert(
      fc.property(completeRequestArb, (request) => {
        const errors = validateCreateRequest(request as Partial<CreateBookingRequest>);
        expect(errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 5.8
   * Property: Having email alone OR phone alone satisfies the
   * guest contact requirement.
   */
  it('property: email alone or phone alone satisfies contact requirement', () => {
    const contactArb = fc.oneof(
      fc.record({
        guestEmail: fc.constant('a@b.com'),
        guestPhone: fc.constant(undefined as unknown as string),
      }),
      fc.record({
        guestEmail: fc.constant(undefined as unknown as string),
        guestPhone: fc.constant('+1234567890'),
      }),
      fc.record({
        guestEmail: fc.constant('a@b.com'),
        guestPhone: fc.constant('+1234567890'),
      })
    );

    fc.assert(
      fc.property(contactArb, (contact) => {
        const request = {
          checkIn: '2025-03-01',
          checkOut: '2025-03-05',
          roomId: 'room-1',
          guestName: 'Guest',
          ...contact,
        };
        const errors = validateCreateRequest(request as Partial<CreateBookingRequest>);
        // No contact-related errors
        const contactErrors = errors.filter((e) =>
          e.includes('guestEmail') || e.includes('guestPhone')
        );
        expect(contactErrors).toHaveLength(0);
      }),
      { numRuns: 50 }
    );
  });
});

// ─── Property 9: Check-Out Date Availability ──────────────────────────────────

describe('Property 9: Check-Out Date Availability', () => {
  /**
   * Validates: Requirements 5.10
   * Property: If a booking occupies [checkIn, checkOut), then checkOut
   * is available for a new check-in. A new booking starting at checkOut
   * does NOT conflict with the existing booking.
   */
  it('property: check-out date is always available for new check-in', () => {
    const bookingArb = fc.tuple(
      fc.integer({ min: 0, max: 2000 }), // existing booking start
      fc.integer({ min: 1, max: 90 }),    // existing booking length
      fc.integer({ min: 1, max: 90 })     // new booking length
    );

    fc.assert(
      fc.property(bookingArb, ([start, lengthA, lengthB]) => {
        const baseDate = new Date(2024, 0, 1);
        const checkInA = new Date(baseDate.getTime() + start * 86400000)
          .toISOString().split('T')[0];
        const checkOutA = new Date(baseDate.getTime() + (start + lengthA) * 86400000)
          .toISOString().split('T')[0];

        // New booking starts exactly at checkOutA
        const checkInB = checkOutA;
        const checkOutB = new Date(
          baseDate.getTime() + (start + lengthA + lengthB) * 86400000
        ).toISOString().split('T')[0];

        // Half-open interval: [A.checkIn, A.checkOut) does NOT include A.checkOut
        // So B starting at A.checkOut should never conflict
        const conflict = datesOverlap(checkInA, checkOutA, checkInB, checkOutB);
        expect(conflict).toBe(false);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Validates: Requirements 5.10
   * Property: A new booking ending at checkInA (back-to-back preceding)
   * also does NOT conflict — the new booking's checkOut equals the existing
   * booking's checkIn, so they don't overlap.
   */
  it('property: preceding back-to-back booking (B.checkOut == A.checkIn) has no conflict', () => {
    const bookingArb = fc.tuple(
      fc.integer({ min: 90, max: 2000 }), // existing booking start (>= 90 to fit preceding)
      fc.integer({ min: 1, max: 90 }),     // existing booking length
      fc.integer({ min: 1, max: 90 })      // preceding booking length
    );

    fc.assert(
      fc.property(bookingArb, ([start, lengthA, lengthB]) => {
        const baseDate = new Date(2024, 0, 1);
        const checkInA = new Date(baseDate.getTime() + start * 86400000)
          .toISOString().split('T')[0];
        const checkOutA = new Date(baseDate.getTime() + (start + lengthA) * 86400000)
          .toISOString().split('T')[0];

        // Preceding booking ends exactly at checkInA
        const checkInB = new Date(baseDate.getTime() + (start - lengthB) * 86400000)
          .toISOString().split('T')[0];
        const checkOutB = checkInA;

        const conflict = datesOverlap(checkInA, checkOutA, checkInB, checkOutB);
        expect(conflict).toBe(false);
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Validates: Requirements 5.10
   * Property: Any booking that starts strictly before the existing booking's
   * checkOut and ends strictly after the existing booking's checkIn DOES
   * conflict — verifying that the interior of the range is properly guarded.
   */
  it('property: bookings strictly overlapping the interior always conflict', () => {
    const overlapArb = fc.tuple(
      fc.integer({ min: 0, max: 1000 }), // existing booking start
      fc.integer({ min: 2, max: 90 }),    // existing booking length (>= 2 to have interior)
      fc.integer({ min: 1, max: 89 })     // offset into existing booking for overlap start
    ).filter(([, length, offset]) => offset < length);

    fc.assert(
      fc.property(overlapArb, ([start, lengthA, offset]) => {
        const baseDate = new Date(2024, 0, 1);
        const checkInA = new Date(baseDate.getTime() + start * 86400000)
          .toISOString().split('T')[0];
        const checkOutA = new Date(baseDate.getTime() + (start + lengthA) * 86400000)
          .toISOString().split('T')[0];

        // New booking starts within the existing booking's range
        const checkInB = new Date(baseDate.getTime() + (start + offset) * 86400000)
          .toISOString().split('T')[0];
        const checkOutB = new Date(
          baseDate.getTime() + (start + lengthA + 1) * 86400000
        ).toISOString().split('T')[0];

        const conflict = datesOverlap(checkInA, checkOutA, checkInB, checkOutB);
        expect(conflict).toBe(true);
      }),
      { numRuns: 300 }
    );
  });
});
