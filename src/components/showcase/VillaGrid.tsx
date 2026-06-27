'use client';

import { useState, useMemo } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import type { ShowcaseVilla, ShowcaseFilters } from './types';
import { EMPTY_FILTERS } from './types';
import VillaCard from './VillaCard';
import FilterPanel from './FilterPanel';

/**
 * Villa portfolio grid with integrated filtering.
 * Displays all managed villas with filter controls.
 * Shows no-results message with reset option when no villas match.
 *
 * Requirements: 9.1, 9.3, 9.7
 */
interface VillaGridProps {
  villas: ShowcaseVilla[];
}

/**
 * Applies showcase filters to villa list.
 * All criteria must be satisfied (AND logic).
 */
export function applyFilters(
  villas: ShowcaseVilla[],
  filters: ShowcaseFilters
): ShowcaseVilla[] {
  return villas.filter((villa) => {
    // Location filter
    if (filters.location && villa.location !== filters.location) {
      return false;
    }

    // Guest capacity filter (minimum)
    if (filters.minCapacity !== null && villa.guestCapacity < filters.minCapacity) {
      return false;
    }

    // Price range filter
    if (filters.minPrice !== null && villa.pricePerNight < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== null && villa.pricePerNight > filters.maxPrice) {
      return false;
    }

    // Amenities filter (villa must have ALL selected amenities)
    if (filters.amenities.length > 0) {
      const villaAmenitySet = new Set(villa.amenities);
      for (const amenity of filters.amenities) {
        if (!villaAmenitySet.has(amenity)) {
          return false;
        }
      }
    }

    return true;
  });
}

export default function VillaGrid({ villas }: VillaGridProps) {
  const [filters, setFilters] = useState<ShowcaseFilters>(EMPTY_FILTERS);

  // Derive available filter options from the full villa list
  const locations = useMemo(() => {
    const locs = new Set(villas.map((v) => v.location));
    return Array.from(locs).sort();
  }, [villas]);

  const allAmenities = useMemo(() => {
    const amenities = new Set<string>();
    villas.forEach((v) => v.amenities.forEach((a) => amenities.add(a)));
    return Array.from(amenities).sort();
  }, [villas]);

  const filteredVillas = useMemo(() => applyFilters(villas, filters), [villas, filters]);

  return (
    <div className="space-y-8">
      {/* Filter Panel */}
      <FilterPanel
        filters={filters}
        onFiltersChange={setFilters}
        locations={locations}
        allAmenities={allAmenities}
      />

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-sm">
          {filteredVillas.length === villas.length
            ? `${villas.length} villas`
            : `${filteredVillas.length} of ${villas.length} villas`}
        </p>
      </div>

      {/* Villa Grid or No Results */}
      {filteredVillas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVillas.map((villa, index) => (
            <VillaCard key={villa.id} villa={villa} index={index} />
          ))}
        </div>
      ) : (
        <NoResults onReset={() => setFilters(EMPTY_FILTERS)} />
      )}
    </div>
  );
}

/**
 * No-results state with reset/modify filter option.
 * Requirement: 9.7
 */
function NoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-heritage-gold/10 flex items-center justify-center mb-6">
        <Search size={24} className="text-heritage-gold/60" />
      </div>
      <h3 className="text-white text-lg font-serif mb-2">No villas found</h3>
      <p className="text-white/40 text-sm mb-6 max-w-sm">
        No properties match your current filter criteria. Try adjusting your
        filters or reset to see all available villas.
      </p>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-6 py-2.5 rounded text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors"
      >
        <RotateCcw size={12} />
        Reset Filters
      </button>
    </div>
  );
}
