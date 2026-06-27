/**
 * Unit tests for the Agency Showcase filter logic.
 *
 * Tests the applyFilters function which powers the villa grid filtering.
 * Requirements: 9.3, 9.7
 */
import { describe, it, expect } from 'vitest';
import { applyFilters } from '../VillaGrid';
import type { ShowcaseVilla, ShowcaseFilters } from '../types';
import { EMPTY_FILTERS } from '../types';

function createVilla(overrides: Partial<ShowcaseVilla> = {}): ShowcaseVilla {
  return {
    id: '1',
    slug: 'test-villa',
    name: 'Test Villa',
    description: 'A beautiful test villa',
    photo: 'https://example.com/photo.jpg',
    location: 'Ubud',
    guestCapacity: 4,
    pricePerNight: 500,
    amenities: ['Pool', 'WiFi'],
    reviewScore: 4.5,
    reviewCount: 10,
    ...overrides,
  };
}

const sampleVillas: ShowcaseVilla[] = [
  createVilla({ id: '1', slug: 'villa-ubud', name: 'Villa Ubud', location: 'Ubud', guestCapacity: 4, pricePerNight: 300, amenities: ['Pool', 'WiFi', 'Spa'] }),
  createVilla({ id: '2', slug: 'villa-seminyak', name: 'Villa Seminyak', location: 'Seminyak', guestCapacity: 8, pricePerNight: 800, amenities: ['Pool', 'Beach Access', 'WiFi'] }),
  createVilla({ id: '3', slug: 'villa-canggu', name: 'Villa Canggu', location: 'Canggu', guestCapacity: 6, pricePerNight: 500, amenities: ['Pool', 'Surf', 'WiFi', 'Gym'] }),
  createVilla({ id: '4', slug: 'villa-uluwatu', name: 'Villa Uluwatu', location: 'Uluwatu', guestCapacity: 2, pricePerNight: 200, amenities: ['WiFi', 'Cliff View'] }),
];

describe('applyFilters', () => {
  it('returns all villas when no filters are applied', () => {
    const result = applyFilters(sampleVillas, EMPTY_FILTERS);
    expect(result).toHaveLength(4);
  });

  it('filters by location', () => {
    const filters: ShowcaseFilters = { ...EMPTY_FILTERS, location: 'Ubud' };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('villa-ubud');
  });

  it('filters by minimum guest capacity', () => {
    const filters: ShowcaseFilters = { ...EMPTY_FILTERS, minCapacity: 6 };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.slug)).toEqual(['villa-seminyak', 'villa-canggu']);
  });

  it('filters by minimum price', () => {
    const filters: ShowcaseFilters = { ...EMPTY_FILTERS, minPrice: 400 };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.slug)).toEqual(['villa-seminyak', 'villa-canggu']);
  });

  it('filters by maximum price', () => {
    const filters: ShowcaseFilters = { ...EMPTY_FILTERS, maxPrice: 300 };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.slug)).toEqual(['villa-ubud', 'villa-uluwatu']);
  });

  it('filters by price range (min and max)', () => {
    const filters: ShowcaseFilters = { ...EMPTY_FILTERS, minPrice: 300, maxPrice: 600 };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.slug)).toEqual(['villa-ubud', 'villa-canggu']);
  });

  it('filters by single amenity', () => {
    const filters: ShowcaseFilters = { ...EMPTY_FILTERS, amenities: ['Spa'] };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('villa-ubud');
  });

  it('filters by multiple amenities (AND logic)', () => {
    const filters: ShowcaseFilters = { ...EMPTY_FILTERS, amenities: ['Pool', 'WiFi'] };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(3);
    // Villa Uluwatu does not have Pool
    expect(result.map((v) => v.slug)).toEqual(['villa-ubud', 'villa-seminyak', 'villa-canggu']);
  });

  it('combines multiple filters (AND logic across categories)', () => {
    const filters: ShowcaseFilters = {
      location: 'Canggu',
      minCapacity: 4,
      minPrice: 400,
      maxPrice: 600,
      amenities: ['Pool'],
    };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('villa-canggu');
  });

  it('returns empty array when no villas match', () => {
    const filters: ShowcaseFilters = { ...EMPTY_FILTERS, location: 'NonExistent' };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty villa list', () => {
    const result = applyFilters([], EMPTY_FILTERS);
    expect(result).toHaveLength(0);
  });

  it('handles null minCapacity as no filter', () => {
    const filters: ShowcaseFilters = { ...EMPTY_FILTERS, minCapacity: null };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(4);
  });

  it('handles empty amenities array as no filter', () => {
    const filters: ShowcaseFilters = { ...EMPTY_FILTERS, amenities: [] };
    const result = applyFilters(sampleVillas, filters);
    expect(result).toHaveLength(4);
  });
});
