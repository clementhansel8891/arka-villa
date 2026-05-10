"use client";

import { motion } from "framer-motion";
import { Waves, Leaf, Star, Heart } from "lucide-react";
import Link from "next/link";

const EXPERIENCES = [
  {
    icon: Leaf,
    title: "Jungle Trekking & Rice Field Walks",
    body: "Our personal guides escort you through sacred Tegalalang terraces and ancient subak irrigation systems at first light.",
  },
  {
    icon: Star,
    title: "Private Balinese Ceremony Viewing",
    body: "Receive exclusive access to traditional temple ceremonies — draped in a hand-loomed batik, as a respectful honoured guest.",
  },
  {
    icon: Waves,
    title: "Sound Healing & Water Purification",
    body: "A traditional melukat water purification ritual conducted by our resident Balinese healer in the sacred spring garden.",
  },
  {
    icon: Heart,
    title: "Couples' Heritage Spa Journey",
    body: "A five-hour private journey through Balinese boreh scrubs, warm coconut oil massage, and a champagne floral bath.",
  },
];

export default function ExperienceSection() {
  return (
    <section className="py-28 px-6 bg-heritage-sand">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-20 items-center">
          {/* Left text */}
          <div>
            <p className="text-heritage-gold uppercase tracking-[0.3em] text-xs font-bold mb-5">
              Curated Experiences
            </p>
            <h2 className="text-4xl md:text-5xl font-serif text-heritage-charcoal mb-8 leading-tight">
              More Than a Stay. <br />
              <em>A Transformation.</em>
            </h2>
            <p className="text-heritage-charcoal/55 font-light text-base leading-relaxed mb-10 max-w-md">
              Every Arka Villa guest receives a bespoke experience programme — hand-curated by our resident
              cultural concierge based on your intention for the journey.
            </p>
            <Link
              href="/booking"
              className="inline-block bg-heritage-charcoal text-white px-10 py-4 text-xs uppercase tracking-widest font-bold hover:bg-heritage-gold hover:text-heritage-charcoal transition-all duration-300"
            >
              Begin Your Journey
            </Link>
          </div>

          {/* Right experience grid */}
          <div className="grid grid-cols-1 gap-6">
            {EXPERIENCES.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex gap-6 items-start p-6 border border-heritage-charcoal/10 bg-white group hover:border-heritage-gold/40 transition-colors duration-300"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-heritage-charcoal/5 group-hover:bg-heritage-gold/10 transition-colors duration-300 flex-shrink-0">
                  <Icon size={18} className="text-heritage-gold" />
                </div>
                <div>
                  <h4 className="font-serif text-heritage-charcoal text-lg mb-2">{title}</h4>
                  <p className="text-heritage-charcoal/50 text-sm font-light leading-relaxed">{body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
