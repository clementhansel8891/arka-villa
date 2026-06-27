/**
 * Types for the Agency Showcase page.
 *
 * These types represent the public-facing villa data displayed
 * in the showcase portfolio without exposing internal details.
 *
 * Requirements: 9.1, 9.3, 9.4, 9.6
 */

export interface ShowcaseVilla {
  id: string;
  slug: string;
  name: string;
  description: string; // max 200 chars
  photo: string; // URL of at least 1 photo
  location: string;
  guestCapacity: number;
  pricePerNight: number; // minimum nightly rate
  amenities: string[];
  reviewScore: number | null; // 1.0–5.0 average, null if no reviews
  reviewCount: number;
}

export interface ShowcaseFilters {
  location: string;
  minCapacity: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  amenities: string[];
}

export const EMPTY_FILTERS: ShowcaseFilters = {
  location: '',
  minCapacity: null,
  minPrice: null,
  maxPrice: null,
  amenities: [],
};
