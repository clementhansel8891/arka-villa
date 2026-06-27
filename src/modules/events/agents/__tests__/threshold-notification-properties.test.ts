/**
 * Property-based tests for threshold-based notification triggering.
 *
 * **Validates: Requirements 4.4, 7.4**
 *
 * Uses fast-check to verify invariants of the threshold notification logic:
 * - When E > T (T > 0): notification is triggered
 * - When E <= T (T > 0): no notification is triggered
 * - When T = 0: any E > 0 triggers notification
 * - The comparison is strictly greater-than (E > T, not E >= T)
 * - Negative expenses never trigger notifications regardless of threshold
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldTriggerNotification } from '../threshold-notification';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** Generates a positive threshold (T > 0) */
const positiveThresholdArb = fc.double({
  min: 0.01,
  max: 1_000_000,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Generates a positive expense amount (E > 0) */
const positiveAmountArb = fc.double({
  min: 0.01,
  max: 10_000_000,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Generates a negative expense amount (E < 0) */
const negativeAmountArb = fc.double({
  min: -10_000_000,
  max: -0.01,
  noNaN: true,
  noDefaultInfinity: true,
});

/** Generates a non-negative threshold (T >= 0) */
const nonNegativeThresholdArb = fc.double({
  min: 0,
  max: 1_000_000,
  noNaN: true,
  noDefaultInfinity: true,
});

// ─── Property 4: Threshold-Based Notification Triggering ──────────────────────

describe('Property 4: Threshold-Based Notification Triggering', () => {
  /**
   * **Validates: Requirements 4.4, 7.4**
   *
   * Property 1: For any E > T where T > 0, notification is triggered (true).
   */
  it('property: amount exceeding positive threshold triggers notification', () => {
    fc.assert(
      fc.property(positiveThresholdArb, (threshold) => {
        // Generate an amount strictly greater than threshold
        const amount = threshold + fc.sample(
          fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          1,
        )[0];

        const result = shouldTriggerNotification(amount, threshold);
        expect(result).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  /**
   * **Validates: Requirements 4.4, 7.4**
   *
   * Property 1 (alternative): Generate E and T independently where E > T > 0.
   */
  it('property: any E > T > 0 always triggers notification', () => {
    fc.assert(
      fc.property(
        positiveThresholdArb,
        positiveAmountArb,
        (threshold, extraAmount) => {
          // Ensure E > T by adding extra to threshold
          const amount = threshold + extraAmount;
          const result = shouldTriggerNotification(amount, threshold);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });

  /**
   * **Validates: Requirements 4.4, 7.4**
   *
   * Property 2: For any E <= T where T > 0, no notification is triggered (false).
   */
  it('property: amount at or below positive threshold does not trigger notification', () => {
    fc.assert(
      fc.property(
        positiveThresholdArb,
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (threshold, fraction) => {
          // Generate amount in [0, threshold] by multiplying threshold by fraction [0,1]
          const amount = threshold * fraction;
          const result = shouldTriggerNotification(amount, threshold);
          expect(result).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  /**
   * **Validates: Requirements 4.4, 7.4**
   *
   * Property 3: When T = 0, any E > 0 triggers notification.
   */
  it('property: zero threshold triggers notification for any positive amount', () => {
    fc.assert(
      fc.property(positiveAmountArb, (amount) => {
        const result = shouldTriggerNotification(amount, 0);
        expect(result).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  /**
   * **Validates: Requirements 4.4, 7.4**
   *
   * Property 4: The threshold comparison is strictly greater-than (E > T, not E >= T).
   * When E equals T exactly, no notification should be triggered.
   */
  it('property: exact threshold amount does NOT trigger notification (strictly greater-than)', () => {
    fc.assert(
      fc.property(positiveThresholdArb, (threshold) => {
        // Amount equals threshold exactly
        const result = shouldTriggerNotification(threshold, threshold);
        expect(result).toBe(false);
      }),
      { numRuns: 500 },
    );
  });

  /**
   * **Validates: Requirements 4.4, 7.4**
   *
   * Property 5: Negative expenses never trigger notifications regardless of threshold.
   */
  it('property: negative amounts never trigger notifications', () => {
    fc.assert(
      fc.property(negativeAmountArb, nonNegativeThresholdArb, (amount, threshold) => {
        const result = shouldTriggerNotification(amount, threshold);
        expect(result).toBe(false);
      }),
      { numRuns: 500 },
    );
  });

  /**
   * **Validates: Requirements 4.4, 7.4**
   *
   * Property 5 (extended): Zero amount never triggers notifications.
   */
  it('property: zero amount never triggers notification', () => {
    fc.assert(
      fc.property(nonNegativeThresholdArb, (threshold) => {
        const result = shouldTriggerNotification(0, threshold);
        expect(result).toBe(false);
      }),
      { numRuns: 200 },
    );
  });
});
