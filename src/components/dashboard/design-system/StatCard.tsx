'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  /** Label displayed above the value */
  label: string;
  /** Main metric value */
  value: string | number;
  /** Icon rendered beside the value */
  icon?: ReactNode;
  /** Percentage change from previous period */
  trend?: number;
  /** Custom label for the trend (e.g. "vs last month") */
  trendLabel?: string;
  /** Optional subtitle text below the value */
  subtitle?: string;
  /** Whether this card is in loading state */
  loading?: boolean;
  /** Compact variant for mobile layouts */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

/**
 * StatCard — A dashboard metric card displaying a key value with optional trend.
 *
 * Design system principles:
 * - 4px grid spacing (p-4 = 16px, p-5 = 20px, gap-2 = 8px)
 * - Heritage gold accent color via CSS variables
 * - Dark theme default with light theme support
 * - WCAG AA contrast ratios
 * - Focus-visible indicators for keyboard navigation
 */
export function StatCard({
  label,
  value,
  icon,
  trend,
  trendLabel = 'vs last period',
  subtitle,
  loading = false,
  compact = false,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'rounded-xl border animate-pulse',
          compact ? 'p-3' : 'p-5',
          className
        )}
        style={{
          backgroundColor: 'var(--theme-surface-primary)',
          borderColor: 'var(--theme-border-secondary)',
        }}
        role="status"
        aria-label={`Loading ${label}`}
      >
        <div
          className="h-3 w-20 rounded mb-3"
          style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
        />
        <div
          className="h-7 w-16 rounded mb-2"
          style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
        />
        <div
          className="h-3 w-24 rounded"
          style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
        />
      </div>
    );
  }

  const trendDirection = trend === undefined ? null : trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat';

  return (
    <motion.article
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'relative overflow-hidden rounded-xl border transition-shadow duration-200',
        'focus-within:ring-2 focus-within:ring-offset-2',
        compact ? 'p-3' : 'p-5',
        className
      )}
      style={{
        backgroundColor: 'var(--theme-surface-primary)',
        borderColor: 'var(--theme-border-secondary)',
        ['--tw-ring-color' as string]: 'var(--theme-accent-gold)',
        ['--tw-ring-offset-color' as string]: 'var(--theme-bg-primary)',
      }}
      aria-label={`${label}: ${value}${trend !== undefined ? `, ${trend >= 0 ? '+' : ''}${trend}% ${trendLabel}` : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <p
            className={cn(
              'font-medium tracking-wide uppercase truncate',
              compact ? 'text-[10px]' : 'text-xs'
            )}
            style={{ color: 'var(--theme-text-muted)' }}
          >
            {label}
          </p>
          <p
            className={cn(
              'font-serif font-bold truncate',
              compact ? 'text-lg' : 'text-2xl'
            )}
            style={{ color: 'var(--theme-text-primary)' }}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className="text-xs truncate"
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              {subtitle}
            </p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {trendDirection === 'up' && (
                <TrendingUp size={14} style={{ color: 'var(--theme-success)' }} aria-hidden="true" />
              )}
              {trendDirection === 'down' && (
                <TrendingDown size={14} style={{ color: 'var(--theme-error)' }} aria-hidden="true" />
              )}
              {trendDirection === 'flat' && (
                <Minus size={14} style={{ color: 'var(--theme-text-muted)' }} aria-hidden="true" />
              )}
              <span
                className="text-xs font-medium"
                style={{
                  color:
                    trendDirection === 'up'
                      ? 'var(--theme-success)'
                      : trendDirection === 'down'
                        ? 'var(--theme-error)'
                        : 'var(--theme-text-muted)',
                }}
              >
                {trend >= 0 ? '+' : ''}{trend}% {trendLabel}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              'shrink-0 rounded-lg flex items-center justify-center',
              compact ? 'p-1.5' : 'p-2'
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--theme-accent-gold) 10%, transparent)',
              color: 'var(--theme-accent-gold)',
            }}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{
          background: 'linear-gradient(to right, transparent, var(--theme-accent-gold), transparent)',
          opacity: 0.2,
        }}
      />
    </motion.article>
  );
}
