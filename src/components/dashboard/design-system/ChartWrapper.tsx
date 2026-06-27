'use client';

import { type ReactNode, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Spinner } from './LoadingState';

export interface ChartWrapperProps {
  /** Chart title */
  title: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Chart content (rendered as children) */
  children: ReactNode;
  /** Whether the chart data is loading */
  loading?: boolean;
  /** Optional actions (e.g., period selector) rendered in the header */
  actions?: ReactNode;
  /** Minimum height of the chart container */
  minHeight?: number;
  /** Aspect ratio constraint (width / height) */
  aspectRatio?: number;
  /** Additional className for the wrapper */
  className?: string;
  /** Optional footer content (e.g., legend) */
  footer?: ReactNode;
}

/**
 * ChartWrapper — Responsive container for chart visualizations.
 *
 * Design system principles:
 * - 4px grid spacing (p-4, p-5)
 * - Heritage gold accent for chart borders
 * - Provides responsive width/height context for child charts
 * - Accessible: labeled region, loading state announced
 * - Dark/light theme support via CSS variables
 */
export function ChartWrapper({
  title,
  subtitle,
  children,
  loading = false,
  actions,
  minHeight = 200,
  aspectRatio,
  className,
  footer,
}: ChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const height = aspectRatio ? width / aspectRatio : Math.max(minHeight, width * 0.5);
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [aspectRatio, minHeight]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn('rounded-xl border overflow-hidden', className)}
      style={{
        backgroundColor: 'var(--theme-surface-primary)',
        borderColor: 'var(--theme-border-secondary)',
      }}
      aria-label={`Chart: ${title}`}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4 p-4 pb-0 sm:p-5 sm:pb-0"
      >
        <div className="min-w-0">
          <h3
            className="text-sm font-semibold truncate"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className="text-xs mt-0.5 truncate"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="shrink-0 flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Chart container */}
      <div
        ref={containerRef}
        className="relative p-4 sm:p-5"
        style={{ minHeight }}
      >
        {loading ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            role="status"
            aria-label={`Loading ${title} chart`}
          >
            <Spinner size={32} label={`Loading ${title}`} />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: dimensions.height || minHeight,
            }}
          >
            {children}
          </div>
        )}
      </div>

      {/* Footer */}
      {footer && (
        <div
          className="px-4 py-3 border-t sm:px-5"
          style={{ borderColor: 'var(--theme-border-secondary)' }}
        >
          {footer}
        </div>
      )}
    </motion.section>
  );
}

// ─── Chart Legend ─────────────────────────────────────────────────────────────

export interface ChartLegendItem {
  label: string;
  color: string;
}

export interface ChartLegendProps {
  items: ChartLegendItem[];
  className?: string;
}

/**
 * ChartLegend — Inline legend for use as chart footer.
 */
export function ChartLegend({ items, className }: ChartLegendProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-4', className)} role="list" aria-label="Chart legend">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5" role="listitem">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span
            className="text-xs"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Period Selector (common chart action) ───────────────────────────────────

export type ChartPeriod = '7d' | '30d' | '90d' | 'custom';

export interface PeriodSelectorProps {
  value: ChartPeriod;
  onChange: (period: ChartPeriod) => void;
  options?: { value: ChartPeriod; label: string }[];
  className?: string;
}

const defaultPeriods: { value: ChartPeriod; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

/**
 * PeriodSelector — Segmented period selector for chart time ranges.
 */
export function PeriodSelector({
  value,
  onChange,
  options = defaultPeriods,
  className,
}: PeriodSelectorProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-0.5 rounded-lg p-0.5', className)}
      style={{
        backgroundColor: 'var(--theme-bg-tertiary)',
      }}
      role="radiogroup"
      aria-label="Chart period"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-1'
            )}
            style={{
              backgroundColor: isActive ? 'var(--theme-surface-elevated)' : 'transparent',
              color: isActive ? 'var(--theme-text-primary)' : 'var(--theme-text-muted)',
              outlineColor: 'var(--theme-accent-gold)',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
