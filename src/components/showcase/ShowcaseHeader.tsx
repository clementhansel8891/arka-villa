'use client';

import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';

/**
 * Agency branding header for the public showcase page.
 * Displays the agency name, logo, and a brief tagline.
 *
 * Requirements: 9.5 (publicly accessible), 9.1 (portfolio display)
 */
export default function ShowcaseHeader() {
  return (
    <header className="relative w-full overflow-hidden bg-heritage-charcoal py-16 md:py-24">
      {/* Background pattern */}
      <div className="absolute inset-0 heritage-pattern opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-heritage-charcoal/80 to-heritage-charcoal" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <Building2 size={28} className="text-heritage-gold" />
          <span className="text-heritage-gold uppercase tracking-[0.35em] text-xs font-bold">
            Arka Villa Management
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl md:text-6xl font-serif text-white mb-6 leading-tight"
        >
          Our <span className="italic text-heritage-gold">Curated</span> Collection
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-white/60 font-light text-sm md:text-base max-w-xl mx-auto leading-relaxed"
        >
          Discover our portfolio of luxury villas across Bali, each handpicked
          and managed with the highest standards of hospitality.
        </motion.p>
      </div>
    </header>
  );
}
