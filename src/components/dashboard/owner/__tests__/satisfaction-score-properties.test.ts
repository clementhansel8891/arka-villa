/**
 * Property-based tests for guest satisfaction score calculation.
 *
 * **Validates: Requirements 4.8, 9.4**
 *
 * Uses fast-check to verify invariants of:
 * - Satisfaction score is always in [1.0, 5.0] for valid ratings
 * - Score equals the arithmetic mean rounded to 1 decimal place
 * - Single rating produces score equal to that rating (to 1 decimal)
 * - Empty ratings always returns null
 * - Uniform ratings produce score equal to that value
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateSatisfactionScore } from '../satisfaction-score';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Round to 1 decimal place using the same formula as the function under test. */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Generates a valid rating in [1, 5] (integer values as typical star ratings). */
const integerRatingArb = fc.integer({ min: 1, max: 5 });

/** Generates a valid rating in [1.0, 5.0] (continuous values for fractional ratings). */
const ratingArb = fc.double({ min: 1, max: 5, noNaN: true, noDefaultInfinity: true });

/** Generates a non-empty array of valid integer ratings (1 to 100 ratings per month). */
const ratingsArrayArb = fc.array(integerRatingArb, { minLength: 1, maxLength: 100 });

/** Generates a non-empty array of valid continuous ratings. */
const continuousRatingsArrayArb = fc.array(ratingArb, { minLength: 1, maxLength: 100 });

// ─── Property 5: Guest Satisfaction Score Calculation ─────────────────────────

describe('Property 5: Guest Satisfaction Score Calculation', () => {
  /**
   * **Validates: Requirements 4.8**
   * Property 1: For any non-empty set of ratings in [1,5], the result
   * is always in [1.0, 5.0].
   */
  it('property: score is always in [1.0, 5.0] for valid ratings', () => {
    fc.assert(
      fc.property(ratingsArrayArb, (ratings) => {
        const score = calculateSatisfactionScore(ratings);
        expect(score).not.toBeNull();
        expect(score!).toBeGreaterThanOrEqual(1.0);
        expect(score!).toBeLessThanOrEqual(5.0);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * **Validates: Requirements 4.8**
   * Property 2: The result equals the arithmetic mean rounded to 1 decimal place.
   */
  it('property: score equals arithmetic mean rounded to 1 decimal place', () => {
    fc.assert(
      fc.property(ratingsArrayArb, (ratings) => {
        const score = calculateSatisfactionScore(ratings);
        const sum = ratings.reduce((acc, r) => acc + r, 0);
        const expectedMean = round1(sum / ratings.length);
        expect(score).toBe(expectedMean);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * **Validates: Requirements 4.8**
   * Property 3: For a single rating R, the score equals R (to 1 decimal).
   */
  it('property: single rating produces score equal to that rating', () => {
    fc.assert(
      fc.property(integerRatingArb, (rating) => {
        const score = calculateSatisfactionScore([rating]);
        expect(score).toBe(round1(rating));
      }),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 4.8**
   * Property 4: Empty ratings always returns null.
   */
  it('property: empty ratings returns null', () => {
    const score = calculateSatisfactionScore([]);
    expect(score).toBeNull();
  });

  /**
   * **Validates: Requirements 9.4**
   * Property 5: All ratings equal to the same value V produces score V.0.
   */
  it('property: uniform ratings produce score equal to that value', () => {
    fc.assert(
      fc.property(
        integerRatingArb,
        fc.integer({ min: 1, max: 100 }),
        (value, count) => {
          const ratings = Array.from({ length: count }, () => value);
          const score = calculateSatisfactionScore(ratings);
          expect(score).toBe(round1(value));
        }
      ),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 4.8**
   * Property: Score bounds hold for continuous ratings in [1.0, 5.0].
   */
  it('property: score bounds hold for continuous ratings', () => {
    fc.assert(
      fc.property(continuousRatingsArrayArb, (ratings) => {
        const score = calculateSatisfactionScore(ratings);
        expect(score).not.toBeNull();
        expect(score!).toBeGreaterThanOrEqual(1.0);
        expect(score!).toBeLessThanOrEqual(5.0);
      }),
      { numRuns: 1000 }
    );
  });
});
