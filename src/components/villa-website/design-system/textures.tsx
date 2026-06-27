"use client";

import { type ReactNode } from "react";
import { clsx } from "clsx";

// ─────────────────────────────────────────────────────────────────────────────
// Natural Texture Overlays for Villa Websites
// Inspired by Balinese materials: batik patterns, stone, wood grain,
// woven bamboo, gold leaf. Applied as background layers or overlays.
// ─────────────────────────────────────────────────────────────────────────────

export type TextureType =
  | "batik-kawung"     // Traditional Javanese/Balinese circular batik motif
  | "batik-parang"    // Diagonal wave batik pattern
  | "stone-volcanic"  // Volcanic stone grain texture
  | "wood-teak"       // Warm teak wood grain
  | "woven-rattan"    // Woven rattan/bamboo crosshatch
  | "gold-leaf"       // Hammered gold leaf shimmer
  | "linen-natural"   // Natural linen/cotton fabric
  | "sand-grain";     // Fine beach sand texture

export interface TextureOverlayProps {
  texture: TextureType;
  children?: ReactNode;
  className?: string;
  /** Opacity of the texture layer (0–1). Default: 0.06 */
  opacity?: number;
  /** Use as a background container (wraps children) vs standalone overlay */
  asContainer?: boolean;
}

/**
 * SVG-based texture patterns. Using inline SVG data URIs for zero-dependency
 * texture rendering. Each pattern is hand-crafted to feel organic.
 */
const textureSVGs: Record<TextureType, string> = {
  "batik-kawung": `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D4AF37' fill-opacity='1'%3E%3Ccircle cx='40' cy='40' r='6'/%3E%3Ccircle cx='40' cy='40' r='14' fill='none' stroke='%23D4AF37' stroke-width='0.8'/%3E%3Ccircle cx='40' cy='0' r='4'/%3E%3Ccircle cx='40' cy='80' r='4'/%3E%3Ccircle cx='0' cy='40' r='4'/%3E%3Ccircle cx='80' cy='40' r='4'/%3E%3C/g%3E%3C/svg%3E")`,

  "batik-parang": `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 60 L30 0 L35 5 L5 60 Z M25 60 L55 0 L60 5 L30 60 Z' fill='%23D4AF37' fill-opacity='1'/%3E%3C/svg%3E")`,

  "stone-volcanic": `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,

  "wood-teak": `url("data:image/svg+xml,%3Csvg width='200' height='50' viewBox='0 0 200 50' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 25 Q50 20 100 25 Q150 30 200 25' fill='none' stroke='%238B6914' stroke-width='0.5' stroke-opacity='1'/%3E%3Cpath d='M0 15 Q40 10 100 15 Q160 20 200 15' fill='none' stroke='%238B6914' stroke-width='0.3' stroke-opacity='0.7'/%3E%3Cpath d='M0 35 Q60 32 100 36 Q140 40 200 35' fill='none' stroke='%238B6914' stroke-width='0.4' stroke-opacity='0.8'/%3E%3Cpath d='M0 45 Q30 42 100 46 Q170 49 200 44' fill='none' stroke='%238B6914' stroke-width='0.3' stroke-opacity='0.5'/%3E%3C/svg%3E")`,

  "woven-rattan": `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0 L40 0 L40 2 L0 2 Z' fill='%23A67C52' fill-opacity='1'/%3E%3Cpath d='M0 10 L40 10 L40 12 L0 12 Z' fill='%23A67C52' fill-opacity='0.7'/%3E%3Cpath d='M0 20 L40 20 L40 22 L0 22 Z' fill='%23A67C52' fill-opacity='1'/%3E%3Cpath d='M0 30 L40 30 L40 32 L0 32 Z' fill='%23A67C52' fill-opacity='0.7'/%3E%3Cpath d='M0 0 L2 0 L2 40 L0 40 Z' fill='%23A67C52' fill-opacity='0.5'/%3E%3Cpath d='M10 0 L12 0 L12 40 L10 40 Z' fill='%23A67C52' fill-opacity='0.3'/%3E%3Cpath d='M20 0 L22 0 L22 40 L20 40 Z' fill='%23A67C52' fill-opacity='0.5'/%3E%3Cpath d='M30 0 L32 0 L32 40 L30 40 Z' fill='%23A67C52' fill-opacity='0.3'/%3E%3C/svg%3E")`,

  "gold-leaf": `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cfilter id='crackle'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.05' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3C/defs%3E%3Crect width='120' height='120' fill='%23D4AF37' filter='url(%23crackle)' opacity='0.3'/%3E%3Cpath d='M10 60 Q30 55 60 60 Q90 65 110 60' fill='none' stroke='%23B8960C' stroke-width='0.3'/%3E%3Cpath d='M20 30 Q50 25 80 30 Q100 35 120 28' fill='none' stroke='%23B8960C' stroke-width='0.2'/%3E%3C/svg%3E")`,

  "linen-natural": `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0 L40 0 L40 1 L0 1 Z' fill='%23F5F1E6' fill-opacity='0.3'/%3E%3Cpath d='M0 4 L40 4 L40 4.5 L0 4.5 Z' fill='%23F5F1E6' fill-opacity='0.2'/%3E%3Cpath d='M0 8 L40 8 L40 9 L0 9 Z' fill='%23F5F1E6' fill-opacity='0.15'/%3E%3Cpath d='M0 12 L40 12 L40 12.5 L0 12.5 Z' fill='%23F5F1E6' fill-opacity='0.3'/%3E%3C/svg%3E")`,

  "sand-grain": `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='5' cy='5' r='0.5' fill='%23D4C9B0' fill-opacity='0.4'/%3E%3Ccircle cx='25' cy='12' r='0.3' fill='%23D4C9B0' fill-opacity='0.3'/%3E%3Ccircle cx='45' cy='8' r='0.4' fill='%23D4C9B0' fill-opacity='0.5'/%3E%3Ccircle cx='15' cy='30' r='0.3' fill='%23D4C9B0' fill-opacity='0.2'/%3E%3Ccircle cx='35' cy='35' r='0.5' fill='%23D4C9B0' fill-opacity='0.4'/%3E%3Ccircle cx='55' cy='28' r='0.3' fill='%23D4C9B0' fill-opacity='0.3'/%3E%3Ccircle cx='10' cy='50' r='0.4' fill='%23D4C9B0' fill-opacity='0.3'/%3E%3Ccircle cx='30' cy='55' r='0.3' fill='%23D4C9B0' fill-opacity='0.5'/%3E%3Ccircle cx='50' cy='48' r='0.4' fill='%23D4C9B0' fill-opacity='0.2'/%3E%3C/svg%3E")`,
};

/**
 * Natural texture overlay or container.
 * Renders organic material textures inspired by Balinese craftsmanship.
 */
export function TextureOverlay({
  texture,
  children,
  className,
  opacity = 0.06,
  asContainer = true,
}: TextureOverlayProps) {
  const textureStyle = {
    backgroundImage: textureSVGs[texture],
    backgroundRepeat: "repeat" as const,
    opacity,
  };

  if (!asContainer) {
    return (
      <div
        className={clsx("absolute inset-0 pointer-events-none", className)}
        style={textureStyle}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className={clsx("relative overflow-hidden", className)}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={textureStyle}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ─── Gradient Blends (Natural, not generic) ──────────────────────────────────

export type NaturalGradient =
  | "jungle-canopy"    // Deep green to transparent
  | "sunset-horizon"   // Warm amber to deep navy
  | "volcanic-earth"   // Dark charcoal to warm brown
  | "ocean-depth"      // Deep teal to transparent
  | "gold-mist"        // Subtle gold shimmer fade
  | "morning-fog";     // White/cream soft vignette

export interface NaturalGradientProps {
  gradient: NaturalGradient;
  children?: ReactNode;
  className?: string;
  /** Gradient direction (CSS value). Default: "to bottom" */
  direction?: string;
}

const gradientValues: Record<NaturalGradient, string> = {
  "jungle-canopy":
    "linear-gradient(to bottom, rgba(27, 48, 34, 0.95), rgba(27, 48, 34, 0.4), transparent)",
  "sunset-horizon":
    "linear-gradient(to bottom, rgba(212, 175, 55, 0.15), rgba(18, 18, 18, 0.9))",
  "volcanic-earth":
    "linear-gradient(135deg, rgba(18, 18, 18, 0.95), rgba(89, 60, 20, 0.4))",
  "ocean-depth":
    "linear-gradient(to bottom, rgba(10, 60, 70, 0.8), rgba(18, 18, 18, 0.95))",
  "gold-mist":
    "radial-gradient(ellipse at 30% 20%, rgba(212, 175, 55, 0.08), transparent 70%)",
  "morning-fog":
    "radial-gradient(ellipse at center, rgba(245, 241, 230, 0.05), transparent 80%)",
};

/**
 * Natural gradient overlays that evoke Balinese landscape moods.
 * Applied as background layers rather than generic gradient heroes.
 */
export function NaturalGradientOverlay({
  gradient,
  children,
  className,
  direction,
}: NaturalGradientProps) {
  const bg = direction
    ? gradientValues[gradient].replace(/linear-gradient\([^,]+,/, `linear-gradient(${direction},`)
    : gradientValues[gradient];

  return (
    <div className={clsx("relative", className)}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: bg }}
        aria-hidden="true"
      />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}

// ─── Material Surface ────────────────────────────────────────────────────────

export type MaterialSurface = "carved-stone" | "polished-wood" | "woven-mat" | "hammered-gold";

export interface MaterialSurfaceProps {
  material: MaterialSurface;
  children: ReactNode;
  className?: string;
}

const materialStyles: Record<MaterialSurface, string> = {
  "carved-stone":
    "bg-heritage-charcoal border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_4px_20px_rgba(0,0,0,0.5)]",
  "polished-wood":
    "bg-gradient-to-br from-[#3d2b1f] to-[#2a1f15] border border-[#5a3d2a]/30 shadow-[inset_0_1px_0_rgba(139,105,20,0.1)]",
  "woven-mat":
    "bg-[#2a2218] border border-[#A67C52]/20 shadow-[inset_0_0_30px_rgba(166,124,82,0.05)]",
  "hammered-gold":
    "bg-gradient-to-br from-heritage-gold/10 to-heritage-gold/5 border border-heritage-gold/20 shadow-[0_0_40px_rgba(212,175,55,0.05)]",
};

/**
 * Material-inspired surface treatment for cards and panels.
 * Adds depth and tactile quality through shadows and subtle gradients.
 */
export function MaterialSurface({ material, children, className }: MaterialSurfaceProps) {
  return (
    <div className={clsx(materialStyles[material], "rounded-sm", className)}>
      {children}
    </div>
  );
}
