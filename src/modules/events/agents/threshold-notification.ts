/**
 * Threshold-Based Notification Logic
 *
 * Pure function that determines whether a notification should be triggered
 * based on an expense/spend amount exceeding a configured threshold.
 *
 * Used by:
 * - Owner Portal: maintenance expense approval (Requirement 4.4)
 * - Marketing Dashboard: budget threshold alerts (Requirement 7.4)
 *
 * Rules:
 * - When threshold T > 0 and amount E > T: notification is triggered
 * - When threshold T > 0 and amount E <= T: no notification
 * - When threshold T = 0 (no threshold / catch-all): any E > 0 triggers notification
 * - Negative expenses never trigger notifications regardless of threshold
 * - The comparison is strictly greater-than (E > T, not E >= T)
 */

/**
 * Determines whether a threshold-based notification should be triggered.
 *
 * @param amount - The expense or spend amount to evaluate
 * @param threshold - The configured threshold value (must be >= 0)
 * @returns true if a notification should be triggered, false otherwise
 */
export function shouldTriggerNotification(amount: number, threshold: number): boolean {
  // Negative expenses never trigger notifications
  if (amount <= 0) {
    return false;
  }

  // When threshold is 0 (catch-all mode), any positive amount triggers
  if (threshold === 0) {
    return true;
  }

  // When threshold > 0, only amounts strictly exceeding it trigger
  if (threshold > 0) {
    return amount > threshold;
  }

  // Negative thresholds are invalid — do not trigger
  return false;
}
