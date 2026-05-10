"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { VILLA_DETAILS } from "@/constants/mockData";

export default function Hero() {
  return (
    <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Background Video/Image */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover opacity-60"
        >
          <source src={VILLA_DETAILS.heroVideo} type="video/mp4" />
        </video>
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-heritage-charcoal/80 via-transparent to-heritage-charcoal"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-heritage-gold uppercase tracking-[0.3em] text-sm mb-6 font-semibold"
        >
          Exclusive {VILLA_DETAILS.location}
        </motion.p>
        
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-8xl font-serif text-white mb-8 leading-tight tracking-tight"
        >
          Where Heritage <br /> 
          <span className="italic text-heritage-gold">Meets Horizon</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-white/40 text-[10px] uppercase tracking-[0.5em]">Discover More</span>
          <ChevronDown className="text-heritage-gold animate-bounce" size={20} />
        </motion.div>
      </div>
    </section>
  );
}
