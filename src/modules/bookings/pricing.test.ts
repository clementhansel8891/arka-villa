/**
 * Unit tests for the pricing engine.
 *
 * Tests rate plan selection priority (promotional > seasonal > base),
 * minimum stay validation, discount application, and nights calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateNights,
  isRatePlanApplicable,
  selectBestRatePlan,
  calculatePricing,
} from './pricing';
import type { RatePlan } from './types';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const ROOM_TYPE_ID = 'rt-001';

const basePlan: RatePlan = {
  id: 'rp-base',
  roomTypeId: ROOM_TYPE_ID,
  name: 'Standard Rate',
  type: 'base',
  rate: 200,
  currency: 'USD',
  minStay: 1,
  discountPercent: 0,
  startDate: null,
  endDate: null,
  isActive: true,
};

const seasonalPlan: RatePlan = {
  id: 'rp-seasonal',
  roomTypeId: ROOM_TYPE_ID,
  name: 'High Season',
  type: 'seasonal',
  rate: 300,
  currency: 'USD',
  minStay: 2,
  discountPercent: 0,
  startDate: '2025-06-01',
  endDate: '2025-09-30',
  isActive: true,
};

const promotionalPlan: RatePlan = {
  id: 'rp-promo',
  roomTypeId: ROOM_TYPE_ID,
  name: 'Summer Special',
  type: 'promotional',
  rate: 250,
  currency: 'USD',
  minStay: 3,
  discountPercent: 20,
  startDate: '2025-07-01',
  endDate: '2025-08-31',
  isActive: true,
};

const inactivePlan: RatePlan = {
  id: 'rp-inactive',
  roomTypeId: ROOM_TYPE_ID,
  name: 'Expired Promo',
  type: 'promotional',
  rate: 100,
  currency: 'USD',
  minStay: 1,
  discountPercent: 50,
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  isActive: false,
};

// ─── calculateNights ──────────────────────────────────────────────────────────

describe('calculateNights', () => {
  it('calculates single night stay', () => {
    expect(calculateNights('2025-01-01', '2025-01-02')).toBe(1);
  });

  it('calculates multi-night stay', () => {
    expect(calculateNights('2025-01-01', '2025-01-05')).toBe(4);
  });

  it('calculates month-spanning stay', () => {
    expect(calculateNights('2025-01-30', '2025-02-03')).toBe(4);
  });

  it('returns 0 for same-day check-in/check-out', () => {
    expect(calculateNights('2025-01-01', '2025-01-01')).toBe(0);
  });
});

// ─── isRatePlanApplicable ─────────────────────────────────────────────────────

describe('isRatePlanApplicable', () => {
  it('base plan is always applicable if active and min stay met', () => {
    expect(
      isRatePlanApplicable(basePlan, ROOM_TYPE_ID, '2025-03-01', '2025-03-03', 2)
    ).toBe(true);
  });

  it('rejects inactive plans', () => {
    expect(
      isRatePlanApplicable(inactivePlan, ROOM_TYPE_ID, '2024-06-01', '2024-06-05', 4)
    ).toBe(false);
  });

  it('rejects plans for wrong room type', () => {
    expect(
      isRatePlanApplicable(basePlan, 'wrong-room-type', '2025-01-01', '2025-01-03', 2)
    ).toBe(false);
  });

  it('rejects plans when nights < minStay', () => {
    expect(
      isRatePlanApplicable(seasonalPlan, ROOM_TYPE_ID, '2025-07-01', '2025-07-02', 1)
    ).toBe(false);
  });

  it('seasonal plan applies when dates overlap', () => {
    expect(
      isRatePlanApplicable(seasonalPlan, ROOM_TYPE_ID, '2025-06-15', '2025-06-20', 5)
    ).toBe(true);
  });

  it('seasonal plan rejected when dates do not overlap', () => {
    expect(
      isRatePlanApplicable(seasonalPlan, ROOM_TYPE_ID, '2025-01-01', '2025-01-05', 4)
    ).toBe(false);
  });

  it('promotional plan applies when dates overlap and min stay met', () => {
    expect(
      isRatePlanApplicable(promotionalPlan, ROOM_TYPE_ID, '2025-07-10', '2025-07-15', 5)
    ).toBe(true);
  });
});

// ─── selectBestRatePlan ───────────────────────────────────────────────────────

describe('selectBestRatePlan', () => {
  const allPlans = [basePlan, seasonalPlan, promotionalPlan, inactivePlan];

  it('selects promotional over seasonal and base when applicable', () => {
    const result = selectBestRatePlan(
      allPlans,
      ROOM_TYPE_ID,
      '2025-07-10',
      '2025-07-15'
    );
    expect(result?.id).toBe('rp-promo');
  });

  it('selects seasonal when promotional is not applicable (min stay)', () => {
    const result = selectBestRatePlan(
      allPlans,
      ROOM_TYPE_ID,
      '2025-07-10',
      '2025-07-12' // 2 nights: meets seasonal min_stay but not promo's 3
    );
    expect(result?.id).toBe('rp-seasonal');
  });

  it('falls back to base when no seasonal/promotional dates match', () => {
    const result = selectBestRatePlan(
      allPlans,
      ROOM_TYPE_ID,
      '2025-01-10',
      '2025-01-12'
    );
    expect(result?.id).toBe('rp-base');
  });

  it('returns null when no plans are applicable', () => {
    const result = selectBestRatePlan(
      [inactivePlan],
      ROOM_TYPE_ID,
      '2025-01-10',
      '2025-01-12'
    );
    expect(result).toBeNull();
  });

  it('returns null for empty plans array', () => {
    const result = selectBestRatePlan(
      [],
      ROOM_TYPE_ID,
      '2025-01-10',
      '2025-01-12'
    );
    expect(result).toBeNull();
  });
});

// ─── calculatePricing ─────────────────────────────────────────────────────────

describe('calculatePricing', () => {
  const allPlans = [basePlan, seasonalPlan, promotionalPlan];

  it('calculates pricing with promotional plan and discount', () => {
    const result = calculatePricing(
      allPlans,
      ROOM_TYPE_ID,
      '2025-07-10',
      '2025-07-15' // 5 nights
    );

    expect(result).not.toBeNull();
    expect(result!.nights).toBe(5);
    expect(result!.nightlyRate).toBe(250);
    expect(result!.baseTotal).toBe(1250);
    expect(result!.discountPercent).toBe(20);
    expect(result!.discountAmount).toBe(250);
    expect(result!.totalAmount).toBe(1000);
    expect(result!.currency).toBe('USD');
    expect(result!.appliedRatePlan.type).toBe('promotional');
  });

  it('calculates pricing with base plan (no discount)', () => {
    const result = calculatePricing(
      allPlans,
      ROOM_TYPE_ID,
      '2025-01-10',
      '2025-01-13' // 3 nights
    );

    expect(result).not.toBeNull();
    expect(result!.nights).toBe(3);
    expect(result!.nightlyRate).toBe(200);
    expect(result!.baseTotal).toBe(600);
    expect(result!.discountPercent).toBe(0);
    expect(result!.discountAmount).toBe(0);
    expect(result!.totalAmount).toBe(600);
    expect(result!.appliedRatePlan.type).toBe('base');
  });

  it('returns null for zero or negative nights', () => {
    const result = calculatePricing(
      allPlans,
      ROOM_TYPE_ID,
      '2025-01-10',
      '2025-01-10'
    );
    expect(result).toBeNull();
  });

  it('returns null when no plans are applicable', () => {
    const result = calculatePricing(
      [],
      ROOM_TYPE_ID,
      '2025-01-10',
      '2025-01-13'
    );
    expect(result).toBeNull();
  });
});
