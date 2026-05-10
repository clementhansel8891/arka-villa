"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import { VILLA_DETAILS } from "@/constants/mockData";
import Image from "next/image";

export default function Amenities() {
  const [selected, setSelected] = useState<typeof VILLA_DETAILS.amenities[0] | null>(null);

  return (
    <section id="amenities" className="py-32 px-6 bg-[#0A0A0A] text-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-serif mb-6"
          >
            Refined Indulgences
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-heritage-gold uppercase tracking-[0.4em] text-xs font-bold"
          >
            Exclusively for our guests
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-10">
          {VILLA_DETAILS.amenities.map((amenity, index) => {
            const Icon = (Icons as any)[amenity.icon];
            return (
              <motion.div
                key={amenity.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                onClick={() => setSelected(amenity)}
                className="group relative cursor-pointer flex flex-col items-center justify-center p-10 border border-white/5 hover:border-heritage-gold/40 transition-all duration-700 bg-white/[0.01] hover:bg-white/[0.03] overflow-hidden"
              >
                {/* Decorative background number or icon */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700 pointer-events-none">
                  {Icon && <Icon size={120} />}
                </div>

                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-8 border border-heritage-gold/20 group-hover:border-heritage-gold group-hover:scale-110 transition-all duration-700 relative z-10">
                  {Icon && <Icon className="text-heritage-gold group-hover:text-white transition-colors duration-700" size={28} />}
                </div>
                <h3 className="text-xl font-serif tracking-widest uppercase text-white/80 group-hover:text-heritage-gold transition-colors duration-700 relative z-10">
                  {amenity.name}
                </h3>
                <div className="mt-4 h-px w-0 group-hover:w-12 bg-heritage-gold transition-all duration-700" />
                <span className="mt-4 text-[10px] uppercase tracking-widest text-white/20 group-hover:text-white/40 transition-colors">Details</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black/95 z-[60] backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-[#0E0E0E] w-full max-w-5xl border border-white/10 overflow-hidden shadow-2xl pointer-events-auto grid md:grid-cols-2">
                {/* Image side */}
                <div className="relative h-64 md:h-auto overflow-hidden">
                  <Image 
                    src={selected.image || "/images/hero.png"} 
                    alt={selected.name} 
                    fill 
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E0E] via-transparent to-transparent md:bg-gradient-to-r" />
                </div>
                
                {/* Content side */}
                <div className="p-8 md:p-16 flex flex-col justify-center relative">
                  <button 
                    onClick={() => setSelected(null)}
                    className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
                  >
                    <Icons.X size={24} />
                  </button>

                  <span className="text-heritage-gold uppercase tracking-[0.4em] text-[10px] font-bold mb-6 block">Premium Indulgence</span>
                  <h3 className="text-4xl md:text-5xl font-serif text-white mb-8">{selected.name}</h3>
                  <div className="w-16 h-px bg-heritage-gold/50 mb-8" />
                  <p className="text-white/60 text-lg font-light leading-relaxed mb-10">
                    {selected.description}
                  </p>
                  
                  <div className="flex items-center gap-6">
                    <button className="bg-heritage-gold text-heritage-charcoal px-8 py-3 uppercase tracking-widest text-[11px] font-bold hover:bg-white transition-all duration-300">
                      Enquire with Butler
                    </button>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
