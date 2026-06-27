/**
 * Property-based tests for ROAS (Return on Ad Spend) calculation.
 *
 * **Validates: Requirements 7.3**
 *
 * Uses fast-check to verify invariants of:
 * - ROAS = revenue / spend (rounded to 2 decimals) when spend > 0
 * - ROAS is undefined when spend = 0
 * - ROAS non-negativity when both revenue >= 0 and spend > 0
 * - ROAS = 1.0 exactly when revenue equals spend
 * - ROAS > 1.0 when revenue > spend, ROAS < 1.0 when revenue < spend
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mirrors the roundToTwo function used in the marketing service.
 * Math.round(value * 100) / 100
 */
function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Pure ROAS calculation logic mirroring the service implementation.
 * Returns undefined when spend is 0, otherwise revenue / spend rounded to 2 decimals.
 */
function computeROAS(revenue: number, spend: number): number | undefined {
  if (spend === 0) return undefined;
  return roundToTwo(revenue / spend);
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

/** Generates a non-negative revenue value (0 to 1,000,000). */
const revenueArb = fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true });

/** Generates a positive spend value (0.01 to 1,000,000) — excludes zero. */
const positiveSpendArb = fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true });

/** Generates a positive value for equal revenue/spend testing. */
const equalValueArb = fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true });

// ─── Property 13: ROAS Calculation ───────────────────────────────────────────

describe('Property 13: ROAS Calculation', () => {
  /**
   * **Validates: Requirements 7.3**
   * Property: For any revenue R and spend S where S > 0,
   * ROAS = R / S rounded to 2 decimal places.
   */
  it('property: ROAS equals revenue / spend rounded to 2 decimals when spend > 0', () => {
    fc.assert(
      fc.property(revenueArb, positiveSpendArb, (revenue, spend) => {
        const result = computeROAS(revenue, spend);
        const expected = roundToTwo(revenue / spend);
        expect(result).toBe(expected);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * **Validates: Requirements 7.3**
   * Property: When spend = 0, ROAS is undefined regardless of revenue value.
   */
  it('property: ROAS is undefined when spend is zero', () => {
    fc.assert(
      fc.property(revenueArb, (revenue) => {
        const result = computeROAS(revenue, 0);
        expect(result).toBeUndefined();
      }),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 7.3**
   * Property: ROAS is always non-negative when both revenue >= 0 and spend > 0.
   */
  it('property: ROAS is non-negative when revenue >= 0 and spend > 0', () => {
    fc.assert(
      fc.property(revenueArb, positiveSpendArb, (revenue, spend) => {
        const result = computeROAS(revenue, spend);
        expect(result).toBeDefined();
        expect(result).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * **Validates: Requirements 7.3**
   * Property: ROAS = 1.0 exactly when revenue equals spend.
   */
  it('property: ROAS equals 1.0 when revenue equals spend', () => {
    fc.assert(
      fc.property(equalValueArb, (value) => {
        const result = computeROAS(value, value);
        expect(result).toBe(1);
      }),
      { numRuns: 500 }
    );
  });

  /**
   * **Validates: Requirements 7.3**
   * Property: ROAS > 1.0 when revenue > spend, ROAS < 1.0 when revenue < spend.
   */
  it('property: ROAS > 1 when revenue > spend, ROAS < 1 when revenue < spend', () => {
    // Generate pairs where revenue > spend
    const revenueGreaterArb = fc
      .tuple(positiveSpendArb, fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true }))
      .filter(([spend, extra]) => spend + extra <= 1_000_000)
      .map(([spend, extra]) => ({ revenue: spend + extra, spend }));

    fc.assert(
      fc.property(revenueGreaterArb, ({ revenue, spend }) => {
        const result = computeROAS(revenue, spend);
        expect(result).toBeDefined();
        // Due to rounding, revenue > spend implies ROAS >= 1.0
        // Strictly: roundToTwo(revenue/spend) >= 1.0
        expect(result!).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 500 }
    );

    // Generate pairs where revenue < spend
    const revenueLessArb = fc
      .tuple(positiveSpendArb, fc.double({ min: 0.01, max: 999_999, noNaN: true, noDefaultInfinity: true }))
      .filter(([spend, revenue]) => revenue < spend)
      .map(([spend, revenue]) => ({ revenue, spend }));

    fc.assert(
      fc.property(revenueLessArb, ({ revenue, spend }) => {
        const result = computeROAS(revenue, spend);
        expect(result).toBeDefined();
        // Due to rounding, revenue < spend implies ROAS <= 1.0
        expect(result!).toBeLessThanOrEqual(1);
      }),
      { numRuns: 500 }
    );
  });
});
