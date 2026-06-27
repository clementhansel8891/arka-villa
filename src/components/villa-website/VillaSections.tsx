'use client';

/**
 * Villa Sections — renders all content sections dynamically.
 *
 * Each section type (about, amenities, gallery, location, policies)
 * has a distinct visual treatment following the bespoke design language.
 * Sections are rendered in sortOrder and animate into view on scroll.
 *
 * Design language: Luxury, warm earth tones, serif headings,
 * generous whitespace, organic scroll reveals, dark backgrounds.
 *
 * Requirements: 8.3, 8.4, 8.6
 */

import { motion } from 'framer-motion';
import { MapPin, Leaf, Shield } from 'lucide-react';
import type { VillaContentRecord } from '@/modules/villa-sites/types';

interface VillaSectionsProps {
  sections: VillaContentRecord[];
  accentColor: string;
}

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
};

export function VillaSections({ sections, accentColor }: VillaSectionsProps) {
  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="villa-sections">
      {sorted.map((section) => {
        switch (section.section) {
          case 'about':
            return <AboutSection key={section.id} section={section} accentColor={accentColor} />;
          case 'amenities':
            return <AmenitiesSection key={section.id} section={section} accentColor={accentColor} />;
          case 'gallery':
            return <GallerySection key={section.id} section={section} accentColor={accentColor} />;
          case 'location':
            return <LocationSection key={section.id} section={section} accentColor={accentColor} />;
          case 'policies':
            return <PoliciesSection key={section.id} section={section} accentColor={accentColor} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

// ─── About Section ────────────────────────────────────────────────────────────

function AboutSection({
  section,
  accentColor,
}: {
  section: VillaContentRecord;
  accentColor: string;
}) {
  const image = section.media?.[0]?.url;

  return (
    <section id="about" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
        >
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 max-w-12" style={{ backgroundColor: accentColor }} />
              <span
                className="text-[10px] uppercase tracking-[0.3em]"
                style={{ color: accentColor }}
              >
                {section.title || 'Our Story'}
              </span>
            </div>

            <h2
              className="text-3xl sm:text-4xl md:text-5xl leading-tight mb-8"
              style={{ fontFamily: 'var(--font-villa-serif)', color: 'var(--villa-text)' }}
            >
              {section.title || 'A Sanctuary of Timeless Elegance'}
            </h2>

            <div
              className="text-base md:text-lg leading-relaxed space-y-4"
              style={{ color: 'var(--villa-text-muted)' }}
            >
              {section.content.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Image */}
          {image && (
            <div className="order-1 lg:order-2 relative">
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={image}
                  alt={section.media[0]?.alt || section.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Decorative frame offset */}
              <div
                className="absolute -bottom-4 -right-4 w-full h-full border pointer-events-none hidden lg:block -z-10"
                style={{ borderColor: `${accentColor}33` }}
              />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Amenities Section ────────────────────────────────────────────────────────

function AmenitiesSection({
  section,
  accentColor,
}: {
  section: VillaContentRecord;
  accentColor: string;
}) {
  // Parse amenities from content (newline-separated list)
  const amenities = section.content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .slice(0, 100); // Max 100 items per requirements

  return (
    <section id="amenities" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {/* Section Header */}
          <div className="text-center mb-16">
            <span
              className="text-[10px] uppercase tracking-[0.4em] block mb-4"
              style={{ color: accentColor }}
            >
              Curated for You
            </span>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl"
              style={{ fontFamily: 'var(--font-villa-serif)', color: 'var(--villa-text)' }}
            >
              {section.title || 'Amenities & Experiences'}
            </h2>
          </div>

          {/* Amenities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {amenities.map((amenity, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.5 }}
                className="flex items-start gap-4 p-5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <Leaf size={16} style={{ color: accentColor }} className="mt-0.5 shrink-0" />
                <span className="text-sm" style={{ color: 'var(--villa-text-muted)' }}>
                  {amenity.replace(/^[-•*]\s*/, '')}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Gallery Section ──────────────────────────────────────────────────────────

function GallerySection({
  section,
  accentColor,
}: {
  section: VillaContentRecord;
  accentColor: string;
}) {
  const images = section.media || [];

  if (images.length === 0) return null;

  return (
    <section id="gallery" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {/* Section Header */}
          <div className="text-center mb-16">
            <span
              className="text-[10px] uppercase tracking-[0.4em] block mb-4"
              style={{ color: accentColor }}
            >
              Visual Journey
            </span>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl"
              style={{ fontFamily: 'var(--font-villa-serif)', color: 'var(--villa-text)' }}
            >
              {section.title || 'Gallery'}
            </h2>
          </div>

          {/* Masonry-style Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {images.map((image, idx) => (
              <motion.div
                key={image.id || idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.6 }}
                className={
                  idx === 0
                    ? 'sm:col-span-2 sm:row-span-2 aspect-[4/3]'
                    : 'aspect-square'
                }
              >
                <div className="relative w-full h-full overflow-hidden group">
                  <img
                    src={image.url}
                    alt={image.alt || `Gallery image ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Location Section ─────────────────────────────────────────────────────────

function LocationSection({
  section,
  accentColor,
}: {
  section: VillaContentRecord;
  accentColor: string;
}) {
  return (
    <section id="location" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {/* Section Header */}
          <div className="text-center mb-12">
            <span
              className="text-[10px] uppercase tracking-[0.4em] block mb-4"
              style={{ color: accentColor }}
            >
              Discover
            </span>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl mb-6"
              style={{ fontFamily: 'var(--font-villa-serif)', color: 'var(--villa-text)' }}
            >
              {section.title || 'Location'}
            </h2>
          </div>

          {/* Location Content */}
          <div className="flex flex-col md:flex-row items-start gap-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={18} style={{ color: accentColor }} />
                <span className="text-sm uppercase tracking-wider" style={{ color: accentColor }}>
                  How to Find Us
                </span>
              </div>
              <div
                className="text-base md:text-lg leading-relaxed space-y-4"
                style={{ color: 'var(--villa-text-muted)' }}
              >
                {section.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Location Image */}
            {section.media?.[0]?.url && (
              <div className="flex-1 w-full">
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={section.media[0].url}
                    alt={section.media[0].alt || 'Villa location'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Policies Section ─────────────────────────────────────────────────────────

function PoliciesSection({
  section,
  accentColor,
}: {
  section: VillaContentRecord;
  accentColor: string;
}) {
  const policies = section.content
    .split('\n')
    .filter((line) => line.trim().length > 0);

  return (
    <section id="policies" className="py-20 md:py-32 px-4 sm:px-6 lg:px-8 border-t border-white/5">
      <div className="max-w-4xl mx-auto">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <div className="flex items-center gap-3 mb-8">
            <Shield size={18} style={{ color: accentColor }} />
            <h2
              className="text-2xl md:text-3xl"
              style={{ fontFamily: 'var(--font-villa-serif)', color: 'var(--villa-text)' }}
            >
              {section.title || 'House Policies'}
            </h2>
          </div>

          <ul className="space-y-3">
            {policies.map((policy, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-sm md:text-base"
                style={{ color: 'var(--villa-text-muted)' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                  style={{ backgroundColor: accentColor }}
                />
                {policy.replace(/^[-•*]\s*/, '')}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
