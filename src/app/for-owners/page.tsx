"use client";

import { motion } from "framer-motion";
import { TrendingUp, Shield, Globe, Headphones, BarChart3, Camera, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Maximize Revenue",
    description: "Our dynamic pricing and multi-channel distribution ensures your villa achieves optimal occupancy and rates year-round.",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "We list and manage your villa across Airbnb, Booking.com, Agoda, and direct channels — synced in real-time.",
  },
  {
    icon: Shield,
    title: "Full Property Care",
    description: "Maintenance, housekeeping, guest screening, and security handled by our professional on-ground team.",
  },
  {
    icon: Headphones,
    title: "24/7 Guest Support",
    description: "Our concierge team handles all guest communications, check-ins, and issue resolution around the clock.",
  },
  {
    icon: BarChart3,
    title: "Transparent Reporting",
    description: "Real-time owner dashboard with financials, occupancy analytics, maintenance logs, and guest feedback.",
  },
  {
    icon: Camera,
    title: "Professional Marketing",
    description: "Professional photography, virtual tours, copywriting, and social media promotion for your property.",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Consultation", description: "We visit your property and discuss your goals and expectations." },
  { step: "02", title: "Onboarding", description: "Professional photography, listing setup, and pricing strategy configuration." },
  { step: "03", title: "Go Live", description: "Your villa goes live across all channels with optimized listings." },
  { step: "04", title: "Earn & Relax", description: "We manage everything. You track earnings from your owner dashboard." },
];

export default function ForOwnersPage() {
  return (
    <main className="min-h-screen bg-heritage-charcoal">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-heritage-gold text-[10px] uppercase tracking-[0.5em] font-bold"
          >
            For Villa Owners
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-serif text-white mt-4 mb-6"
          >
            Let Us Manage Your Villa.
            <span className="block text-heritage-gold italic mt-2">You Enjoy the Returns.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-white/50 text-lg max-w-2xl mx-auto mb-10"
          >
            Arka Villa Management handles everything — from marketing and guest management
            to maintenance and financial reporting. Join our portfolio of premium Bali villas.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="https://wa.me/6287837452510?text=Hi%2C%20I%20would%20like%20to%20discuss%20listing%20my%20villa%20with%20Arka"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-heritage-gold text-heritage-charcoal px-8 py-4 text-xs uppercase tracking-[0.3em] font-bold hover:bg-white transition-colors"
            >
              Get Started
            </a>
            <Link
              href="#how-it-works"
              className="border border-heritage-gold/30 text-heritage-gold px-8 py-4 text-xs uppercase tracking-[0.3em] font-bold hover:bg-heritage-gold/10 transition-colors"
            >
              How It Works
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 px-6 bg-[#0A0A0A] border-y border-heritage-gold/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-heritage-gold text-[10px] uppercase tracking-[0.5em] font-bold">
              Why Partner With Us
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-white mt-3">
              Full-Service Villa Management
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {BENEFITS.map((benefit, i) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="p-6 border border-white/5 hover:border-heritage-gold/20 transition-colors group"
              >
                <benefit.icon size={28} className="text-heritage-gold mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-white font-serif text-lg mb-2">{benefit.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-heritage-gold text-[10px] uppercase tracking-[0.5em] font-bold">
              Simple Process
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-white mt-3">
              How It Works
            </h2>
          </div>

          <div className="space-y-8">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-6 p-6 border-l-2 border-heritage-gold/20 hover:border-heritage-gold transition-colors"
              >
                <span className="text-heritage-gold font-serif text-3xl shrink-0">{step.step}</span>
                <div>
                  <h3 className="text-white font-serif text-xl mb-1">{step.title}</h3>
                  <p className="text-white/40 text-sm">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Expect */}
      <section className="py-24 px-6 bg-[#0A0A0A] border-y border-heritage-gold/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-heritage-gold text-[10px] uppercase tracking-[0.5em] font-bold">
              Ideal Properties
            </span>
            <h2 className="text-3xl md:text-4xl font-serif text-white mt-3">
              What We Look For
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              "Premium location in Bali (Ubud, Seminyak, Canggu, Uluwatu, Nusa Dua)",
              "Minimum 2 bedrooms with en-suite bathrooms",
              "Private pool or unique amenity",
              "Well-maintained property in good condition",
              "Owner open to professional photography & styling",
              "Flexible with competitive pricing strategy",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 p-3">
                <CheckCircle2 size={16} className="text-heritage-gold shrink-0 mt-0.5" />
                <span className="text-white/60 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-6">
            Ready to List Your Villa?
          </h2>
          <p className="text-white/40 mb-10">
            Join our growing portfolio of luxury villas. We handle everything so you can enjoy passive income from your property.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/6287837452510?text=Hi%2C%20I%20would%20like%20to%20discuss%20listing%20my%20villa%20with%20Arka"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-heritage-gold text-heritage-charcoal px-8 py-4 text-xs uppercase tracking-[0.3em] font-bold hover:bg-white transition-colors flex items-center gap-2"
            >
              Contact Us <ArrowRight size={14} />
            </a>
            <a
              href="mailto:owners@arka-villa.com"
              className="border border-heritage-gold/30 text-heritage-gold px-8 py-4 text-xs uppercase tracking-[0.3em] font-bold hover:bg-heritage-gold/10 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
