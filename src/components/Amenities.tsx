"use client";

import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import { VILLA_DETAILS } from "@/constants/mockData";

export default function Amenities() {
  return (
    <section id="amenities" className="py-24 px-6 bg-heritage-charcoal text-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-serif mb-4">Refined Indulgences</h2>
          <p className="text-heritage-gold/60 uppercase tracking-[0.2em] text-xs">Exclusively for our guests</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
          {VILLA_DETAILS.amenities.map((amenity, index) => {
            const Icon = (Icons as any)[amenity.icon];
            return (
              <motion.div
                key={amenity.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group flex flex-col items-center p-8 border border-white/5 hover:border-heritage-gold/30 transition-all duration-500 bg-white/[0.02]"
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 border border-heritage-gold/20 group-hover:bg-heritage-gold transition-colors duration-500">
                  {Icon && <Icon className="text-heritage-gold group-hover:text-heritage-charcoal transition-colors duration-500" size={24} />}
                </div>
                <h3 className="text-lg font-serif tracking-wide">{amenity.name}</h3>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
