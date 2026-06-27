'use client';

import { useState } from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import type { ShowcaseFilters } from './types';
import { EMPTY_FILTERS } from './types';

/**
 * Filter panel for the Agency Showcase.
 * Filters: location (dropdown), guest capacity (number),
 * price range (min/max), amenities (checkboxes).
 *
 * Requirements: 9.3, 9.7
 */
interface FilterPanelProps {
  filters: ShowcaseFilters;
  onFiltersChange: (filters: ShowcaseFilters) => void;
  locations: string[];
  allAmenities: string[];
}

export default function FilterPanel({
  filters,
  onFiltersChange,
  locations,
  allAmenities,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    filters.location !== '' ||
    filters.minCapacity !== null ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.amenities.length > 0;

  const handleReset = () => {
    onFiltersChange(EMPTY_FILTERS);
  };

  const handleLocationChange = (location: string) => {
    onFiltersChange({ ...filters, location });
  };

  const handleCapacityChange = (value: string) => {
    const num = value === '' ? null : parseInt(value, 10);
    onFiltersChange({ ...filters, minCapacity: num && !isNaN(num) ? num : null });
  };

  const handleMinPriceChange = (value: string) => {
    const num = value === '' ? null : parseInt(value, 10);
    onFiltersChange({ ...filters, minPrice: num && !isNaN(num) ? num : null });
  };

  const handleMaxPriceChange = (value: string) => {
    const num = value === '' ? null : parseInt(value, 10);
    onFiltersChange({ ...filters, maxPrice: num && !isNaN(num) ? num : null });
  };

  const handleAmenityToggle = (amenity: string) => {
    const current = filters.amenities;
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    onFiltersChange({ ...filters, amenities: updated });
  };

  return (
    <div className="bg-heritage-charcoal/50 border border-heritage-gold/10 rounded-lg p-4 md:p-6">
      {/* Toggle bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-3 md:hidden"
        aria-expanded={isExpanded}
        aria-controls="filter-panel-content"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-heritage-gold" />
          <span className="text-white text-sm font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="bg-heritage-gold text-heritage-charcoal text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <span className="text-white/40 text-xs">
          {isExpanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {/* Filter content - always visible on desktop, togglable on mobile */}
      <div
        id="filter-panel-content"
        className={`${isExpanded ? 'block' : 'hidden'} md:block mt-4 md:mt-0`}
      >
        <div className="hidden md:flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-heritage-gold" />
            <span className="text-white text-sm font-medium">Filter Villas</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-heritage-gold/70 hover:text-heritage-gold text-xs transition-colors"
              aria-label="Reset all filters"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location */}
          <div className="space-y-2">
            <label
              htmlFor="filter-location"
              className="text-white/60 text-xs uppercase tracking-wider"
            >
              Location
            </label>
            <select
              id="filter-location"
              value={filters.location}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full bg-heritage-charcoal border border-heritage-gold/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-heritage-gold/50 appearance-none"
            >
              <option value="">All locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Guest Capacity */}
          <div className="space-y-2">
            <label
              htmlFor="filter-capacity"
              className="text-white/60 text-xs uppercase tracking-wider"
            >
              Min. Guests
            </label>
            <input
              id="filter-capacity"
              type="number"
              min={1}
              placeholder="Any"
              value={filters.minCapacity ?? ''}
              onChange={(e) => handleCapacityChange(e.target.value)}
              className="w-full bg-heritage-charcoal border border-heritage-gold/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
            />
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="text-white/60 text-xs uppercase tracking-wider">
              Price Range ($/night)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min"
                aria-label="Minimum price per night"
                value={filters.minPrice ?? ''}
                onChange={(e) => handleMinPriceChange(e.target.value)}
                className="w-full bg-heritage-charcoal border border-heritage-gold/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
              />
              <span className="text-white/30 text-xs">–</span>
              <input
                type="number"
                min={0}
                placeholder="Max"
                aria-label="Maximum price per night"
                value={filters.maxPrice ?? ''}
                onChange={(e) => handleMaxPriceChange(e.target.value)}
                className="w-full bg-heritage-charcoal border border-heritage-gold/20 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
              />
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-2">
            <span className="text-white/60 text-xs uppercase tracking-wider block">
              Amenities
            </span>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {allAmenities.map((amenity) => {
                const isSelected = filters.amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    onClick={() => handleAmenityToggle(amenity)}
                    className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                      isSelected
                        ? 'bg-heritage-gold text-heritage-charcoal font-bold'
                        : 'bg-heritage-gold/10 text-white/60 hover:text-white hover:bg-heritage-gold/20'
                    }`}
                    aria-pressed={isSelected}
                    aria-label={`Filter by ${amenity}`}
                  >
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile reset button */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="mt-4 md:hidden flex items-center gap-1.5 text-heritage-gold/70 hover:text-heritage-gold text-xs transition-colors"
            aria-label="Reset all filters"
          >
            <RotateCcw size={12} />
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
}
