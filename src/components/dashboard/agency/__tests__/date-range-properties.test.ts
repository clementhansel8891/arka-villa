/**
 * Property-based tests for date range validation in the Agency Dashboard.
 *
 * Validates: Requirements 3.5
 *
 * Uses fast-check to verify invariants of the date range filter:
 * - Invalid ranges (end < start) are always rejected
 * - Ranges exceeding 12 months are always rejected
 * - Valid ranges (end >= start AND within 12 months) are always accepted
 * - Boundary: exactly 12 months is accepted, 12 months + 1 day is rejected
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateDateRange } from '../date-range-validation';

// ─── Helpers & Generators ─────────────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD string. */
function toISODate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Generate a valid ISO date string within a reasonable range (2020–2030). */
const dateArb = fc
  .integer({ min: 0, max: 3650 }) // days offset from 2020-01-01
  .map((offset) => {
    const d = new Date(Date.UTC(2020, 0, 1 + offset));
    return toISODate(d);
  });

/**
 * Generate a pair of dates where endDate < startDate (invalid: end precedes start).
 * We generate two distinct offsets and ensure start > end.
 */
const invertedDatePairArb = fc
  .tuple(
    fc.integer({ min: 1, max: 3650 }), // start offset (at least 1 to allow end before)
    fc.integer({ min: 1, max: 365 }) // how many days end precedes start
  )
  .map(([startOffset, gap]) => {
    const start = new Date(Date.UTC(2020, 0, 1 + startOffset));
    const end = new Date(Date.UTC(2020, 0, 1 + startOffset - gap));
    return { startDate: toISODate(start), endDate: toISODate(end) };
  });

/**
 * Generate a pair of dates where the range exceeds 12 months.
 * We pick a start date, then create an end date that is more than 12 calendar months later.
 */
const exceedsMaxRangeArb = fc
  .tuple(
    fc.integer({ min: 0, max: 2000 }), // start offset from 2020-01-01
    fc.integer({ min: 1, max: 365 }) // extra days beyond 12 months
  )
  .map(([startOffset, extraDays]) => {
    const start = new Date(Date.UTC(2020, 0, 1 + startOffset));
    // End is exactly 12 months + extraDays beyond start
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 12);
    end.setUTCDate(end.getUTCDate() + extraDays);
    return { startDate: toISODate(start), endDate: toISODate(end) };
  });

/**
 * Generate a valid date pair: end >= start AND within 12 months.
 * We pick a start date, then a random number of days (0 to ~365) for the range,
 * ensuring we don't exceed 12 calendar months.
 */
const validDatePairArb = fc
  .tuple(
    fc.integer({ min: 0, max: 2500 }), // start offset from 2020-01-01
    fc.integer({ min: 0, max: 365 }) // days between start and end
  )
  .map(([startOffset, daysDiff]) => {
    const start = new Date(Date.UTC(2020, 0, 1 + startOffset));
    const end = new Date(Date.UTC(2020, 0, 1 + startOffset + daysDiff));
    return { startDate: toISODate(start), endDate: toISODate(end) };
  })
  .filter(({ startDate, endDate }) => {
    // Ensure the range is within 12 months
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    const maxEnd = new Date(start);
    maxEnd.setUTCMonth(maxEnd.getUTCMonth() + 12);
    return end <= maxEnd;
  });

// ─── Property 3: Invalid Date Range Rejection ─────────────────────────────────

describe('Property 3: Invalid Date Range Rejection', () => {
  /**
   * Validates: Requirements 3.5
   * Property: Any date pair where endDate < startDate is always rejected with an error.
   */
  it('property: end date before start date is always rejected', () => {
    fc.assert(
      fc.property(invertedDatePairArb, ({ startDate, endDate }) => {
        const result = validateDateRange(startDate, endDate);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('precede');
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Validates: Requirements 3.5
   * Property: Any date pair where the difference exceeds 12 months is always rejected.
   */
  it('property: range exceeding 12 months is always rejected', () => {
    fc.assert(
      fc.property(exceedsMaxRangeArb, ({ startDate, endDate }) => {
        const result = validateDateRange(startDate, endDate);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('12 months');
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Validates: Requirements 3.5
   * Property: Valid ranges (end >= start AND difference <= 12 months) are always accepted.
   */
  it('property: valid ranges are always accepted', () => {
    fc.assert(
      fc.property(validDatePairArb, ({ startDate, endDate }) => {
        const result = validateDateRange(startDate, endDate);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Validates: Requirements 3.5
   * Property: Exactly 12 months is the boundary — accepted at 12 months,
   * rejected at 12 months + 1 day.
   */
  it('property: exactly 12 months is accepted, 12 months + 1 day is rejected', () => {
    // Generate start dates and verify the boundary
    const startDateArb = fc
      .integer({ min: 0, max: 2500 })
      .map((offset) => {
        const d = new Date(Date.UTC(2020, 0, 1 + offset));
        return toISODate(d);
      });

    fc.assert(
      fc.property(startDateArb, (startDate) => {
        const start = new Date(startDate + 'T00:00:00Z');

        // Exactly 12 months later: should be accepted
        const exactly12 = new Date(start);
        exactly12.setUTCMonth(exactly12.getUTCMonth() + 12);
        const resultAt12 = validateDateRange(startDate, toISODate(exactly12));
        expect(resultAt12.valid).toBe(true);

        // 12 months + 1 day: should be rejected
        const over12 = new Date(exactly12);
        over12.setUTCDate(over12.getUTCDate() + 1);
        const resultOver12 = validateDateRange(startDate, toISODate(over12));
        expect(resultOver12.valid).toBe(false);
        expect(resultOver12.error).toContain('12 months');
      }),
      { numRuns: 300 }
    );
  });

  /**
   * Validates: Requirements 3.5
   * Property: Same start and end date (zero-length range) is always valid.
   */
  it('property: same start and end date is always valid', () => {
    fc.assert(
      fc.property(dateArb, (date) => {
        const result = validateDateRange(date, date);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 200 }
    );
  });
});
