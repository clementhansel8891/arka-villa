"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { VILLA_DETAILS } from "@/constants/mockData";

export default function Narrative() {
  return (
    <section id="story" className="py-24 px-6 bg-heritage-sand relative overflow-hidden heritage-pattern">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        
        {/* Story Text */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <span className="text-heritage-gold uppercase tracking-widest text-xs font-bold mb-4 block">The Ancestral Story</span>
          <h2 className="text-4xl md:text-5xl font-serif text-heritage-charcoal mb-8 leading-tight">
            A Legacy Carved in <span className="italic text-heritage-green">Volcanic Stone</span>
          </h2>
          <div className="space-y-6 text-heritage-charcoal/80 leading-relaxed text-lg font-light">
            <p>
              Arka Villa is more than a villa; it is a living tribute to Balinese craftsmanship. 
              The architecture preserves the traditional "Tri Hita Karana" philosophy, ensuring a 
              harmonious balance between people, nature, and the spiritual world.
            </p>
            <p>
              Every stone was hand-picked from local riverbeds, and every wooden panel was 
              carved by master artisans in Mas village, carrying stories of generations past.
            </p>
          </div>
          <Link href="/the-villa" className="mt-10 inline-block border-b-2 border-heritage-gold text-heritage-charcoal font-serif text-xl pb-2 hover:text-heritage-gold transition-colors">
            Explore the Architecture
          </Link>
        </motion.div>

        {/* Story Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative h-[600px] w-full rounded-sm overflow-hidden shadow-2xl"
        >
          <Image
            src="/images/hero.png"
            alt="Villa Heritage"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 ring-1 ring-inset ring-heritage-gold/20 m-4"></div>
        </motion.div>

      </div>
    </section>
  );
}
