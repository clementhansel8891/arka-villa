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
  const videoY = useTransform(scrollY, [0, 1000], [0, 400]);
  const textY = useTransform(scrollY, [0, 1000], [0, -150]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.error("Video autoplay failed:", error);
      });
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
          className={`h-full w-full object-cover transition-opacity duration-1000 ${videoLoaded ? 'opacity-70' : 'opacity-0'}`}
        >
          <source src={VILLA_DETAILS.heroVideo} type="video/mp4" />
        </video>
        
        {/* Cinematic Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-heritage-charcoal/90 via-transparent to-heritage-charcoal pointer-events-none" />
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />
      </motion.div>

      {/* Content */}
      <motion.div 
        style={{ y: textY, opacity }}
        className="relative z-10 text-center px-6 max-w-5xl pointer-events-none"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mb-6"
        >
          <span className="text-heritage-gold uppercase tracking-[0.5em] text-[10px] md:text-xs font-bold bg-white/5 backdrop-blur-md px-4 py-2 border border-white/10 rounded-full">
            {VILLA_DETAILS.location}
          </span>
        </motion.div>
        
        <h1 className="text-5xl md:text-[7.5rem] font-serif text-white mb-8 leading-[0.85] tracking-tighter">
          <motion.span
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.5, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="block"
          >
            Where Heritage
          </motion.span>
          <motion.span
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.5, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="block italic text-heritage-gold mt-2"
          >
            Meets Horizon
          </motion.span>
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 1.6 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="h-px w-24 bg-heritage-gold/50" />
          <p className="text-white/40 font-light text-sm md:text-base max-w-md mx-auto leading-relaxed tracking-[0.2em] uppercase">
            An ultra-exclusive luxury sanctuary <br className="hidden md:block" /> 
            preserving the soul of Ubud.
          </p>
        </motion.div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.8 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 group cursor-pointer pointer-events-auto"
        onClick={() => {
          document.getElementById('story')?.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <span className="text-white/20 text-[9px] uppercase tracking-[0.6em] group-hover:text-heritage-gold transition-colors duration-500">Discover More</span>
        <div className="relative w-px h-20 bg-white/10 overflow-hidden">
          <motion.div 
            animate={{ y: [-80, 80] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-heritage-gold to-transparent"
          />
        </div>
      </motion.div>

      {/* Cinematic corner accents */}
      <div className="absolute top-10 left-10 w-20 h-20 border-t border-l border-white/5 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-b border-r border-white/5 pointer-events-none" />
    </section>
  );
}
