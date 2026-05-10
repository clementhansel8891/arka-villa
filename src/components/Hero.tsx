"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { VILLA_DETAILS } from "@/constants/mockData";
import { useRef, useEffect, useState } from "react";

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const { scrollY } = useScroll();
  
  // Parallax effects
  const videoY = useTransform(scrollY, [0, 1000], [0, 300]);
  const textY = useTransform(scrollY, [0, 1000], [0, -100]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    // Force play on mount to ensure browsers don't block it
    if (videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented
          console.log("Autoplay prevented, retrying...");
        });
      }
    }
  }, []);

  return (
    <section ref={containerRef} className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-heritage-charcoal">
      {/* Background Video */}
      <motion.div style={{ y: videoY }} className="absolute inset-0 z-0 bg-heritage-charcoal">
        <video
          ref={videoRef}
          key={VILLA_DETAILS.heroVideo}
          autoPlay
          muted
          loop
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          poster="/images/hero.png"
          className={`h-full w-full object-cover transition-opacity duration-1500 ${videoLoaded ? 'opacity-85' : 'opacity-0'}`}
        >
          <source src={VILLA_DETAILS.heroVideo} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-heritage-charcoal/95 via-transparent to-heritage-charcoal pointer-events-none" />
        <div className="absolute inset-0 bg-black/20 pointer-events-none" />
      </motion.div>

      {/* Content */}
      <motion.div 
        style={{ y: textY, opacity }}
        className="relative z-10 text-center px-6 max-w-7xl pointer-events-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="mb-8"
        >
          <span className="text-heritage-gold uppercase tracking-[0.6em] text-[10px] md:text-xs font-bold px-6 py-2.5 border border-heritage-gold/30 rounded-none bg-heritage-charcoal/40 backdrop-blur-md">
            {VILLA_DETAILS.location}
          </span>
        </motion.div>
        
        <h1 className="text-6xl md:text-[8.5rem] font-serif text-white mb-10 leading-[0.8] tracking-tighter">
          <motion.span
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            Where Heritage
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.8, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
            className="block italic text-heritage-gold mt-4"
          >
            Meets Horizon
          </motion.span>
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.5, delay: 1.8 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="h-px w-32 bg-heritage-gold/40" />
          <p className="text-white/50 font-light text-sm md:text-base max-w-lg mx-auto leading-relaxed tracking-[0.25em] uppercase">
            Experience the soul of Bali <br className="hidden md:block" /> 
            in an ultra-exclusive sanctuary.
          </p>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 3 }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-5 group cursor-pointer pointer-events-auto"
        onClick={() => {
          document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <span className="text-white/30 text-[9px] uppercase tracking-[0.7em] group-hover:text-heritage-gold transition-colors duration-500">The Experience</span>
        <div className="relative w-px h-24 bg-white/5 overflow-hidden">
          <motion.div 
            animate={{ y: [-96, 96] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-heritage-gold to-transparent"
          />
        </div>
      </motion.div>

      {/* Frame accents */}
      <div className="absolute inset-12 border border-white/5 pointer-events-none hidden md:block" />
    </section>
  );
}
