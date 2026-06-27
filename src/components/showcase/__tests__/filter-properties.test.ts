/**
 * Property-based tests for showcase villa filter matching.
 *
 * Verifies that the applyFilters function correctly matches villas
 * based on location, capacity, price range, and amenities using
 * property-based testing with fast-check.
 *
 * **Validates: Requirements 9.3**
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { applyFilters } from '../VillaGrid';
import type { ShowcaseVilla, ShowcaseFilters } from '../types';
import { EMPTY_FILTERS } from '../types';

// --- Generators ---

// Use a small finite set of locations and amenities to get meaningful filter matches
const LOCATIONS = ['Ubud', 'Seminyak', 'Canggu', 'Uluwatu', 'Nusa Dua', 'Sanur'];
const AMENITIES = ['Pool', 'WiFi', 'Spa', 'Gym', 'Beach Access', 'Garden', 'Kitchen', 'AC'];

const locationArb = fc.constantFrom(...LOCATIONS);
const amenityArb = fc.constantFrom(...AMENITIES);
const amenitiesArb = fc.uniqueArray(amenityArb, { minLength: 0, maxLength: 5 });

const showcaseVillaArb: fc.Arbitrary<ShowcaseVilla> = fc.record({
  id: fc.uuid(),
  slug: fc.string({ minLength: 1, maxLength: 30 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
  photo: fc.constant('https://example.com/photo.jpg'),
  location: locationArb,
  guestCapacity: fc.integer({ min: 1, max: 50 }),
  pricePerNight: fc.integer({ min: 50, max: 5000 }),
  amenities: amenitiesArb,
  reviewScore: fc.oneof(fc.constant(null), fc.double({ min: 1.0, max: 5.0, noNaN: true })),
  reviewCount: fc.integer({ min: 0, max: 1000 }),
});

const villasArb = fc.array(showcaseVillaArb, { minLength: 0, maxLength: 20 });

const filtersArb: fc.Arbitrary<ShowcaseFilters> = fc.record({
  location: fc.oneof(fc.constant(''), locationArb),
  minCapacity: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 50 })),
  minPrice: fc.oneof(fc.constant(null), fc.integer({ min: 50, max: 5000 })),
  maxPrice: fc.oneof(fc.constant(null), fc.integer({ min: 50, max: 5000 })),
  amenities: amenitiesArb,
});

describe('Showcase Filter Properties', () => {
  /**
   * Property 1: Empty filters always return all villas.
   *
   * When filters match EMPTY_FILTERS (no location, null capacity,
   * null prices, empty amenities), every villa in the input is returned.
   *
   * **Validates: Requirements 9.3**
   */
  it('empty filters always return all villas', () => {
    fc.assert(
      fc.property(villasArb, (villas) => {
        const result = applyFilters(villas, EMPTY_FILTERS);
        expect(result).toHaveLength(villas.length);
        expect(result).toEqual(villas);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Property 2: Location filter — only villas matching the location are returned.
   *
   * Every villa in the result has the exact location specified in the filter,
   * and every villa in the input with that location appears in the result.
   *
   * **Validates: Requirements 9.3**
   */
  it('location filter returns only villas matching the location', () => {
    fc.assert(
      fc.property(villasArb, locationArb, (villas, location) => {
        const filters: ShowcaseFilters = { ...EMPTY_FILTERS, location };
        const result = applyFilters(villas, filters);

        // All results match the location
        for (const villa of result) {
          expect(villa.location).toBe(location);
        }

        // All villas with matching location are included
        const expected = villas.filter((v) => v.location === location);
        expect(result).toHaveLength(expected.length);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Property 3: Capacity filter — only villas with capacity >= minCapacity are returned.
   *
   * Every villa in the result has guestCapacity at least as large as the filter value,
   * and all villas meeting the threshold are present.
   *
   * **Validates: Requirements 9.3**
   */
  it('capacity filter returns only villas with capacity >= minCapacity', () => {
    fc.assert(
      fc.property(villasArb, fc.integer({ min: 1, max: 50 }), (villas, minCapacity) => {
        const filters: ShowcaseFilters = { ...EMPTY_FILTERS, minCapacity };
        const result = applyFilters(villas, filters);

        // All results have sufficient capacity
        for (const villa of result) {
          expect(villa.guestCapacity).toBeGreaterThanOrEqual(minCapacity);
        }

        // All villas with sufficient capacity are included
        const expected = villas.filter((v) => v.guestCapacity >= minCapacity);
        expect(result).toHaveLength(expected.length);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Property 4: Price filter — only villas within price range are returned.
   *
   * Every villa in the result has pricePerNight within [minPrice, maxPrice].
   * Null bounds are treated as unbounded.
   *
   * **Validates: Requirements 9.3**
   */
  it('price filter returns only villas within the price range', () => {
    fc.assert(
      fc.property(
        villasArb,
        fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 10000 })),
        fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 10000 })),
        (villas, minPrice, maxPrice) => {
          const filters: ShowcaseFilters = { ...EMPTY_FILTERS, minPrice, maxPrice };
          const result = applyFilters(villas, filters);

          // All results are within price range
          for (const villa of result) {
            if (minPrice !== null) {
              expect(villa.pricePerNight).toBeGreaterThanOrEqual(minPrice);
            }
            if (maxPrice !== null) {
              expect(villa.pricePerNight).toBeLessThanOrEqual(maxPrice);
            }
          }

          // All villas meeting the price criteria are included
          const expected = villas.filter((v) => {
            if (minPrice !== null && v.pricePerNight < minPrice) return false;
            if (maxPrice !== null && v.pricePerNight > maxPrice) return false;
            return true;
          });
          expect(result).toHaveLength(expected.length);
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 5: Amenities filter — only villas having ALL selected amenities are returned.
   *
   * Every villa in the result contains every amenity in the filter.
   * Villas missing any required amenity are excluded.
   *
   * **Validates: Requirements 9.3**
   */
  it('amenities filter returns only villas having all selected amenities', () => {
    fc.assert(
      fc.property(villasArb, amenitiesArb, (villas, amenities) => {
        const filters: ShowcaseFilters = { ...EMPTY_FILTERS, amenities };
        const result = applyFilters(villas, filters);

        // All results have every required amenity
        for (const villa of result) {
          const villaAmenitySet = new Set(villa.amenities);
          for (const amenity of amenities) {
            expect(villaAmenitySet.has(amenity)).toBe(true);
          }
        }

        // All villas with all required amenities are included
        const expected = villas.filter((v) => {
          const set = new Set(v.amenities);
          return amenities.every((a) => set.has(a));
        });
        expect(result).toHaveLength(expected.length);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Property 6: Multiple filters combine with AND logic.
   *
   * Applying all filters simultaneously produces the same result as
   * intersecting the results of each individual filter applied separately.
   *
   * **Validates: Requirements 9.3**
   */
  it('multiple filters combine with AND logic', () => {
    fc.assert(
      fc.property(villasArb, filtersArb, (villas, filters) => {
        const combinedResult = applyFilters(villas, filters);

        // Apply each filter individually
        const byLocation = filters.location
          ? applyFilters(villas, { ...EMPTY_FILTERS, location: filters.location })
          : villas;
        const byCapacity = filters.minCapacity !== null
          ? applyFilters(villas, { ...EMPTY_FILTERS, minCapacity: filters.minCapacity })
          : villas;
        const byMinPrice = filters.minPrice !== null
          ? applyFilters(villas, { ...EMPTY_FILTERS, minPrice: filters.minPrice })
          : villas;
        const byMaxPrice = filters.maxPrice !== null
          ? applyFilters(villas, { ...EMPTY_FILTERS, maxPrice: filters.maxPrice })
          : villas;
        const byAmenities = filters.amenities.length > 0
          ? applyFilters(villas, { ...EMPTY_FILTERS, amenities: filters.amenities })
          : villas;

        // Intersection of all individual filter results
        const intersection = villas.filter(
          (v) =>
            byLocation.includes(v) &&
            byCapacity.includes(v) &&
            byMinPrice.includes(v) &&
            byMaxPrice.includes(v) &&
            byAmenities.includes(v)
        );

        expect(combinedResult).toHaveLength(intersection.length);
        for (const villa of combinedResult) {
          expect(intersection).toContain(villa);
        }
      }),
      { numRuns: 200 }
    );
  });
});
