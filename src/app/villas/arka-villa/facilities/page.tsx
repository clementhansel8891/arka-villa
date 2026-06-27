"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Wifi,
  Car,
  Wind,
  Bath,
  CigaretteOff,
} from "lucide-react";

const amenities = [
  {
    icon: Wifi,
    title: "High-Speed WiFi",
    description: "Complimentary fast internet throughout the property",
  },
  {
    icon: Car,
    title: "Free Parking",
    description: "Secure private parking for all guests",
  },
  {
    icon: Wind,
    title: "Air Conditioning",
    description: "Individual climate control in every room",
  },
  {
    icon: CigaretteOff,
    title: "Non-Smoking",
    description: "Smoke-free environment for your comfort",
  },
  {
    icon: Bath,
    title: "Private Bathroom",
    description: "En-suite bathrooms with rain shower and premium toiletries",
  },
];

export default function FacilitiesPage() {
  return (
    <div className="text-white pt-20 md:pt-24">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <nav className="flex items-center gap-2 text-sm text-white/40">
          <Link href="/villas/arka-villa" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-white/70">Facilities</span>
        </nav>
      </div>

      {/* Header */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-3">
            Facilities
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-light mb-4">
            Everything You Need
          </h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Arka Villa is designed for complete relaxation — from our sparkling
            pool to the lush garden walkways and private terraces.
          </p>
        </motion.div>
      </section>

      {/* ─── Swimming Pool ─── */}
      <section className="mb-16 md:mb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative w-full aspect-[21/9] md:aspect-[21/7] overflow-hidden"
        >
          <Image
            src="/images/villas/arka-villa/img-14.webp"
            alt="Arka Villa Swimming Pool"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/80 via-stone-950/30 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-6 w-full">
              <div className="max-w-lg">
                <h2 className="font-serif text-3xl md:text-4xl font-light mb-4">
                  Private Swimming Pool
                </h2>
                <p className="text-white/80 leading-relaxed">
                  Cool off in our crystal-clear pool surrounded by tropical
                  greenery. The pool area is designed as a private oasis, framed by
                  swaying palms and fragrant frangipani. Perfect for a morning swim
                  or an evening dip under the stars.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── Tropical Garden ─── */}
      <section className="max-w-7xl mx-auto px-6 mb-16 md:mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative aspect-[4/5] rounded-2xl overflow-hidden"
          >
            <Image
              src="/images/villas/arka-villa/img-17.webp"
              alt="Arka Villa Tropical Garden"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-3">
              Nature
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-light mb-6">
              Tropical Garden
            </h2>
            <p className="text-white/70 leading-relaxed text-lg mb-4">
              Our landscaped gardens are a living tapestry of Bali&apos;s botanical
              heritage. Wander stone-path walkways shaded by towering coconut palms,
              past flowering hibiscus and heliconia, to discover quiet corners
              perfect for reading or meditation.
            </p>
            <p className="text-white/50 leading-relaxed">
              The garden connects all areas of the villa — from your room to the
              pool, the terrace, and the surrounding rice fields beyond. Every step
              is accompanied by the gentle sounds of nature.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Terrace & Outdoor Living ─── */}
      <section className="max-w-7xl mx-auto px-6 mb-16 md:mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="order-2 lg:order-1"
          >
            <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-3">
              Relaxation
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-light mb-6">
              Terrace &amp; Outdoor Living
            </h2>
            <p className="text-white/70 leading-relaxed text-lg mb-4">
              The open-air terrace is the heart of Arka Villa. A generously
              proportioned space with comfortable seating and garden views, it&apos;s
              where breakfasts become unhurried affairs and evenings drift into
              stargazing.
            </p>
            <p className="text-white/50 leading-relaxed">
              Whether you choose to enjoy a cup of Balinese coffee at dawn or
              a quiet dinner by candlelight, the terrace offers a seamless
              connection between indoor comfort and outdoor beauty.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative aspect-[4/5] rounded-2xl overflow-hidden order-1 lg:order-2"
          >
            <Image
              src="/images/villas/arka-villa/img-11.webp"
              alt="Arka Villa Terrace"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
        </div>
      </section>

      {/* ─── Amenities Grid ─── */}
      <section className="py-16 md:py-24 bg-stone-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-3">
              Amenities
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-light">
              Comfort in Every Detail
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {amenities.map((amenity, i) => {
              const Icon = amenity.icon;
              return (
                <motion.div
                  key={amenity.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="bg-stone-900 border border-white/5 rounded-xl p-8 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-5">
                    <Icon size={22} className="text-amber-400" />
                  </div>
                  <h3 className="text-white font-medium mb-2">{amenity.title}</h3>
                  <p className="text-white/50 text-sm">{amenity.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
