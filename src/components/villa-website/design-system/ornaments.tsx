"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { clsx } from "clsx";
import { organicEasing } from "./animations";

// ─────────────────────────────────────────────────────────────────────────────
// Balinese Ornamental Elements for Villa Websites
// Hand-crafted SVG dividers, borders, and decorative elements inspired by
// traditional Balinese carvings, temple gates, and floral motifs.
// ─────────────────────────────────────────────────────────────────────────────

export type OrnamentStyle =
  | "temple-gate"      // Inspired by candi bentar (split gate) silhouette
  | "lotus-chain"      // Repeating lotus flower motif
  | "frangipani-vine"  // Flowing vine with frangipani (jepun) accents
  | "wave-meander"     // Traditional ombak (wave) border pattern
  | "diamond-lattice"  // Geometric lattice from Balinese textiles
  | "flame-finial";    // Inspired by temple finial flame shapes

export interface OrnamentalDividerProps {
  style: OrnamentStyle;
  className?: string;
  /** Width as percentage or CSS value. Default: "60%" */
  width?: string;
  /** Color of the ornament. Default: heritage gold */
  color?: string;
  /** Animate on scroll into view. Default: true */
  animate?: boolean;
}

/**
 * SVG path data for each ornamental style.
 * Drawn at 200×24 viewBox for horizontal dividers.
 */
const ornamentPaths: Record<OrnamentStyle, string> = {
  "temple-gate":
    "M0 20 L20 20 L30 8 L40 4 L50 2 L60 1 L70 0 L80 0 L90 0 L100 0 L110 0 L120 0 L130 0 L140 1 L150 2 L160 4 L170 8 L180 20 L200 20 M95 6 L100 0 L105 6 M70 4 L70 8 M130 4 L130 8",
  "lotus-chain":
    "M0 12 Q10 12 15 8 Q20 4 25 4 Q30 4 32 8 Q35 12 40 12 Q45 12 48 8 Q50 4 55 4 Q60 4 62 8 Q65 12 70 12 Q75 12 78 8 Q80 4 85 4 Q90 4 92 8 Q95 12 100 12 Q105 12 108 8 Q110 4 115 4 Q120 4 122 8 Q125 12 130 12 Q135 12 138 8 Q140 4 145 4 Q150 4 152 8 Q155 12 160 12 Q165 12 168 8 Q170 4 175 4 Q180 4 182 8 Q185 12 190 12 L200 12",
  "frangipani-vine":
    "M0 12 C20 12 25 6 40 6 C55 6 50 12 60 14 C70 16 75 10 85 8 C95 6 100 12 110 12 C120 12 125 6 140 6 C155 6 150 14 160 14 C170 14 175 8 185 8 C195 8 198 12 200 12 M40 6 L38 2 M42 4 L45 1 M140 6 L138 2 M142 4 L145 1",
  "wave-meander":
    "M0 18 Q12 18 18 12 Q24 6 36 6 Q48 6 54 12 Q60 18 72 18 Q84 18 90 12 Q96 6 108 6 Q120 6 126 12 Q132 18 144 18 Q156 18 162 12 Q168 6 180 6 Q192 6 198 12 L200 14",
  "diamond-lattice":
    "M0 12 L10 2 L20 12 L30 2 L40 12 L50 2 L60 12 L70 2 L80 12 L90 2 L100 12 L110 2 L120 12 L130 2 L140 12 L150 2 L160 12 L170 2 L180 12 L190 2 L200 12 M0 12 L10 22 L20 12 L30 22 L40 12 L50 22 L60 12 L70 22 L80 12 L90 22 L100 12 L110 22 L120 12 L130 22 L140 12 L150 22 L160 12 L170 22 L180 12 L190 22 L200 12",
  "flame-finial":
    "M0 22 Q10 22 20 18 Q30 14 35 10 Q40 6 45 4 Q50 2 55 1 Q60 0 65 0 Q70 0 75 0 Q80 0 85 0 Q90 0 95 0 Q100 0 105 0 Q110 0 115 0 Q120 0 125 0 Q130 0 135 0 Q140 1 145 2 Q150 4 155 6 Q160 10 165 14 Q170 18 180 22 L200 22 M90 2 Q95 -2 100 2 Q105 -2 110 2",
};

/**
 * Ornamental divider inspired by Balinese carving traditions.
 * SVG-based, animates elegantly on scroll into view.
 */
export function OrnamentalDivider({
  style,
  className,
  width = "60%",
  color = "currentColor",
  animate = true,
}: OrnamentalDividerProps) {
  const path = ornamentPaths[style];

  const svgContent = (
    <svg
      viewBox="0 0 200 24"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-auto"
      style={{ maxWidth: width }}
      aria-hidden="true"
    >
      <path
        d={path}
        stroke={color}
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  if (!animate) {
    return (
      <div className={clsx("flex justify-center text-heritage-gold/50", className)}>
        {svgContent}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      whileInView={{ opacity: 1, scaleX: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 1.2, ease: organicEasing.waterFlow }}
      className={clsx("flex justify-center text-heritage-gold/50", className)}
    >
      {svgContent}
    </motion.div>
  );
}

// ─── Corner Ornament ─────────────────────────────────────────────────────────

export type CornerPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface CornerOrnamentProps {
  position: CornerPosition;
  className?: string;
  /** Size in px. Default: 80 */
  size?: number;
  color?: string;
}

/**
 * Decorative corner ornament inspired by Balinese wood carving frames.
 * Used to add handcrafted character to sections and image frames.
 */
export function CornerOrnament({
  position,
  className,
  size = 80,
  color = "currentColor",
}: CornerOrnamentProps) {
  const rotations: Record<CornerPosition, number> = {
    "top-left": 0,
    "top-right": 90,
    "bottom-right": 180,
    "bottom-left": 270,
  };

  const positionStyles: Record<CornerPosition, string> = {
    "top-left": "top-0 left-0",
    "top-right": "top-0 right-0",
    "bottom-left": "bottom-0 left-0",
    "bottom-right": "bottom-0 right-0",
  };

  return (
    <div
      className={clsx(
        "absolute pointer-events-none text-heritage-gold/30",
        positionStyles[position],
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 80 80"
        fill="none"
        style={{ transform: `rotate(${rotations[position]}deg)` }}
        className="w-full h-full"
      >
        <path
          d="M0 0 L30 0 Q20 5 15 15 Q10 25 8 35 Q6 45 5 55 Q4 65 0 80 L0 0 Z"
          fill={color}
          fillOpacity="0.05"
        />
        <path
          d="M0 0 C10 0 20 2 28 6 C20 10 14 18 10 28 C6 18 2 10 0 0"
          stroke={color}
          strokeWidth="0.5"
          fill="none"
        />
        <circle cx="12" cy="12" r="2" fill={color} fillOpacity="0.3" />
        <path
          d="M5 20 Q8 18 12 20 Q8 22 5 20"
          fill={color}
          fillOpacity="0.2"
        />
      </svg>
    </div>
  );
}

// ─── Ornamental Frame ────────────────────────────────────────────────────────

export interface OrnamentalFrameProps {
  children: ReactNode;
  className?: string;
  /** Show corner ornaments. Default: true */
  corners?: boolean;
  /** Frame border style */
  borderStyle?: "thin" | "double" | "ornate";
}

const frameBorderStyles: Record<string, string> = {
  thin: "border border-heritage-gold/15",
  double: "border-2 border-heritage-gold/10 outline outline-1 outline-offset-4 outline-heritage-gold/5",
  ornate: "border border-heritage-gold/20 shadow-[inset_0_0_30px_rgba(212,175,55,0.03)]",
};

/**
 * Ornamental frame wrapper with optional corner decorations.
 * Adds a handcrafted, gallery-like quality to content sections.
 */
export function OrnamentalFrame({
  children,
  className,
  corners = true,
  borderStyle = "thin",
}: OrnamentalFrameProps) {
  return (
    <div className={clsx("relative p-8 md:p-12", frameBorderStyles[borderStyle], className)}>
      {corners && (
        <>
          <CornerOrnament position="top-left" />
          <CornerOrnament position="top-right" />
          <CornerOrnament position="bottom-left" />
          <CornerOrnament position="bottom-right" />
        </>
      )}
      {children}
    </div>
  );
}

// ─── Decorative Dot Pattern ──────────────────────────────────────────────────

export interface DotPatternProps {
  className?: string;
  /** Number of dots in the pattern. Default: 5 */
  count?: number;
  /** Spacing between dots in px. Default: 8 */
  spacing?: number;
  /** Direction: horizontal or vertical. Default: "horizontal" */
  direction?: "horizontal" | "vertical";
}

/**
 * Minimalist dot pattern — used as subtle section separators
 * or accent marks in the typographic hierarchy.
 */
export function DotPattern({
  className,
  count = 5,
  spacing = 8,
  direction = "horizontal",
}: DotPatternProps) {
  return (
    <div
      className={clsx(
        "flex items-center justify-center",
        direction === "vertical" && "flex-col",
        className
      )}
      style={{ gap: spacing }}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="w-1 h-1 rounded-full bg-heritage-gold/40"
          style={{
            opacity: i === Math.floor(count / 2) ? 1 : 0.4 + (0.2 * (count / 2 - Math.abs(i - count / 2))) / (count / 2),
          }}
        />
      ))}
    </div>
  );
}

// ─── Floral Accent ───────────────────────────────────────────────────────────

export interface FloralAccentProps {
  className?: string;
  /** Size in px. Default: 40 */
  size?: number;
  /** Rotation in degrees. Default: 0 */
  rotation?: number;
}

/**
 * Single Balinese floral accent (frangipani/lotus inspired).
 * Used as inline decorative elements beside headings or in margins.
 */
export function FloralAccent({ className, size = 40, rotation = 0 }: FloralAccentProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={clsx("inline-block text-heritage-gold/40", className)}
      style={{ width: size, height: size, transform: `rotate(${rotation}deg)` }}
      aria-hidden="true"
    >
      {/* Five petals radiating from center — lotus/frangipani form */}
      <path d="M20 20 Q20 10 20 4 Q22 10 20 20" fill="currentColor" fillOpacity="0.6" />
      <path d="M20 20 Q26 14 30 8 Q28 16 20 20" fill="currentColor" fillOpacity="0.5" />
      <path d="M20 20 Q28 20 34 22 Q28 24 20 20" fill="currentColor" fillOpacity="0.4" />
      <path d="M20 20 Q26 26 28 32 Q22 28 20 20" fill="currentColor" fillOpacity="0.5" />
      <path d="M20 20 Q14 26 10 30 Q14 24 20 20" fill="currentColor" fillOpacity="0.4" />
      <path d="M20 20 Q12 20 6 18 Q12 16 20 20" fill="currentColor" fillOpacity="0.5" />
      <path d="M20 20 Q14 14 12 8 Q18 14 20 20" fill="currentColor" fillOpacity="0.4" />
      {/* Center dot */}
      <circle cx="20" cy="20" r="2" fill="currentColor" fillOpacity="0.8" />
    </svg>
  );
}

// ─── Section Separator (combines ornament + spacing) ─────────────────────────

export interface SectionSeparatorProps {
  ornament?: OrnamentStyle;
  className?: string;
  /** Vertical padding in rem. Default: 4 */
  spacing?: number;
}

/**
 * Complete section separator combining ornamental divider with
 * golden-ratio spacing above and below. Drop-in section break.
 */
export function SectionSeparator({
  ornament = "lotus-chain",
  className,
  spacing = 4,
}: SectionSeparatorProps) {
  return (
    <div
      className={clsx("flex items-center justify-center", className)}
      style={{ paddingTop: `${spacing}rem`, paddingBottom: `${spacing}rem` }}
      role="separator"
    >
      <OrnamentalDivider style={ornament} width="40%" />
    </div>
  );
}
