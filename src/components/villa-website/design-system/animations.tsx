"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { type ReactNode, useRef } from "react";
import { clsx } from "clsx";

// ─────────────────────────────────────────────────────────────────────────────
// Organic Animation System for Villa Websites
// Scroll-triggered reveals, parallax effects, and micro-interactions
// that feel crafted and natural — not mechanical fade-ups.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Organic easing curves that mimic natural movement.
 * Named after Balinese elements for intent-driven selection.
 */
export const organicEasing = {
  /** Gentle water flow — slow start, smooth deceleration */
  waterFlow: [0.16, 1, 0.3, 1] as const,
  /** Bamboo sway — slight overshoot then settle */
  bambooSway: [0.34, 1.56, 0.64, 1] as const,
  /** Stone settle — quick initial motion, heavy stop */
  stoneSettle: [0.25, 0.46, 0.45, 0.94] as const,
  /** Leaf drift — very slow, almost weightless */
  leafDrift: [0.4, 0, 0.2, 1] as const,
  /** Incense rise — smooth upward float */
  incenseRise: [0.08, 0.82, 0.17, 1] as const,
};

// ─── Scroll Reveal Variants ──────────────────────────────────────────────────

export type RevealDirection =
  | "rise"          // Float up from below (like incense smoke)
  | "drift-left"   // Slide in from the right, drifting left
  | "drift-right"  // Slide in from the left, drifting right
  | "emerge"       // Scale up from smaller with opacity
  | "unfold"       // Clip reveal from center outward
  | "cascade";     // Staggered children reveal

export interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  direction?: RevealDirection;
  /** Delay in seconds before animation starts */
  delay?: number;
  /** Duration in seconds. Default: 1.0 */
  duration?: number;
  /** How far from viewport edge to trigger (-px). Default: "-80px" */
  margin?: string;
  /** Only animate once. Default: true */
  once?: boolean;
}

const revealVariants = {
  rise: {
    initial: { opacity: 0, y: 60, rotate: 0.5 },
    animate: { opacity: 1, y: 0, rotate: 0 },
  },
  "drift-left": {
    initial: { opacity: 0, x: 80, rotate: -0.5 },
    animate: { opacity: 1, x: 0, rotate: 0 },
  },
  "drift-right": {
    initial: { opacity: 0, x: -80, rotate: 0.5 },
    animate: { opacity: 1, x: 0, rotate: 0 },
  },
  emerge: {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
  },
  unfold: {
    initial: { opacity: 0, clipPath: "inset(20% 20% 20% 20%)" },
    animate: { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" },
  },
  cascade: {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
  },
} as const satisfies Record<RevealDirection, { initial: Record<string, unknown>; animate: Record<string, unknown> }>;

/**
 * Scroll-triggered organic reveal animation.
 * Uses natural easing curves instead of mechanical fade-up patterns.
 */
export function ScrollReveal({
  children,
  className,
  direction = "rise",
  delay = 0,
  duration = 1.0,
  margin = "-80px",
  once = true,
}: ScrollRevealProps) {
  const variant = revealVariants[direction];

  return (
    <motion.div
      initial={variant.initial}
      whileInView={variant.animate}
      viewport={{ once, margin }}
      transition={{
        duration,
        delay,
        ease: organicEasing.waterFlow,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Cascade Container ───────────────────────────────────────────────────────

export interface CascadeContainerProps {
  children: ReactNode;
  className?: string;
  /** Stagger delay between children (seconds). Default: 0.12 */
  stagger?: number;
  /** Base delay before cascade starts. Default: 0 */
  delay?: number;
}

/**
 * Container that staggers the reveal of its children.
 * Creates a natural cascade effect like water over stones.
 */
export function CascadeContainer({
  children,
  className,
  stagger = 0.12,
  delay = 0,
}: CascadeContainerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Child element within a CascadeContainer. Automatically animated.
 */
export function CascadeItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 40, rotate: 0.3 },
        visible: {
          opacity: 1,
          y: 0,
          rotate: 0,
          transition: {
            duration: 0.9,
            ease: organicEasing.waterFlow,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Parallax Layer ──────────────────────────────────────────────────────────

export interface ParallaxLayerProps {
  children: ReactNode;
  className?: string;
  /** Speed multiplier. Positive = slower than scroll, negative = faster. Default: 0.3 */
  speed?: number;
  /** Scroll range in pixels for input mapping. Default: [0, 1000] */
  scrollRange?: [number, number];
}

/**
 * Parallax depth layer for creating visual hierarchy on scroll.
 * Slower elements feel further away, faster elements feel closer.
 */
export function ParallaxLayer({
  children,
  className,
  speed = 0.3,
  scrollRange = [0, 1000],
}: ParallaxLayerProps) {
  const { scrollY } = useScroll();
  const y = useTransform(
    scrollY,
    scrollRange,
    [0, scrollRange[1] * speed]
  );

  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

// ─── Section Parallax (Relative to own container) ────────────────────────────

export interface SectionParallaxProps {
  children: ReactNode;
  className?: string;
  /** Vertical movement in px. Default: 100 */
  distance?: number;
}

/**
 * Parallax relative to a section's own scroll position.
 * More controlled than global parallax — good for hero backgrounds.
 */
export function SectionParallax({
  children,
  className,
  distance = 100,
}: SectionParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-distance / 2, distance / 2]);

  return (
    <div ref={ref} className={clsx("relative overflow-hidden", className)}>
      <motion.div style={{ y }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}

// ─── Floating Element ────────────────────────────────────────────────────────

export interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  /** Amplitude of float in px. Default: 8 */
  amplitude?: number;
  /** Duration of one cycle in seconds. Default: 6 */
  period?: number;
}

/**
 * Gentle floating animation — like a leaf on still water.
 * Adds life to static decorative elements without being distracting.
 */
export function FloatingElement({
  children,
  className,
  amplitude = 8,
  period = 6,
}: FloatingElementProps) {
  return (
    <motion.div
      animate={{
        y: [-amplitude / 2, amplitude / 2, -amplitude / 2],
        rotate: [-0.5, 0.5, -0.5],
      }}
      transition={{
        duration: period,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Image Reveal ────────────────────────────────────────────────────────────

export type ImageRevealStyle = "curtain-horizontal" | "curtain-vertical" | "iris" | "diagonal-wipe";

export interface ImageRevealProps {
  children: ReactNode;
  className?: string;
  style?: ImageRevealStyle;
  /** Duration in seconds. Default: 1.4 */
  duration?: number;
}

const imageRevealClipPaths: Record<ImageRevealStyle, { from: string; to: string }> = {
  "curtain-horizontal": {
    from: "inset(0 50% 0 50%)",
    to: "inset(0 0% 0 0%)",
  },
  "curtain-vertical": {
    from: "inset(50% 0 50% 0)",
    to: "inset(0% 0 0% 0)",
  },
  iris: {
    from: "circle(0% at 50% 50%)",
    to: "circle(75% at 50% 50%)",
  },
  "diagonal-wipe": {
    from: "polygon(0 0, 0 0, 0 100%, 0 100%)",
    to: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
  },
};

/**
 * Cinematic image reveal animation on scroll.
 * Unveils imagery like a curtain or iris opening — theatrical and crafted.
 */
export function ImageReveal({
  children,
  className,
  style: revealStyle = "curtain-horizontal",
  duration = 1.4,
}: ImageRevealProps) {
  const clips = imageRevealClipPaths[revealStyle];

  return (
    <motion.div
      initial={{ clipPath: clips.from, opacity: 0.8 }}
      whileInView={{ clipPath: clips.to, opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration,
        ease: organicEasing.stoneSettle,
      }}
      className={clsx("overflow-hidden", className)}
    >
      {children}
    </motion.div>
  );
}

// ─── Hover Lift ──────────────────────────────────────────────────────────────

export interface HoverLiftProps {
  children: ReactNode;
  className?: string;
  /** Lift distance in px. Default: -4 */
  lift?: number;
}

/**
 * Subtle hover elevation effect. Provides tactile feedback
 * without being overly animated or template-like.
 */
export function HoverLift({ children, className, lift = -4 }: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{ y: lift, transition: { duration: 0.3, ease: organicEasing.leafDrift } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
