"use client";

import { type ReactNode } from "react";
import { clsx } from "clsx";

// ─────────────────────────────────────────────────────────────────────────────
// Organic Layout System for Villa Websites
// Implements asymmetric grids, golden ratio spacing, staggered positioning,
// and overlapping visual layers. No generic card grids or uniform columns.
// ─────────────────────────────────────────────────────────────────────────────

/** Golden ratio constant for proportional spacing */
const PHI = 1.618;

/** Golden ratio–based spacing scale (in rem) */
export const goldenSpacing = {
  xs: 0.5,
  sm: 0.5 * PHI,          // ~0.809
  md: 0.5 * PHI ** 2,     // ~1.309
  lg: 0.5 * PHI ** 3,     // ~2.118
  xl: 0.5 * PHI ** 4,     // ~3.427
  "2xl": 0.5 * PHI ** 5,  // ~5.545
  "3xl": 0.5 * PHI ** 6,  // ~8.972
} as const;

// ─── Asymmetric Grid ─────────────────────────────────────────────────────────

export type AsymmetricGridVariant =
  | "golden-split"        // 61.8% / 38.2%
  | "editorial-wide"     // 72% / 28%
  | "staggered-thirds"   // 40% / 30% / 30% with vertical offset
  | "overlap-duo"        // Two panels overlapping by 10%
  | "freeform";          // Absolute positioned children

export interface AsymmetricGridProps {
  variant: AsymmetricGridVariant;
  children: ReactNode;
  className?: string;
  /** Reverse the column order for variety */
  reverse?: boolean;
  /** Gap multiplier (base is golden ratio spacing.md) */
  gap?: number;
}

const gridVariantStyles: Record<AsymmetricGridVariant, string> = {
  "golden-split": "grid grid-cols-1 md:grid-cols-[1.618fr_1fr]",
  "editorial-wide": "grid grid-cols-1 md:grid-cols-[2.6fr_1fr]",
  "staggered-thirds": "grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1.5fr]",
  "overlap-duo": "relative grid grid-cols-1 md:grid-cols-2",
  freeform: "relative",
};

/**
 * Asymmetric grid layout avoiding uniform card-grid patterns.
 * Uses golden ratio proportions and staggered positioning.
 */
export function AsymmetricGrid({
  variant,
  children,
  className,
  reverse = false,
  gap = 1,
}: AsymmetricGridProps) {
  const gapRem = goldenSpacing.md * gap;

  return (
    <div
      className={clsx(
        gridVariantStyles[variant],
        reverse && "md:direction-rtl [&>*]:direction-ltr",
        className
      )}
      style={{ gap: `${gapRem}rem` }}
    >
      {children}
    </div>
  );
}

// ─── Staggered Section ───────────────────────────────────────────────────────

export interface StaggeredSectionProps {
  children: ReactNode;
  className?: string;
  /** Vertical offset for the stagger effect (in rem) */
  offset?: number;
  /** Which child index to offset (0-based) */
  offsetIndex?: number;
}

/**
 * Applies vertical stagger to children, creating an organic
 * uneven rhythm rather than flat aligned rows.
 */
export function StaggeredSection({
  children,
  className,
  offset = 3,
  offsetIndex = 1,
}: StaggeredSectionProps) {
  return (
    <div className={clsx("grid grid-cols-1 md:grid-cols-2 items-start", className)}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <div
              key={i}
              style={{
                transform: i === offsetIndex ? `translateY(${offset}rem)` : undefined,
              }}
            >
              {child}
            </div>
          ))
        : children}
    </div>
  );
}

// ─── Overlap Layer ───────────────────────────────────────────────────────────

export interface OverlapLayerProps {
  children: ReactNode;
  className?: string;
  /** How much to overlap (negative margin in rem). Default: golden ratio sm */
  overlap?: number;
  /** Direction: "up" pulls element up, "left" pulls left */
  direction?: "up" | "left" | "right";
}

/**
 * Creates overlapping layers for visual depth.
 * Use within a relative parent for controlled overlap effects.
 */
export function OverlapLayer({
  children,
  className,
  overlap = goldenSpacing.lg,
  direction = "up",
}: OverlapLayerProps) {
  const style = {
    up: { marginTop: `-${overlap}rem` },
    left: { marginLeft: `-${overlap}rem` },
    right: { marginRight: `-${overlap}rem` },
  }[direction];

  return (
    <div className={clsx("relative z-10", className)} style={style}>
      {children}
    </div>
  );
}

// ─── Full Bleed Section ──────────────────────────────────────────────────────

export interface FullBleedSectionProps {
  children: ReactNode;
  className?: string;
  /** Padding based on golden ratio scale */
  paddingScale?: keyof typeof goldenSpacing;
}

/**
 * Full-bleed section that breaks out of the content container,
 * useful for immersive imagery and panoramic moments.
 */
export function FullBleedSection({
  children,
  className,
  paddingScale = "2xl",
}: FullBleedSectionProps) {
  const py = goldenSpacing[paddingScale];

  return (
    <section
      className={clsx("relative w-screen left-1/2 -translate-x-1/2", className)}
      style={{ paddingTop: `${py}rem`, paddingBottom: `${py}rem` }}
    >
      {children}
    </section>
  );
}

// ─── Varied Width Container ──────────────────────────────────────────────────

export type ContainerWidth = "narrow" | "default" | "wide" | "asymmetric-left" | "asymmetric-right";

export interface VariedContainerProps {
  children: ReactNode;
  className?: string;
  width?: ContainerWidth;
}

const containerWidthStyles: Record<ContainerWidth, string> = {
  narrow: "max-w-2xl mx-auto px-6",
  default: "max-w-6xl mx-auto px-6 md:px-12",
  wide: "max-w-[90rem] mx-auto px-4 md:px-8",
  "asymmetric-left": "max-w-6xl ml-[5%] mr-[15%] px-6",
  "asymmetric-right": "max-w-6xl ml-[15%] mr-[5%] px-6",
};

/**
 * Container with varied widths for organic page rhythm.
 * Avoids the uniform centered-container monotony.
 */
export function VariedContainer({ children, className, width = "default" }: VariedContainerProps) {
  return (
    <div className={clsx(containerWidthStyles[width], className)}>
      {children}
    </div>
  );
}

// ─── Masonry-Style Layout ────────────────────────────────────────────────────

export interface OrganicMasonryProps {
  children: ReactNode;
  className?: string;
  /** Number of columns on desktop (2–4) */
  columns?: 2 | 3 | 4;
}

const masonryColumns: Record<number, string> = {
  2: "columns-1 sm:columns-2",
  3: "columns-1 sm:columns-2 lg:columns-3",
  4: "columns-1 sm:columns-2 lg:columns-3 xl:columns-4",
};

/**
 * CSS-column based masonry layout for organic, Pinterest-style arrangement.
 * Items flow naturally into columns with varied heights.
 */
export function OrganicMasonry({ children, className, columns = 3 }: OrganicMasonryProps) {
  return (
    <div
      className={clsx(
        masonryColumns[columns],
        "gap-x-4 md:gap-x-6 [&>*]:break-inside-avoid [&>*]:mb-4 md:[&>*]:mb-6",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── Golden Ratio Spacer ─────────────────────────────────────────────────────

export interface GoldenSpacerProps {
  size?: keyof typeof goldenSpacing;
  className?: string;
}

/**
 * Intentional whitespace using golden ratio proportions.
 * Avoids mechanical uniform spacing between sections.
 */
export function GoldenSpacer({ size = "xl", className }: GoldenSpacerProps) {
  return (
    <div
      className={className}
      style={{ height: `${goldenSpacing[size]}rem` }}
      aria-hidden="true"
    />
  );
}
