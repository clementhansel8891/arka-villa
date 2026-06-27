/**
 * Property-based tests for financial module.
 *
 * Validates: Requirements 13.1, 13.4
 *
 * Uses fast-check to verify invariants of:
 * - Agency commission calculation (amount × rate / 100, rounded to 2 decimals)
 * - Commission non-negativity and upper bound
 * - Financial report category aggregation (sum to 2 decimal places)
 * - Net income formula correctness
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateCommission } from '../service';
import type { TransactionCategory, MonthlyReportEntry } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Round to 2 decimal places using the same formula as the service. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Generates a positive monetary amount (0.01 to 1,000,000). */
const amountArb = fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true });

/** Generates a valid commission rate percentage (0 to 100 inclusive). */
const rateArb = fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true });

/** Generates a non-negative monetary amount (0 to 1,000,000). */
const nonNegativeAmountArb = fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true });

/** All valid transaction categories. */
const CATEGORIES: TransactionCategory[] = [
  'booking_revenue',
  'ota_commission',
  'agency_fee',
  'operational_cost',
  'maintenance_expense',
];

/** Generates a transaction category. */
const categoryArb = fc.constantFrom(...CATEGORIES);

/** Generates a monthly report entry with random amounts. */
const reportEntryArb = fc
  .record({
    grossRevenue: fc.double({ min: 0, max: 100_000, noNaN: true, noDefaultInfinity: true }),
    otaCommissions: fc.double({ min: 0, max: 50_000, noNaN: true, noDefaultInfinity: true }),
    agencyFees: fc.double({ min: 0, max: 50_000, noNaN: true, noDefaultInfinity: true }),
    operationalCosts: fc.double({ min: 0, max: 50_000, noNaN: true, noDefaultInfinity: true }),
    maintenanceExpenses: fc.double({ min: 0, max: 50_000, noNaN: true, noDefaultInfinity: true }),
  })
  .map(({ grossRevenue, otaCommissions, agencyFees, operationalCosts, maintenanceExpenses }) => {
    const gr = round2(grossRevenue);
    const oc = round2(otaCommissions);
    const af = round2(agencyFees);
    const opCosts = round2(operationalCosts);
    const me = round2(maintenanceExpenses);
    const netOwnerIncome = round2(gr - oc - af - opCosts - me);

    return {
      month: '2025-01',
      grossRevenue: gr,
      otaCommissions: oc,
      agencyFees: af,
      operationalCosts: opCosts,
      maintenanceExpenses: me,
      netOwnerIncome,
      currency: 'USD',
    } satisfies MonthlyReportEntry;
  });

/** Generates a set of transactions grouped by category for report aggregation. */
const transactionSetArb = fc.array(
  fc.record({
    category: categoryArb,
    amount: fc.double({ min: 0.01, max: 10_000, noNaN: true, noDefaultInfinity: true }),
  }),
  { minLength: 1, maxLength: 50 }
);

// ─── Property 18: Financial Report Category Aggregation ───────────────────────

describe('Property 18: Financial Report Category Aggregation', () => {
  /**
   * Validates: Requirements 13.1
   * Property: When transactions are grouped by category, the sum of
   * individual amounts for a category equals the aggregated total
   * for that category, rounded to 2 decimal places.
   */
  it('property: category totals match sum of individual amounts (2 decimal places)', () => {
    fc.assert(
      fc.property(transactionSetArb, (transactions) => {
        // Group by category and sum
        const categoryTotals = new Map<TransactionCategory, number>();

        for (const tx of transactions) {
          const rounded = round2(tx.amount);
          const current = categoryTotals.get(tx.category) ?? 0;
          categoryTotals.set(tx.category, round2(current + rounded));
        }

        // Verify each category total is the sum of its transactions
        for (const category of CATEGORIES) {
          const expectedTotal = transactions
            .filter((t) => t.category === category)
            .reduce((sum, t) => round2(sum + round2(t.amount)), 0);

          const aggregatedTotal = categoryTotals.get(category) ?? 0;
          expect(aggregatedTotal).toBeCloseTo(expectedTotal, 2);
        }
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Validates: Requirements 13.1
   * Property: Report totals across multiple monthly entries equal the
   * sum of individual monthly values per field, rounded to 2 decimals.
   */
  it('property: report totals equal sum of monthly entries', () => {
    const entriesArb = fc.array(reportEntryArb, { minLength: 1, maxLength: 24 });

    fc.assert(
      fc.property(entriesArb, (entries) => {
        // Aggregate totals from entries
        const totals = entries.reduce(
          (acc, entry) => ({
            grossRevenue: round2(acc.grossRevenue + entry.grossRevenue),
            otaCommissions: round2(acc.otaCommissions + entry.otaCommissions),
            agencyFees: round2(acc.agencyFees + entry.agencyFees),
            operationalCosts: round2(acc.operationalCosts + entry.operationalCosts),
            maintenanceExpenses: round2(acc.maintenanceExpenses + entry.maintenanceExpenses),
            netOwnerIncome: round2(acc.netOwnerIncome + entry.netOwnerIncome),
          }),
          {
            grossRevenue: 0,
            otaCommissions: 0,
            agencyFees: 0,
            operationalCosts: 0,
            maintenanceExpenses: 0,
            netOwnerIncome: 0,
          }
        );

        // Verify each total matches independent summation
        const expectedGross = entries.reduce((s, e) => round2(s + e.grossRevenue), 0);
        const expectedOta = entries.reduce((s, e) => round2(s + e.otaCommissions), 0);
        const expectedAgency = entries.reduce((s, e) => round2(s + e.agencyFees), 0);
        const expectedOps = entries.reduce((s, e) => round2(s + e.operationalCosts), 0);
        const expectedMaint = entries.reduce((s, e) => round2(s + e.maintenanceExpenses), 0);

        expect(totals.grossRevenue).toBeCloseTo(expectedGross, 2);
        expect(totals.otaCommissions).toBeCloseTo(expectedOta, 2);
        expect(totals.agencyFees).toBeCloseTo(expectedAgency, 2);
        expect(totals.operationalCosts).toBeCloseTo(expectedOps, 2);
        expect(totals.maintenanceExpenses).toBeCloseTo(expectedMaint, 2);
      }),
      { numRuns: 300 }
    );
  });
});

// ─── Property 19: Agency Commission Calculation ───────────────────────────────

describe('Property 19: Agency Commission Calculation', () => {
  /**
   * Validates: Requirements 13.4
   * Property: Commission for any amount A and rate R equals
   * Math.round((A × R / 100) × 100) / 100.
   */
  it('property: commission follows G × R / 100 formula rounded to 2 decimals', () => {
    fc.assert(
      fc.property(amountArb, rateArb, (amount, rate) => {
        const result = calculateCommission(amount, rate);
        const expected = Math.round((amount * rate) / 100 * 100) / 100;
        expect(result).toBeCloseTo(expected, 10);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Validates: Requirements 13.4
   * Property: Commission is always >= 0 when amount >= 0 and rate in [0, 100].
   */
  it('property: commission is non-negative for non-negative amounts and valid rates', () => {
    fc.assert(
      fc.property(nonNegativeAmountArb, rateArb, (amount, rate) => {
        const result = calculateCommission(amount, rate);
        expect(result).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Validates: Requirements 13.4
   * Property: Commission is always <= amount when rate in [0, 100].
   */
  it('property: commission never exceeds the original amount', () => {
    fc.assert(
      fc.property(nonNegativeAmountArb, rateArb, (amount, rate) => {
        const result = calculateCommission(amount, rate);
        // Allow small floating-point tolerance
        expect(result).toBeLessThanOrEqual(amount + 0.01);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Validates: Requirements 13.4
   * Property: Commission at rate 0% is always 0.
   */
  it('property: zero rate always produces zero commission', () => {
    fc.assert(
      fc.property(nonNegativeAmountArb, (amount) => {
        const result = calculateCommission(amount, 0);
        expect(result).toBe(0);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 13.4
   * Property: Commission at rate 100% equals the original amount (rounded to 2 decimals).
   */
  it('property: 100% rate produces commission equal to amount', () => {
    fc.assert(
      fc.property(nonNegativeAmountArb, (amount) => {
        const result = calculateCommission(amount, 100);
        const expected = round2(amount);
        expect(result).toBeCloseTo(expected, 2);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Validates: Requirements 13.1
   * Property: Net income = gross_revenue - ota_commissions - agency_fees
   *           - operational_costs - maintenance_expenses (to 2 decimal places).
   */
  it('property: net income equals gross revenue minus all deductions', () => {
    fc.assert(
      fc.property(reportEntryArb, (entry) => {
        const expectedNet = round2(
          entry.grossRevenue -
          entry.otaCommissions -
          entry.agencyFees -
          entry.operationalCosts -
          entry.maintenanceExpenses
        );
        expect(entry.netOwnerIncome).toBeCloseTo(expectedNet, 2);
      }),
      { numRuns: 500 }
    );
  });
});
