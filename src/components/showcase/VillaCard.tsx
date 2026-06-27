'use client';

import { motion } from 'framer-motion';
import { Star, MapPin, Users, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { ShowcaseVilla } from './types';

/**
 * Individual villa card for the showcase grid.
 * Displays: photo, description (max 200 chars), link to Villa_Website,
 * aggregate review score (1.0-5.0) or "No reviews" indicator.
 *
 * Requirements: 9.1, 9.4, 9.6
 */
interface VillaCardProps {
  villa: ShowcaseVilla;
  index: number;
}

export default function VillaCard({ villa, index }: VillaCardProps) {
  const truncatedDescription =
    villa.description.length > 200
      ? villa.description.slice(0, 197) + '...'
      : villa.description;

  return (
    <motion.article
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group bg-heritage-charcoal rounded-lg overflow-hidden border border-heritage-gold/10 hover:border-heritage-gold/30 transition-all duration-300"
    >
      {/* Photo */}
      <div className="relative h-56 md:h-64 overflow-hidden">
        <div
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
          style={{
            backgroundImage: `url('${villa.photo}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-heritage-charcoal/80 to-transparent" />

        {/* Price badge */}
        <div className="absolute top-4 right-4 bg-heritage-charcoal/80 backdrop-blur-sm px-3 py-1.5 rounded">
          <span className="text-heritage-gold text-xs font-bold">
            ${villa.pricePerNight}
          </span>
          <span className="text-white/50 text-[10px] ml-1">/night</span>
        </div>

        {/* Location */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
          <MapPin size={12} className="text-heritage-gold" />
          <span className="text-white/80 text-xs">{villa.location}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 md:p-6 flex flex-col gap-4">
        {/* Title and review score */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-serif text-white leading-snug group-hover:text-heritage-gold transition-colors">
            {villa.name}
          </h3>
          <ReviewBadge score={villa.reviewScore} count={villa.reviewCount} />
        </div>

        {/* Description */}
        <p className="text-white/50 text-sm font-light leading-relaxed">
          {truncatedDescription}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-4 text-white/40 text-xs">
          <div className="flex items-center gap-1.5">
            <Users size={12} />
            <span>{villa.guestCapacity} guests</span>
          </div>
          {villa.amenities.length > 0 && (
            <span className="text-white/20">·</span>
          )}
          {villa.amenities.slice(0, 3).map((amenity) => (
            <span
              key={amenity}
              className="bg-heritage-gold/10 text-heritage-gold/80 px-2 py-0.5 rounded text-[10px]"
            >
              {amenity}
            </span>
          ))}
          {villa.amenities.length > 3 && (
            <span className="text-heritage-gold/60 text-[10px]">
              +{villa.amenities.length - 3}
            </span>
          )}
        </div>

        {/* Link to Villa Website */}
        <Link
          href={`/villas/${villa.slug}`}
          className="mt-2 inline-flex items-center gap-2 text-heritage-gold text-xs uppercase tracking-widest font-bold hover:text-white transition-colors"
        >
          Visit Villa
          <ExternalLink size={12} />
        </Link>
      </div>
    </motion.article>
  );
}

function ReviewBadge({
  score,
  count,
}: {
  score: number | null;
  count: number;
}) {
  if (score === null || count === 0) {
    return (
      <span className="text-white/30 text-[10px] uppercase tracking-wider whitespace-nowrap">
        No reviews
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <Star size={12} className="text-heritage-gold fill-heritage-gold" />
      <span className="text-white text-sm font-medium">{score.toFixed(1)}</span>
      <span className="text-white/30 text-[10px]">({count})</span>
    </div>
  );
}
