/**
 * Date range validation for Agency Dashboard filters.
 *
 * A date range filter is invalid when:
 * 1. End date is before start date (end < start)
 * 2. The range exceeds 12 months
 *
 * Requirement 3.5: IF an Agency_Admin submits a date range filter where the end
 * date precedes the start date or the range exceeds 12 months, THEN THE
 * Agency_Dashboard SHALL reject the filter and display an error message.
 */

export interface DateRangeValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Maximum allowed date range in months.
 */
const MAX_RANGE_MONTHS = 12;

/**
 * Validates a date range filter for the Agency Dashboard.
 *
 * @param startDate - ISO date string (YYYY-MM-DD)
 * @param endDate - ISO date string (YYYY-MM-DD)
 * @returns Validation result with error message if invalid
 */
export function validateDateRange(
  startDate: string,
  endDate: string
): DateRangeValidationResult {
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  // Check for invalid date strings
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  // Rule 1: End date must not precede start date
  if (end < start) {
    return {
      valid: false,
      error: 'End date must not precede start date',
    };
  }

  // Rule 2: Range must not exceed 12 months
  // "12 months" means: adding 12 calendar months to the start date gives
  // the maximum allowed end date (inclusive).
  const maxEnd = new Date(start);
  maxEnd.setUTCMonth(maxEnd.getUTCMonth() + MAX_RANGE_MONTHS);

  if (end > maxEnd) {
    return {
      valid: false,
      error: 'Date range must not exceed 12 months',
    };
  }

  return { valid: true };
}
