/**
 * Rate plan evaluation engine.
 *
 * Selects the best rate plan for a booking based on priority:
 * promotional > seasonal > base
 *
 * Validates minimum stay requirements and applies discount percentages.
 *
 * Requirements: 5.6
 */

import type { RatePlan, PricingBreakdown } from './types';

/** Rate plan type priority: higher number = higher priority. */
const RATE_PLAN_PRIORITY: Record<string, number> = {
  base: 1,
  seasonal: 2,
  promotional: 3,
};

/**
 * Calculate the number of nights between check-in and check-out dates.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine whether a rate plan is applicable for the given date range.
 *
 * A rate plan applies if:
 * - It is active
 * - It matches the room type
 * - The stay's date range overlaps with the rate plan's validity period
 *   (or the rate plan has no date bounds, as with base rates)
 * - The number of nights meets the minimum stay requirement
 */
export function isRatePlanApplicable(
  plan: RatePlan,
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
  nights: number
): boolean {
  if (!plan.isActive) return false;
  if (plan.roomTypeId !== roomTypeId) return false;
  if (nights < plan.minStay) return false;

  // Base rate plans have no date range requirements
  if (plan.type === 'base') return true;

  // Seasonal and promotional plans must overlap with the booking dates
  if (!plan.startDate || !plan.endDate) return true;

  const planStart = new Date(plan.startDate);
  const planEnd = new Date(plan.endDate);
  const bookingStart = new Date(checkIn);
  const bookingEnd = new Date(checkOut);

  // Check for date range overlap
  return bookingStart < planEnd && bookingEnd > planStart;
}

/**
 * Select the best applicable rate plan from a list.
 *
 * Priority: promotional > seasonal > base.
 * Within the same priority, pick the one with the lowest effective rate.
 */
export function selectBestRatePlan(
  plans: RatePlan[],
  roomTypeId: string,
  checkIn: string,
  checkOut: string
): RatePlan | null {
  const nights = calculateNights(checkIn, checkOut);

  const applicable = plans.filter((plan) =>
    isRatePlanApplicable(plan, roomTypeId, checkIn, checkOut, nights)
  );

  if (applicable.length === 0) return null;

  // Sort by priority descending, then by effective rate ascending
  applicable.sort((a, b) => {
    const priorityDiff =
      (RATE_PLAN_PRIORITY[b.type] ?? 0) - (RATE_PLAN_PRIORITY[a.type] ?? 0);
    if (priorityDiff !== 0) return priorityDiff;

    // Same priority — prefer lower effective rate
    const effectiveA = a.rate * (1 - a.discountPercent / 100);
    const effectiveB = b.rate * (1 - b.discountPercent / 100);
    return effectiveA - effectiveB;
  });

  return applicable[0];
}

/**
 * Calculate full pricing breakdown for a booking.
 *
 * Applies the best rate plan, calculates per-night rate,
 * total, and discount.
 *
 * @returns PricingBreakdown or null if no applicable rate plan exists
 */
export function calculatePricing(
  ratePlans: RatePlan[],
  roomTypeId: string,
  checkIn: string,
  checkOut: string
): PricingBreakdown | null {
  const nights = calculateNights(checkIn, checkOut);
  if (nights <= 0) return null;

  const bestPlan = selectBestRatePlan(ratePlans, roomTypeId, checkIn, checkOut);
  if (!bestPlan) return null;

  const nightlyRate = bestPlan.rate;
  const baseTotal = nightlyRate * nights;
  const discountPercent = bestPlan.discountPercent;
  const discountAmount = baseTotal * (discountPercent / 100);
  const totalAmount = baseTotal - discountAmount;

  return {
    nights,
    nightlyRate,
    baseTotal,
    discountPercent,
    discountAmount,
    totalAmount: Math.round(totalAmount * 100) / 100,
    currency: bestPlan.currency,
    appliedRatePlan: {
      id: bestPlan.id,
      name: bestPlan.name,
      type: bestPlan.type,
    },
  };
}
