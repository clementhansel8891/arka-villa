"use client";

import { motion } from "framer-motion";
import Image from "next/image";

/**
 * Featured Experiences — Showcases unique Bali experiences
 * available through the villas (spa, dining, culture, adventure).
 */

const EXPERIENCES = [
  {
    title: "Private Spa Rituals",
    description: "Traditional Balinese healing treatments in your villa's private spa pavilion.",
    image: "/images/suite.png",
    tag: "Wellness",
  },
  {
    title: "Rice Terrace Dining",
    description: "Candlelit dinners overlooking ancient rice terraces, prepared by personal chefs.",
    image: "/images/jungle.png",
    tag: "Gastronomy",
  },
  {
    title: "Sacred Temple Visits",
    description: "Private guided tours to Bali's most sacred temples with a cultural historian.",
    image: "/images/hero.png",
    tag: "Culture",
  },
];

export default function FeaturedExperiences() {
  return (
    <section className="py-24 px-6 bg-heritage-charcoal">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <span className="text-heritage-gold text-[10px] uppercase tracking-[0.5em] font-bold">
            Beyond Accommodation
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-white mt-3">
            Curated Experiences
          </h2>
          <p className="text-white/40 mt-3 max-w-md">
            Every stay includes access to exclusive Balinese experiences tailored to your preferences.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {EXPERIENCES.map((exp, i) => (
            <motion.div
              key={exp.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="group relative h-96 overflow-hidden cursor-pointer"
            >
              <Image
                src={exp.image}
                alt={exp.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-heritage-charcoal via-heritage-charcoal/30 to-transparent" />

              {/* Tag */}
              <div className="absolute top-4 left-4">
                <span className="text-heritage-gold text-[10px] uppercase tracking-[0.4em] font-bold bg-heritage-charcoal/70 backdrop-blur-sm px-3 py-1 border border-heritage-gold/20">
                  {exp.tag}
                </span>
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-xl font-serif text-white mb-2">{exp.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{exp.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
