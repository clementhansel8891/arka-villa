'use client';

import { useState, useCallback } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateDateRange as coreValidateDateRange } from './date-range-validation';

export interface DateRange {
  start: string;
  end: string;
}

export interface DateRangeFilterProps {
  /** Initial date range. Defaults to current month. */
  defaultRange?: DateRange;
  /** Maximum allowed range in months. Defaults to 12. */
  maxMonths?: number;
  /** Called with validated date range on change */
  onChange: (range: DateRange) => void;
  /** Additional class name for container */
  className?: string;
}

function getCurrentMonthRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Validates a date range using the core validation logic.
 * Returns an error message if invalid, or null if valid.
 * Supports a configurable max months (for financial panel up to 24 months).
 */
export function validateDateRange(
  start: string,
  end: string,
  maxMonths: number
): string | null {
  if (!start || !end) {
    return 'Both start and end dates are required.';
  }

  // For the default 12-month limit, use the core validation
  if (maxMonths === 12) {
    const result = coreValidateDateRange(start, end);
    return result.valid ? null : (result.error ?? 'Invalid date range.');
  }

  // Custom max months logic (e.g., 24 months for financial panel)
  const startDate = new Date(start + 'T00:00:00Z');
  const endDate = new Date(end + 'T00:00:00Z');

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Invalid date format.';
  }

  if (endDate < startDate) {
    return 'End date must not precede start date.';
  }

  const maxEnd = new Date(startDate);
  maxEnd.setUTCMonth(maxEnd.getUTCMonth() + maxMonths);

  if (endDate > maxEnd) {
    return `Date range must not exceed ${maxMonths} months.`;
  }

  return null;
}

export default function DateRangeFilter({
  defaultRange,
  maxMonths = 12,
  onChange,
  className,
}: DateRangeFilterProps) {
  const initial = defaultRange ?? getCurrentMonthRange();
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [error, setError] = useState<string | null>(null);

  const handleApply = useCallback(() => {
    const validationError = validateDateRange(start, end, maxMonths);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onChange({ start, end });
  }, [start, end, maxMonths, onChange]);

  const handleStartChange = (value: string) => {
    setStart(value);
    setError(null);
  };

  const handleEndChange = (value: string) => {
    setEnd(value);
    setError(null);
  };

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="date-range-start"
          className="text-xs text-white/40 font-medium uppercase tracking-wide"
        >
          Start Date
        </label>
        <input
          id="date-range-start"
          type="date"
          value={start}
          onChange={(e) => handleStartChange(e.target.value)}
          className="rounded-lg border border-heritage-gold/20 bg-heritage-charcoal/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-heritage-gold/50"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="date-range-end"
          className="text-xs text-white/40 font-medium uppercase tracking-wide"
        >
          End Date
        </label>
        <input
          id="date-range-end"
          type="date"
          value={end}
          onChange={(e) => handleEndChange(e.target.value)}
          className="rounded-lg border border-heritage-gold/20 bg-heritage-charcoal/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-heritage-gold/50"
        />
      </div>

      <button
        onClick={handleApply}
        className="flex items-center gap-2 rounded-lg bg-heritage-gold/10 border border-heritage-gold/30 px-4 py-2 text-sm font-medium text-heritage-gold hover:bg-heritage-gold/20 transition-colors"
        aria-label="Apply date range filter"
      >
        <Calendar size={16} />
        Apply
      </button>

      {error && (
        <div
          className="flex items-center gap-2 text-sm text-red-400"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
