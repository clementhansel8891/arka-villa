"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { MessageCircle, Phone, Mail } from "lucide-react";

/**
 * Booking CTA — Final call-to-action section before the footer.
 * Encourages direct booking with contact options.
 */
export default function BookingCTA() {
  return (
    <section className="py-24 px-6 bg-[#0A0A0A] relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l5 10h10l-8 7 3 10-10-6-10 6 3-10-8-7h10z' fill='%23D4AF37' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-heritage-gold text-[10px] uppercase tracking-[0.5em] font-bold">
            Ready to Experience Bali?
          </span>
          <h2 className="text-4xl md:text-5xl font-serif text-white mt-4 mb-6">
            Book Your Dream Villa
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto mb-10">
            Speak directly with our team for personalized recommendations,
            special rates, and bespoke arrangements.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="#villas"
              className="bg-heritage-gold text-heritage-charcoal px-8 py-4 text-xs uppercase tracking-[0.3em] font-bold hover:bg-white transition-colors"
            >
              Browse & Book Online
            </Link>
            <a
              href="https://wa.me/6287837452510"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-heritage-gold/30 text-heritage-gold px-8 py-4 text-xs uppercase tracking-[0.3em] font-bold hover:bg-heritage-gold/10 transition-colors flex items-center gap-2"
            >
              <MessageCircle size={14} />
              WhatsApp Us
            </a>
          </div>

          {/* Contact Methods */}
          <div className="flex items-center justify-center gap-8 text-white/30 text-xs">
            <a href="tel:+6287837452510" className="flex items-center gap-2 hover:text-heritage-gold transition-colors">
              <Phone size={12} />
              +62 878 3745 2510
            </a>
            <a href="mailto:book@arka-villa.com" className="flex items-center gap-2 hover:text-heritage-gold transition-colors">
              <Mail size={12} />
              book@arka-villa.com
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
