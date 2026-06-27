'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

export interface SkeletonProps {
  /** Width class or CSS value */
  width?: string;
  /** Height class or CSS value */
  height?: string;
  /** Border radius variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Additional className */
  className?: string;
}

/**
 * Skeleton — Animated placeholder for content that is loading.
 * Uses a subtle shimmer effect matching the design system.
 */
export function Skeleton({
  width,
  height,
  variant = 'text',
  className,
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  return (
    <div
      className={cn(
        'animate-pulse',
        variantClasses[variant],
        className
      )}
      style={{
        backgroundColor: 'var(--theme-bg-tertiary)',
        width: width ?? '100%',
        height: height ?? (variant === 'text' ? '1rem' : variant === 'circular' ? '2.5rem' : '4rem'),
      }}
      role="status"
      aria-label="Loading content"
    />
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

export interface SpinnerProps {
  /** Size in pixels */
  size?: number;
  /** Optional accessible label */
  label?: string;
  /** Additional className */
  className?: string;
}

/**
 * Spinner — A heritage-gold themed loading spinner.
 * Organic easing for a softer animation feel.
 */
export function Spinner({ size = 24, label = 'Loading', className }: SpinnerProps) {
  return (
    <div
      className={cn('inline-flex items-center justify-center', className)}
      role="status"
      aria-label={label}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="var(--theme-border-secondary)"
          strokeWidth="3"
        />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="var(--theme-accent-gold)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </motion.svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ─── Pulse Dot ───────────────────────────────────────────────────────────────

export interface PulseDotsProps {
  /** Number of dots */
  count?: number;
  /** Dot size in pixels */
  dotSize?: number;
  /** Accessible label */
  label?: string;
  /** Additional className */
  className?: string;
}

/**
 * PulseDots — Bouncing dot loader for inline loading states.
 */
export function PulseDots({ count = 3, dotSize = 6, label = 'Loading', className }: PulseDotsProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      role="status"
      aria-label={label}
    >
      {Array.from({ length: count }).map((_, i) => (
        <motion.span
          key={i}
          className="rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: 'var(--theme-accent-gold)',
          }}
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

// ─── Card Skeleton ───────────────────────────────────────────────────────────

export interface CardSkeletonProps {
  /** Number of skeleton lines to show */
  lines?: number;
  /** Whether to show a header skeleton */
  showHeader?: boolean;
  /** Whether to show an icon placeholder */
  showIcon?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * CardSkeleton — Full card loading placeholder matching the StatCard layout.
 */
export function CardSkeleton({
  lines = 3,
  showHeader = true,
  showIcon = true,
  className,
}: CardSkeletonProps) {
  return (
    <div
      className={cn('rounded-xl border p-5 animate-pulse', className)}
      style={{
        backgroundColor: 'var(--theme-surface-primary)',
        borderColor: 'var(--theme-border-secondary)',
      }}
      role="status"
      aria-label="Loading card"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          {showHeader && (
            <div
              className="h-3 w-24 rounded"
              style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
            />
          )}
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-4 rounded"
              style={{
                backgroundColor: 'var(--theme-bg-tertiary)',
                width: i === 0 ? '60%' : i === 1 ? '80%' : '40%',
              }}
            />
          ))}
        </div>
        {showIcon && (
          <div
            className="h-10 w-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Table Skeleton ──────────────────────────────────────────────────────────

export interface TableSkeletonProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  cols?: number;
  /** Additional className */
  className?: string;
}

/**
 * TableSkeleton — Skeleton loader matching the DataTable layout.
 */
export function TableSkeleton({ rows = 5, cols = 4, className }: TableSkeletonProps) {
  return (
    <div
      className={cn('rounded-xl border overflow-hidden', className)}
      style={{
        backgroundColor: 'var(--theme-surface-primary)',
        borderColor: 'var(--theme-border-secondary)',
      }}
      role="status"
      aria-label="Loading table"
    >
      {/* Header row */}
      <div
        className="flex gap-4 px-4 py-3 border-b animate-pulse"
        style={{ borderColor: 'var(--theme-border-secondary)' }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded flex-1"
            style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
          />
        ))}
      </div>
      {/* Body rows */}
      <div className="p-4 space-y-3 animate-pulse">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex gap-4">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <div
                key={colIdx}
                className="h-4 rounded flex-1"
                style={{ backgroundColor: 'var(--theme-bg-tertiary)' }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Full Page Loading ───────────────────────────────────────────────────────

export interface PageLoadingProps {
  /** Message to display below the spinner */
  message?: string;
  /** Additional className */
  className?: string;
}

/**
 * PageLoading — Full-page centered loading state with spinner and message.
 */
export function PageLoading({ message = 'Loading...', className }: PageLoadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] gap-4',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner size={40} label={message} />
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        {message}
      </p>
    </div>
  );
}
