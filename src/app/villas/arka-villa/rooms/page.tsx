"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BedDouble, Users, ArrowRight, ChevronRight } from "lucide-react";

const rooms = [
  {
    name: "Deluxe Villa",
    slug: "deluxe-villa",
    image: "/images/villas/arka-villa/img-11.webp",
    beds: "1 Super King Bed",
    capacity: "2 guests",
    price: 85,
    features: [
      "Garden View",
      "Private Terrace",
      "Rain Shower",
      "Air Conditioning",
      "Free WiFi",
      "Minibar",
    ],
    description:
      "A spacious sanctuary featuring a super king bed, private bathroom with rain shower, and a terrace overlooking the lush tropical garden.",
  },
  {
    name: "One Bedroom Villa",
    slug: "one-bedroom-villa",
    image: "/images/villas/arka-villa/img-14.webp",
    beds: "1 Super King Bed + Sofa Bed",
    capacity: "3 guests",
    price: 110,
    features: [
      "Living Area",
      "Garden View",
      "Private Terrace",
      "Rain Shower",
      "Air Conditioning",
      "Free WiFi",
      "Kitchenette",
    ],
    description:
      "Perfect for small families or couples wanting extra space. Features a super king bedroom, a comfortable living area with sofa bed, private bathroom, and a garden-view terrace.",
  },
];

export default function RoomsPage() {
  return (
    <div className="text-white pt-20 md:pt-24">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <nav className="flex items-center gap-2 text-sm text-white/40">
          <Link href="/villas/arka-villa" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-white/70">Rooms</span>
        </nav>
      </div>

      {/* Header */}
      <section className="max-w-7xl mx-auto px-6 pb-12 md:pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-3">
            Accommodation
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-light mb-4">
            Our Rooms
          </h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Two carefully designed room types, each offering privacy, comfort,
            and an intimate connection with Bali&apos;s natural beauty.
          </p>
        </motion.div>
      </section>

      {/* Room Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24 space-y-12">
        {rooms.map((room, i) => (
          <motion.div
            key={room.slug}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.15 }}
            className="group bg-stone-900 border border-white/5 rounded-2xl overflow-hidden hover:border-amber-500/20 transition-colors"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[400px] overflow-hidden">
                <Image
                  src={room.image}
                  alt={room.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>

              {/* Content */}
              <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-center">
                <h2 className="font-serif text-2xl md:text-3xl mb-3">
                  {room.name}
                </h2>
                <p className="text-white/60 leading-relaxed mb-6">
                  {room.description}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-6 mb-6 text-white/50 text-sm">
                  <span className="flex items-center gap-2">
                    <BedDouble size={16} className="text-amber-400" />
                    {room.beds}
                  </span>
                  <span className="flex items-center gap-2">
                    <Users size={16} className="text-amber-400" />
                    {room.capacity}
                  </span>
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {room.features.map((f) => (
                    <span
                      key={f}
                      className="text-xs uppercase tracking-wider text-white/50 bg-white/5 border border-white/10 rounded-full px-3 py-1.5"
                    >
                      {f}
                    </span>
                  ))}
                </div>

                {/* Price + CTA */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <span className="text-amber-400 text-2xl font-light">
                      ${room.price}
                    </span>
                    <span className="text-white/40 text-sm ml-1">/night</span>
                  </div>
                  <Link
                    href={`/villas/arka-villa/rooms/${room.slug}`}
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium px-6 py-3 rounded-full transition-colors text-sm uppercase tracking-widest"
                  >
                    View Details <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
