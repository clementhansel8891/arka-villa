"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Search, MapPin, Users, Calendar } from "lucide-react";
import { useRef, useState } from "react";
import Link from "next/link";

/**
 * Agency Hero — Full-screen cinematic hero for the booking landing page.
 *
 * Features:
 * - Video background with parallax
 * - Agency branding (Arka Villa Management)
 * - Inline quick-search bar (location, dates, guests)
 * - Scroll indicator
 */
export default function AgencyHero() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const videoY = useTransform(scrollY, [0, 1000], [0, 200]);
  const textY = useTransform(scrollY, [0, 800], [0, -80]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  const [location, setLocation] = useState("");
  const [guests, setGuests] = useState("");

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden flex items-center justify-center"
    >
      {/* Video Background */}
      <motion.div style={{ y: videoY }} className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/images/hero.png"
          className="h-full w-full object-cover opacity-60"
        >
          <source src="/videos/hero-bali.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-heritage-charcoal/90 via-heritage-charcoal/40 to-heritage-charcoal" />
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-10 text-center px-6 max-w-5xl w-full"
      >
        {/* Agency Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="mb-6"
        >
          <span className="text-heritage-gold uppercase tracking-[0.5em] text-[10px] md:text-xs font-bold border border-heritage-gold/30 px-5 py-2 bg-heritage-charcoal/50 backdrop-blur-sm">
            Luxury Villa Collection · Bali
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl lg:text-[6.5rem] font-serif text-white leading-[0.85] tracking-tight mb-6"
        >
          Find Your
          <span className="block italic text-heritage-gold mt-2">Perfect Villa</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 1.2 }}
          className="text-white/50 text-sm md:text-base max-w-lg mx-auto mb-12 tracking-wide"
        >
          Handpicked luxury villas across Bali. Book directly with
          the best rates, no middlemen.
        </motion.p>

        {/* Quick Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 p-2 md:p-3 flex flex-col md:flex-row items-stretch gap-2 md:gap-0 max-w-3xl mx-auto"
        >
          {/* Location */}
          <div className="flex items-center gap-2 px-4 py-3 flex-1 border-b md:border-b-0 md:border-r border-white/10">
            <MapPin size={16} className="text-heritage-gold shrink-0" />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-transparent text-white text-sm w-full focus:outline-none appearance-none cursor-pointer"
              aria-label="Select location"
            >
              <option value="" className="bg-heritage-charcoal">All Locations</option>
              <option value="ubud" className="bg-heritage-charcoal">Ubud</option>
              <option value="seminyak" className="bg-heritage-charcoal">Seminyak</option>
              <option value="canggu" className="bg-heritage-charcoal">Canggu</option>
              <option value="uluwatu" className="bg-heritage-charcoal">Uluwatu</option>
              <option value="nusa-dua" className="bg-heritage-charcoal">Nusa Dua</option>
            </select>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-2 px-4 py-3 flex-1 border-b md:border-b-0 md:border-r border-white/10">
            <Calendar size={16} className="text-heritage-gold shrink-0" />
            <input
              type="text"
              placeholder="Check-in — Check-out"
              className="bg-transparent text-white text-sm w-full focus:outline-none placeholder:text-white/40"
              aria-label="Select dates"
              onFocus={(e) => (e.target.type = "date")}
            />
          </div>

          {/* Guests */}
          <div className="flex items-center gap-2 px-4 py-3 flex-1">
            <Users size={16} className="text-heritage-gold shrink-0" />
            <select
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="bg-transparent text-white text-sm w-full focus:outline-none appearance-none cursor-pointer"
              aria-label="Number of guests"
            >
              <option value="" className="bg-heritage-charcoal">Guests</option>
              <option value="2" className="bg-heritage-charcoal">2 Guests</option>
              <option value="4" className="bg-heritage-charcoal">4 Guests</option>
              <option value="6" className="bg-heritage-charcoal">6 Guests</option>
              <option value="8" className="bg-heritage-charcoal">8+ Guests</option>
            </select>
          </div>

          {/* Search Button */}
          <Link
            href="#villas"
            className="flex items-center justify-center gap-2 bg-heritage-gold text-heritage-charcoal px-6 py-3 font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors shrink-0"
          >
            <Search size={16} />
            <span className="hidden md:inline">Search</span>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.2 }}
          className="flex items-center justify-center gap-8 md:gap-12 mt-10"
        >
          {[
            { value: "12+", label: "Luxury Villas" },
            { value: "4.9", label: "Guest Rating" },
            { value: "100%", label: "Direct Booking" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-heritage-gold font-serif text-xl md:text-2xl">{stat.value}</p>
              <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <span className="text-white/20 text-[9px] uppercase tracking-[0.5em]">Explore Villas</span>
        <div className="w-px h-12 bg-gradient-to-b from-heritage-gold/50 to-transparent" />
      </motion.div>
    </section>
  );
}
