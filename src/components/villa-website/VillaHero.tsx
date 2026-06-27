'use client';

/**
 * Villa Hero Section — full-bleed imagery with parallax and elegant typography.
 *
 * Design language: Luxury, elegant, traditional Balinese aesthetic.
 * Features:
 * - Full viewport height with parallax scrolling on desktop
 * - Supports image backgrounds from the villa's hero media
 * - Animated text reveal with serif headings
 * - Scroll indicator with organic animation
 * - Graceful fallback when images fail to load
 *
 * Requirements: 8.3, 8.4 (responsive 320px+)
 */

import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { VillaContentRecord } from '@/modules/villa-sites/types';

interface VillaHeroProps {
  section: VillaContentRecord | undefined;
  villaName: string;
  accentColor: string;
}

export function VillaHero({ section, villaName, accentColor }: VillaHeroProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [imageError, setImageError] = useState(false);
  const { scrollY } = useScroll();

  // Parallax transforms — subtle movement on scroll
  const imageY = useTransform(scrollY, [0, 800], [0, 200]);
  const textY = useTransform(scrollY, [0, 600], [0, -80]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  const heroImage = section?.media?.[0]?.url;
  const heroTitle = section?.title || villaName;
  const heroSubtitle = section?.content || 'An exclusive sanctuary of luxury and tradition';

  return (
    <section
      ref={containerRef}
      id="hero"
      className="relative h-screen w-full overflow-hidden flex items-center justify-center"
      style={{ backgroundColor: 'var(--villa-primary, #1A1A1A)' }}
    >
      {/* Background Image with Parallax */}
      <motion.div
        style={{ y: imageY }}
        className="absolute inset-0 z-0"
      >
        {heroImage && !imageError ? (
          <img
            src={heroImage}
            alt={`${villaName} hero`}
            className="h-full w-full object-cover opacity-70"
            onError={() => setImageError(true)}
          />
        ) : (
          /* Fallback — elegant gradient matching design language */
          <div
            className="h-full w-full"
            style={{
              background: `linear-gradient(135deg, var(--villa-primary) 0%, var(--villa-secondary) 50%, var(--villa-primary) 100%)`,
            }}
          />
        )}

        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-10 text-center px-6 max-w-5xl pointer-events-none"
      >
        {/* Decorative Accent Line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-8 h-px w-24"
          style={{ backgroundColor: accentColor }}
        />

        {/* Villa Name / Title */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[0.9] tracking-tight mb-6"
          style={{ fontFamily: 'var(--font-villa-serif)', color: '#F5F1E6' }}
        >
          {heroTitle}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 1.0 }}
          className="text-sm sm:text-base md:text-lg text-white/50 max-w-xl mx-auto leading-relaxed tracking-wide uppercase"
          style={{ fontFamily: 'var(--font-villa-display)' }}
        >
          {heroSubtitle}
        </motion.p>

        {/* Accent Decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="mt-10 flex justify-center"
        >
          <div
            className="w-2 h-2 rotate-45"
            style={{ backgroundColor: accentColor }}
          />
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 group cursor-pointer"
        onClick={() => {
          document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
        }}
        aria-label="Scroll to content"
      >
        <span className="text-white/30 text-[9px] uppercase tracking-[0.5em] group-hover:text-white/60 transition-colors">
          Discover
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} style={{ color: accentColor }} className="opacity-60" />
        </motion.div>
      </motion.button>

      {/* Frame Accent — desktop only */}
      <div
        className="absolute inset-8 md:inset-12 border pointer-events-none hidden md:block opacity-20"
        style={{ borderColor: accentColor }}
      />
    </section>
  );
}
