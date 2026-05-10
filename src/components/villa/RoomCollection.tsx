"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Bath, BedDouble, Waves, Wind, Coffee, Wifi } from "lucide-react";

const ROOMS = [
  {
    id: "royal-heritage-suite",
    tag: "Flagship Suite",
    name: "The Royal Heritage Suite",
    description:
      "Immerse yourself in our crown jewel — 320 sqm of hand-carved teak splendour, soaring 8-metre pavilion ceilings and a private terrace that dissolves into the jungle canopy.",
    price: 1200,
    sqm: 320,
    guests: 2,
    image: "https://images.unsplash.com/photo-1618221941000-0a47fcca15ae?w=1200&q=80",
    features: [
      { icon: BedDouble, label: "King Heritage Bed" },
      { icon: Bath, label: "Outdoor Stone Tub" },
      { icon: Waves, label: "Private Plunge Pool" },
      { icon: Wind, label: "Open-Air Pavilion" },
      { icon: Coffee, label: "In-Villa Barista" },
      { icon: Wifi, label: "High-Speed WiFi" },
    ],
    accent: "from-amber-900/40 to-heritage-charcoal/90",
  },
  {
    id: "jungle-horizon-villa",
    tag: "Valley View",
    name: "Jungle Horizon Villa",
    description:
      "Perched on the ridge of a sacred rice-terrace valley, the Jungle Horizon wraps you in 270° of living green. Sunrise here is a private ceremony.",
    price: 950,
    sqm: 260,
    guests: 2,
    image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80",
    features: [
      { icon: BedDouble, label: "Queen Canopy Bed" },
      { icon: Waves, label: "Infinity Pool" },
      { icon: Bath, label: "Rain Shower Garden" },
      { icon: Wind, label: "Private Terrace" },
      { icon: Coffee, label: "Daily Breakfast" },
      { icon: Wifi, label: "High-Speed WiFi" },
    ],
    accent: "from-green-900/40 to-heritage-charcoal/90",
  },
  {
    id: "sacred-lotus-pavilion",
    tag: "Wellness Retreat",
    name: "Sacred Lotus Pavilion",
    description:
      "Designed around the ancient Balinese concept of Tri Hita Karana — harmony between humanity, nature, and the divine — the Sacred Lotus is a sanctuary for deep restoration.",
    price: 750,
    sqm: 180,
    guests: 1,
    image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80",
    features: [
      { icon: BedDouble, label: "Balian Healing Bed" },
      { icon: Bath, label: "Flower Petal Bath" },
      { icon: Wind, label: "Meditation Deck" },
      { icon: Coffee, label: "Herbal Tea Service" },
      { icon: Waves, label: "Pool Access" },
      { icon: Wifi, label: "High-Speed WiFi" },
    ],
    accent: "from-stone-800/40 to-heritage-charcoal/90",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 48 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" as const } },
};

export default function RoomCollection() {
  return (
    <section className="py-28 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div>
            <p className="text-heritage-gold uppercase tracking-[0.3em] text-xs font-bold mb-4">
              Curated Accommodations
            </p>
            <h2 className="text-4xl md:text-5xl font-serif text-heritage-charcoal max-w-xl leading-tight">
              Three Distinct Ways to <em>Experience Bali</em>
            </h2>
          </div>
          <p className="text-heritage-charcoal/50 font-light max-w-xs text-sm leading-relaxed">
            Each space is unique, bespoke, and designed to become part of your story.
          </p>
        </div>

        {/* Room Cards */}
        <motion.div
          className="space-y-24"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {ROOMS.map((room, i) => (
            <motion.div
              key={room.id}
              variants={cardVariants}
              className={`grid md:grid-cols-2 gap-0 group ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
            >
              {/* Image */}
              <div className="relative h-[480px] overflow-hidden">
                <div
                  className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage: `url('${room.image}')`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${room.accent}`} />
                <div className="absolute top-8 left-8 flex flex-col gap-4">
                  <span className="bg-heritage-gold text-heritage-charcoal text-[10px] uppercase tracking-[0.25em] font-bold px-3 py-1 w-fit">
                    {room.tag}
                  </span>
                </div>
                <div className="absolute bottom-8 left-8 text-white/60 text-xs uppercase tracking-widest">
                  {room.sqm} m² · {room.guests === 1 ? "Solo Retreat" : "For Two"}
                </div>
              </div>

              {/* Details */}
              <div className="bg-heritage-charcoal p-10 md:p-14 flex flex-col justify-between">
                <div>
                  <p className="text-heritage-gold/60 text-[10px] uppercase tracking-[0.35em] mb-3">
                    From ${room.price} / night
                  </p>
                  <h3 className="text-3xl md:text-4xl font-serif text-white mb-6 leading-snug">
                    {room.name}
                  </h3>
                  <p className="text-white/50 font-light text-sm leading-relaxed mb-10">
                    {room.description}
                  </p>

                  {/* Feature Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-10">
                    {room.features.map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-3">
                        <Icon size={14} className="text-heritage-gold flex-shrink-0" />
                        <span className="text-white/60 text-xs font-light">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <Link
                    href={`/booking?room=${room.id}`}
                    className="bg-heritage-gold text-heritage-charcoal px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-white transition-all duration-300"
                  >
                    Reserve Now
                  </Link>
                  <button className="text-white/40 text-xs uppercase tracking-widest hover:text-heritage-gold transition-colors">
                    Full Details →
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
