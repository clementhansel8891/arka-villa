"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { VILLA_DETAILS } from "@/constants/mockData";
import { useRef } from "react";

export default function Hero() {
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  
  // Parallax effects
  const videoY = useTransform(scrollY, [0, 1000], [0, 400]);
  const textY = useTransform(scrollY, [0, 1000], [0, -150]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  return (
    <section ref={containerRef} className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-heritage-charcoal">
      {/* Background Video */}
      <motion.div style={{ y: videoY }} className="absolute inset-0 z-0">
        <motion.video
          key={VILLA_DETAILS.heroVideo}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          autoPlay
          muted
          loop
          playsInline
          src={VILLA_DETAILS.heroVideo}
          className="h-full w-full object-cover"
        />
        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-heritage-charcoal/90 via-transparent to-heritage-charcoal"></div>
        <div className="absolute inset-0 bg-black/20"></div>
      </motion.div>

      {/* Content */}
      <motion.div 
        style={{ y: textY, opacity }}
        className="relative z-10 text-center px-6 max-w-5xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mb-6"
        >
          <span className="text-heritage-gold uppercase tracking-[0.5em] text-[10px] md:text-xs font-bold bg-white/5 backdrop-blur-sm px-4 py-2 border border-white/10 rounded-full">
            {VILLA_DETAILS.location}
          </span>
        </motion.div>
        
        <h1 className="text-5xl md:text-[7rem] font-serif text-white mb-8 leading-[0.9] tracking-tighter">
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            Where Heritage
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="block italic text-heritage-gold mt-2"
          >
            Meets Horizon
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 1.4 }}
          className="text-white/40 font-light text-sm md:text-base max-w-md mx-auto leading-relaxed tracking-wide uppercase"
        >
          An ultra-exclusive luxury sanctuary <br className="hidden md:block" /> 
          preserving the soul of Ubud.
        </motion.p>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.5 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 group cursor-pointer"
        onClick={() => {
          document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <span className="text-white/20 text-[9px] uppercase tracking-[0.6em] group-hover:text-heritage-gold transition-colors duration-500">Discover More</span>
        <div className="relative w-px h-16 bg-white/10 overflow-hidden">
          <motion.div 
            animate={{ y: [0, 64] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-0 w-full h-1/2 bg-heritage-gold"
          />
        </div>
      </motion.div>

      {/* Decorative side lines */}
      <div className="absolute left-10 top-1/2 -translate-y-1/2 w-px h-32 bg-white/5 hidden xl:block" />
      <div className="absolute right-10 top-1/2 -translate-y-1/2 w-px h-32 bg-white/5 hidden xl:block" />
    </section>
  );
}
