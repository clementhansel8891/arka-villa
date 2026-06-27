"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, Users, ArrowRight, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

/**
 * Villa Showcase Section — Browse all managed villas with filtering.
 *
 * This is the core section where customers discover villas,
 * see pricing, reviews, and navigate to individual villa pages.
 */

// Mock data — in production this comes from the API
const MOCK_VILLAS = [
  {
    id: "1",
    slug: "arka-villa",
    name: "Arka Villa",
    description: "Ultra-luxury sanctuary nestled in the heart of Ubud with infinity pool and rice terrace views.",
    photo: "/images/villas/arka-villa/front-view.webp",
    location: "Ubud",
    guestCapacity: 8,
    pricePerNight: 450,
    amenities: ["Pool", "Spa", "WiFi", "Garden", "Kitchen"],
    reviewScore: 4.9,
    reviewCount: 127,
  },
  {
    id: "2",
    slug: "villa-serenity",
    name: "Villa Serenity",
    description: "Beachfront paradise with private beach access and sunset views over the Indian Ocean.",
    photo: "/images/suite.png",
    location: "Seminyak",
    guestCapacity: 6,
    pricePerNight: 380,
    amenities: ["Pool", "Beach Access", "WiFi", "Gym"],
    reviewScore: 4.8,
    reviewCount: 94,
  },
  {
    id: "3",
    slug: "villa-harmony",
    name: "Villa Harmony",
    description: "Clifftop retreat with panoramic ocean views, perfect for intimate getaways and honeymooners.",
    photo: "/images/jungle.png",
    location: "Uluwatu",
    guestCapacity: 4,
    pricePerNight: 320,
    amenities: ["Pool", "WiFi", "Spa", "Ocean View"],
    reviewScore: 4.7,
    reviewCount: 68,
  },
  {
    id: "4",
    slug: "villa-tropicana",
    name: "Villa Tropicana",
    description: "Lush tropical hideaway surrounded by jungle canopy with open-air living and natural stone bath.",
    photo: "/images/hero.png",
    location: "Canggu",
    guestCapacity: 10,
    pricePerNight: 520,
    amenities: ["Pool", "Garden", "WiFi", "Kitchen", "Yoga Deck"],
    reviewScore: 4.9,
    reviewCount: 156,
  },
  {
    id: "5",
    slug: "villa-coral",
    name: "Villa Coral",
    description: "Modern luxury meets Balinese tradition with stunning coral stone architecture and koi ponds.",
    photo: "/images/suite.png",
    location: "Nusa Dua",
    guestCapacity: 12,
    pricePerNight: 680,
    amenities: ["Pool", "Beach Access", "Spa", "Gym", "Tennis"],
    reviewScore: 5.0,
    reviewCount: 42,
  },
  {
    id: "6",
    slug: "villa-jade",
    name: "Villa Jade",
    description: "Secluded rice field villa with traditional joglo architecture and world-class Balinese cuisine.",
    photo: "/images/jungle.png",
    location: "Ubud",
    guestCapacity: 6,
    pricePerNight: 290,
    amenities: ["Pool", "Garden", "WiFi", "Kitchen"],
    reviewScore: 4.6,
    reviewCount: 83,
  },
];

const LOCATIONS = ["All", "Ubud", "Seminyak", "Canggu", "Uluwatu", "Nusa Dua"];

export default function VillaShowcase() {
  const [activeLocation, setActiveLocation] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minGuests, setMinGuests] = useState<number | null>(null);

  const filteredVillas = useMemo(() => {
    return MOCK_VILLAS.filter((villa) => {
      if (activeLocation !== "All" && villa.location !== activeLocation) return false;
      if (maxPrice && villa.pricePerNight > maxPrice) return false;
      if (minGuests && villa.guestCapacity < minGuests) return false;
      return true;
    });
  }, [activeLocation, maxPrice, minGuests]);

  const clearFilters = () => {
    setActiveLocation("All");
    setMaxPrice(null);
    setMinGuests(null);
  };

  const hasActiveFilters = activeLocation !== "All" || maxPrice || minGuests;

  return (
    <section id="villas" className="py-24 px-6 bg-heritage-charcoal">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-heritage-gold text-[10px] uppercase tracking-[0.5em] font-bold"
            >
              Our Collection
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-serif text-white mt-3"
            >
              Luxury Villas in Bali
            </motion.h2>
            <p className="text-white/40 mt-3 max-w-md">
              Each villa is handpicked for its unique character, exceptional service, and prime location.
            </p>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-heritage-gold/30 text-heritage-gold text-xs uppercase tracking-widest hover:bg-heritage-gold/10 transition-colors"
          >
            <SlidersHorizontal size={14} />
            {showFilters ? "Hide Filters" : "Filter"}
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-heritage-gold" />
            )}
          </button>
        </div>

        {/* Location Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {LOCATIONS.map((loc) => (
            <button
              key={loc}
              onClick={() => setActiveLocation(loc)}
              className={`px-4 py-2 text-xs uppercase tracking-widest transition-all duration-200 ${
                activeLocation === loc
                  ? "bg-heritage-gold text-heritage-charcoal font-bold"
                  : "text-white/50 hover:text-white border border-white/10 hover:border-white/30"
              }`}
            >
              {loc}
            </button>
          ))}
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 p-4 border border-white/10 bg-white/[0.02] flex flex-wrap items-end gap-4"
          >
            <div className="flex flex-col gap-1">
              <label className="text-white/40 text-[10px] uppercase tracking-wider">Max Price/Night</label>
              <select
                value={maxPrice ?? ""}
                onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                className="bg-heritage-charcoal border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-heritage-gold/50"
              >
                <option value="">Any</option>
                <option value="300">Under $300</option>
                <option value="500">Under $500</option>
                <option value="700">Under $700</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-white/40 text-[10px] uppercase tracking-wider">Min Guests</label>
              <select
                value={minGuests ?? ""}
                onChange={(e) => setMinGuests(e.target.value ? Number(e.target.value) : null)}
                className="bg-heritage-charcoal border border-white/10 text-white text-sm px-3 py-2 focus:outline-none focus:border-heritage-gold/50"
              >
                <option value="">Any</option>
                <option value="4">4+</option>
                <option value="6">6+</option>
                <option value="8">8+</option>
                <option value="10">10+</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-heritage-gold/70 text-xs hover:text-heritage-gold"
              >
                <X size={12} /> Clear all
              </button>
            )}
          </motion.div>
        )}

        {/* Villa Grid */}
        {filteredVillas.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVillas.map((villa, i) => (
              <motion.article
                key={villa.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="group"
              >
                <Link href={`/villas/${villa.slug}`} className="block">
                  {/* Image */}
                  <div className="relative h-72 overflow-hidden mb-4">
                    <Image
                      src={villa.photo}
                      alt={villa.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-heritage-charcoal/80 via-transparent to-transparent" />

                    {/* Price Badge */}
                    <div className="absolute top-4 right-4 bg-heritage-charcoal/80 backdrop-blur-sm px-3 py-1.5">
                      <span className="text-heritage-gold text-sm font-bold">${villa.pricePerNight}</span>
                      <span className="text-white/40 text-[10px] ml-1">/night</span>
                    </div>

                    {/* Location */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
                      <MapPin size={12} className="text-heritage-gold" />
                      <span className="text-white/80 text-xs">{villa.location}</span>
                    </div>

                    {/* Rating */}
                    <div className="absolute bottom-4 right-4 flex items-center gap-1">
                      <Star size={12} className="text-heritage-gold fill-heritage-gold" />
                      <span className="text-white text-xs font-medium">{villa.reviewScore}</span>
                      <span className="text-white/40 text-[10px]">({villa.reviewCount})</span>
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-serif text-white group-hover:text-heritage-gold transition-colors">
                    {villa.name}
                  </h3>
                  <p className="text-white/40 text-sm mt-1 line-clamp-2">{villa.description}</p>

                  {/* Meta */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 text-white/30 text-xs">
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {villa.guestCapacity}
                      </span>
                      <span>{villa.amenities.slice(0, 3).join(" · ")}</span>
                    </div>
                    <span className="text-heritage-gold text-xs uppercase tracking-widest font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      View <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-white/40 text-sm mb-4">No villas match your filters.</p>
            <button onClick={clearFilters} className="text-heritage-gold text-xs uppercase tracking-widest">
              Reset Filters
            </button>
          </div>
        )}

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link
            href="/#villas"
            className="inline-flex items-center gap-2 text-heritage-gold text-xs uppercase tracking-[0.3em] font-bold hover:text-white transition-colors"
          >
            View Full Collection
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
