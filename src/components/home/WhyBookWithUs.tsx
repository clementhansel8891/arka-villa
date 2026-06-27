"use client";

import { motion } from "framer-motion";
import { Shield, Percent, Headphones, Clock } from "lucide-react";

/**
 * Why Book With Us — Trust signals and value propositions.
 */

const REASONS = [
  {
    icon: Percent,
    title: "Best Rate Guarantee",
    description: "Book direct and get the lowest rates — no OTA markups or hidden fees.",
  },
  {
    icon: Shield,
    title: "Verified Luxury",
    description: "Every villa is personally inspected and maintained to our exacting standards.",
  },
  {
    icon: Headphones,
    title: "24/7 Concierge",
    description: "Dedicated support from booking to checkout — WhatsApp, phone, or AI assistant.",
  },
  {
    icon: Clock,
    title: "Instant Confirmation",
    description: "Real-time availability and instant booking confirmation. No waiting.",
  },
];

export default function WhyBookWithUs() {
  return (
    <section className="py-24 px-6 bg-[#0A0A0A] border-y border-heritage-gold/10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-heritage-gold text-[10px] uppercase tracking-[0.5em] font-bold">
            The Arka Difference
          </span>
          <h2 className="text-3xl md:text-4xl font-serif text-white mt-3">
            Why Book Direct With Us
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {REASONS.map((reason, i) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center group"
            >
              <div className="w-14 h-14 mx-auto mb-5 border border-heritage-gold/20 flex items-center justify-center group-hover:bg-heritage-gold/10 transition-colors">
                <reason.icon size={22} className="text-heritage-gold" />
              </div>
              <h3 className="text-white font-serif text-lg mb-2">{reason.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{reason.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
