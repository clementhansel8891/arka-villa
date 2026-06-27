/**
 * Guest satisfaction score calculation.
 *
 * Computes the arithmetic mean of review ratings for a given month,
 * displayed on a 1.0-5.0 scale with one decimal place.
 */

/**
 * Calculates the guest satisfaction score from a set of ratings.
 *
 * @param ratings - Array of review ratings (each expected in [1, 5])
 * @returns The arithmetic mean rounded to 1 decimal place, or null if no ratings
 */
export function calculateSatisfactionScore(ratings: number[]): number | null {
  if (ratings.length === 0) {
    return null;
  }

  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  const mean = sum / ratings.length;

  return Math.round(mean * 10) / 10;
}
