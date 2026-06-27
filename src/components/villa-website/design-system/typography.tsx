"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";
import { clsx } from "clsx";

// ─────────────────────────────────────────────────────────────────────────────
// Typography Design System for Villa Websites
// Mixes serif display fonts with clean body text; avoids generic heading
// hierarchies by embracing editorial, artisanal typographic rhythm.
// ─────────────────────────────────────────────────────────────────────────────

export type TypographyVariant =
  | "display-hero"
  | "display-editorial"
  | "display-accent"
  | "heading-section"
  | "heading-subsection"
  | "body-lead"
  | "body-default"
  | "body-small"
  | "caption"
  | "label-ornamental";

export interface TypographyProps {
  variant: TypographyVariant;
  children: ReactNode;
  className?: string;
  as?: keyof HTMLElementTagNameMap;
  /** Gold leaf text effect for accent headings */
  goldLeaf?: boolean;
  /** Stagger letter animation on mount */
  animateLetters?: boolean;
}

const variantStyles: Record<TypographyVariant, string> = {
  "display-hero":
    "font-serif text-6xl sm:text-7xl md:text-[8.5rem] leading-[0.82] tracking-tighter font-bold",
  "display-editorial":
    "font-serif text-4xl sm:text-5xl md:text-7xl leading-[0.9] tracking-tight font-medium italic",
  "display-accent":
    "font-serif text-3xl sm:text-4xl md:text-5xl leading-tight tracking-wide uppercase",
  "heading-section":
    "font-serif text-2xl sm:text-3xl md:text-4xl leading-snug tracking-normal font-semibold",
  "heading-subsection":
    "font-serif text-xl sm:text-2xl leading-snug tracking-normal font-medium",
  "body-lead":
    "font-sans text-lg md:text-xl leading-relaxed tracking-wide font-light",
  "body-default":
    "font-sans text-base leading-relaxed tracking-normal",
  "body-small":
    "font-sans text-sm leading-relaxed tracking-wide",
  caption:
    "font-sans text-xs leading-normal tracking-[0.25em] uppercase",
  "label-ornamental":
    "font-serif text-[10px] md:text-xs tracking-[0.6em] uppercase font-bold",
};

const defaultElements: Record<TypographyVariant, keyof HTMLElementTagNameMap> = {
  "display-hero": "h1",
  "display-editorial": "h2",
  "display-accent": "h2",
  "heading-section": "h3",
  "heading-subsection": "h4",
  "body-lead": "p",
  "body-default": "p",
  "body-small": "p",
  caption: "span",
  "label-ornamental": "span",
};

/**
 * Artisanal typography component for villa websites.
 * Supports animated letters, gold leaf effects, and editorial typographic rhythm.
 */
export function VillaTypography({
  variant,
  children,
  className,
  as,
  goldLeaf = false,
  animateLetters = false,
}: TypographyProps) {
  const Tag = as ?? defaultElements[variant];

  const baseClass = clsx(
    variantStyles[variant],
    goldLeaf && "bg-gradient-to-r from-heritage-gold via-yellow-300 to-heritage-gold bg-clip-text text-transparent",
    className
  );

  if (animateLetters && typeof children === "string") {
    return (
      <Tag className={baseClass}>
        {children.split("").map((char, i) => (
          <motion.span
            key={`${char}-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: i * 0.03,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="inline-block"
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </Tag>
    );
  }

  return <Tag className={baseClass}>{children}</Tag>;
}

/**
 * Decorative drop cap for opening paragraphs — inspired by Balinese manuscripts.
 */
export interface DropCapProps {
  children: string;
  className?: string;
}

export function DropCap({ children, className }: DropCapProps) {
  if (!children || children.length === 0) return null;
  const firstChar = children[0];
  const rest = children.slice(1);

  return (
    <p className={clsx("font-sans text-base leading-relaxed", className)}>
      <span className="float-left font-serif text-6xl md:text-7xl leading-none mr-3 mt-1 text-heritage-gold">
        {firstChar}
      </span>
      {rest}
    </p>
  );
}

/**
 * Editorial pull quote — asymmetric positioning, serif italic with gold accent.
 */
export interface PullQuoteProps {
  quote: string;
  attribution?: string;
  className?: string;
}

export function PullQuote({ quote, attribution, className }: PullQuoteProps) {
  return (
    <blockquote
      className={clsx(
        "relative pl-8 md:pl-12 border-l-2 border-heritage-gold/40 py-6 my-12",
        "md:ml-[10%] md:mr-[5%]", // Asymmetric positioning
        className
      )}
    >
      <span className="absolute -top-4 left-4 font-serif text-7xl text-heritage-gold/20 leading-none select-none">
        &ldquo;
      </span>
      <p className="font-serif text-xl md:text-2xl italic leading-relaxed text-white/90">
        {quote}
      </p>
      {attribution && (
        <footer className="mt-4 font-sans text-xs tracking-[0.3em] uppercase text-heritage-gold/60">
          — {attribution}
        </footer>
      )}
    </blockquote>
  );
}

/**
 * Animated section label — used above sections as a subtle orientation marker.
 */
export interface SectionLabelProps extends Omit<HTMLMotionProps<"span">, "children"> {
  children: ReactNode;
  className?: string;
}

export function SectionLabel({ children, className, ...motionProps }: SectionLabelProps) {
  return (
    <motion.span
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        "inline-block font-sans text-[10px] md:text-xs tracking-[0.6em] uppercase",
        "text-heritage-gold/70 border-b border-heritage-gold/20 pb-1",
        className
      )}
      {...motionProps}
    >
      {children}
    </motion.span>
  );
}
