'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Inbox,
  FileSearch,
  CalendarX,
  Users,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type EmptyStateVariant =
  | 'no-data'
  | 'no-results'
  | 'no-bookings'
  | 'no-staff'
  | 'no-metrics'
  | 'custom';

export interface EmptyStateProps {
  /** Predefined illustration variant */
  variant?: EmptyStateVariant;
  /** Custom icon override (use with variant="custom") */
  icon?: ReactNode;
  /** Heading text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button or CTA */
  action?: ReactNode;
  /** Compact mode for inline empty states */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

const variantIcons: Record<Exclude<EmptyStateVariant, 'custom'>, LucideIcon> = {
  'no-data': Inbox,
  'no-results': FileSearch,
  'no-bookings': CalendarX,
  'no-staff': Users,
  'no-metrics': BarChart3,
};

const containerVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const iconVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.15, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

/**
 * EmptyState — Illustration + message for empty/no-data scenarios.
 *
 * Design system principles:
 * - Warm, encouraging tone (not error-like)
 * - Heritage gold accent for icons
 * - Organic reveal animation
 * - Accessible: describes state for screen readers
 */
export function EmptyState({
  variant = 'no-data',
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  const IconComponent = variant !== 'custom' ? variantIcons[variant] : null;

  const renderedIcon = icon ?? (IconComponent ? <IconComponent size={compact ? 32 : 48} /> : null);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-4' : 'py-12 px-6',
        className
      )}
      role="status"
      aria-label={title}
    >
      {/* Animated icon */}
      {renderedIcon && (
        <motion.div
          variants={iconVariants}
          className={cn(
            'rounded-2xl flex items-center justify-center mb-4',
            compact ? 'w-14 h-14' : 'w-20 h-20'
          )}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-accent-gold) 8%, transparent)',
            color: 'var(--theme-accent-gold)',
          }}
        >
          {renderedIcon}
        </motion.div>
      )}

      {/* Title */}
      <h3
        className={cn(
          'font-serif font-semibold',
          compact ? 'text-base' : 'text-lg'
        )}
        style={{ color: 'var(--theme-text-primary)' }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className={cn(
            'mt-2 max-w-sm',
            compact ? 'text-xs' : 'text-sm'
          )}
          style={{ color: 'var(--theme-text-muted)' }}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </motion.div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

export interface ErrorStateProps {
  /** Error heading */
  title?: string;
  /** Error message */
  message?: string;
  /** Retry action */
  onRetry?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * ErrorState — Error display with optional retry button.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className
      )}
      role="alert"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-error) 10%, transparent)',
          color: 'var(--theme-error)',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h3
        className="text-lg font-serif font-semibold"
        style={{ color: 'var(--theme-text-primary)' }}
      >
        {title}
      </h3>

      <p
        className="mt-2 text-sm max-w-sm"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        {message}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            'focus-visible:ring-2 focus-visible:ring-offset-2'
          )}
          style={{
            backgroundColor: 'var(--theme-accent-gold)',
            color: '#121212',
            ['--tw-ring-color' as string]: 'var(--theme-accent-gold)',
            ['--tw-ring-offset-color' as string]: 'var(--theme-bg-primary)',
          }}
        >
          Try again
        </button>
      )}
    </motion.div>
  );
}
