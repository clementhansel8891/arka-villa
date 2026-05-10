"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function VillaHero() {
  return (
    <section className="relative h-[80vh] w-full overflow-hidden flex items-end">
      {/* Background — rich gradient standing in for the image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&q=80')`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-heritage-charcoal via-heritage-charcoal/30 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-6 pb-20 w-full">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-heritage-gold uppercase tracking-[0.35em] text-xs mb-4 font-semibold"
        >
          The Sanctuary Collection
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="text-5xl md:text-7xl font-serif text-white mb-6 leading-tight max-w-3xl"
        >
          Spaces That Tell <br />
          <span className="italic text-heritage-gold">Ancient Stories</span>
        </motion.h1>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex items-center gap-6"
        >
          <div className="h-px w-12 bg-heritage-gold/50" />
          <p className="text-white/60 font-light text-sm tracking-wide max-w-md">
            Each suite is a living canvas — hand-carved by master Balinese craftsmen across generations.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
