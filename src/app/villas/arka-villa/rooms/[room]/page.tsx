"use client";

import { use } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BedDouble,
  Users,
  ChevronRight,
  ArrowRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoomData {
  name: string;
  slug: string;
  heroImage: string;
  gallery: string[];
  beds: string;
  capacity: string;
  price: number;
  features: string[];
  description: string;
}

const ROOMS: Record<string, RoomData> = {
  "deluxe-villa": {
    name: "Deluxe Villa",
    slug: "deluxe-villa",
    heroImage: "/images/villas/arka-villa/img-11.webp",
    gallery: [
      "/images/villas/arka-villa/img-12.webp",
      "/images/villas/arka-villa/img-04.webp",
    ],
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
  "one-bedroom-villa": {
    name: "One Bedroom Villa",
    slug: "one-bedroom-villa",
    heroImage: "/images/villas/arka-villa/img-14.webp",
    gallery: [
      "/images/villas/arka-villa/img-15.webp",
      "/images/villas/arka-villa/img-05.webp",
    ],
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
};

export default function RoomDetailPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room: roomSlug } = use(params);
  const room = ROOMS[roomSlug];

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white pt-20">
        <h1 className="font-serif text-3xl mb-4">Room Not Found</h1>
        <Link
          href="/villas/arka-villa/rooms"
          className="text-amber-400 hover:text-amber-300 underline underline-offset-4"
        >
          View All Rooms
        </Link>
      </div>
    );
  }

  return (
    <div className="text-white pt-20 md:pt-24">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <nav className="flex items-center gap-2 text-sm text-white/40">
          <Link href="/villas/arka-villa" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/villas/arka-villa/rooms" className="hover:text-white transition-colors">
            Rooms
          </Link>
          <ChevronRight size={14} />
          <span className="text-white/70">{room.name}</span>
        </nav>
      </div>

      {/* Hero Image */}
      <section className="max-w-7xl mx-auto px-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative aspect-[21/9] md:aspect-[21/8] rounded-2xl overflow-hidden"
        >
          <Image
            src={room.heroImage}
            alt={room.name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10">
            <h1 className="font-serif text-3xl md:text-5xl font-light mb-2">
              {room.name}
            </h1>
            <div className="flex items-center gap-4 text-white/70 text-sm">
              <span className="flex items-center gap-1.5">
                <BedDouble size={14} className="text-amber-400" />
                {room.beds}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={14} className="text-amber-400" />
                {room.capacity}
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-serif text-2xl mb-4">About This Room</h2>
              <p className="text-white/70 text-lg leading-relaxed">
                {room.description}
              </p>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h2 className="font-serif text-2xl mb-6">Room Features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {room.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 text-white/70"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                      <Check size={14} className="text-amber-400" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Photo Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="font-serif text-2xl mb-6">Gallery</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {room.gallery.map((img, i) => (
                  <div
                    key={i}
                    className={cn(
                      "relative rounded-xl overflow-hidden",
                      i === 0 ? "aspect-[4/3]" : "aspect-[4/3]"
                    )}
                  >
                    <Image
                      src={img}
                      alt={`${room.name} gallery ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Pricing Card */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="sticky top-28 bg-stone-900 border border-white/5 rounded-2xl p-8"
            >
              <div className="mb-6">
                <span className="text-amber-400 text-3xl font-light">
                  ${room.price}
                </span>
                <span className="text-white/40 text-sm ml-1">/night</span>
              </div>

              <div className="space-y-3 mb-8 text-sm text-white/60">
                <div className="flex justify-between">
                  <span>Check-in</span>
                  <span className="text-white/80">14:00 – 23:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Check-out</span>
                  <span className="text-white/80">12:00 – 13:00</span>
                </div>
                <div className="flex justify-between">
                  <span>Capacity</span>
                  <span className="text-white/80">{room.capacity}</span>
                </div>
              </div>

              <Link
                href="/villas/arka-villa/booking"
                className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium px-6 py-4 rounded-full transition-colors text-sm uppercase tracking-widest"
              >
                Book This Room <ArrowRight size={14} />
              </Link>

              <p className="text-white/30 text-xs text-center mt-4">
                Free cancellation up to 48 hours before check-in
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Room Navigation */}
      <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
        <div className="border-t border-white/10 pt-10">
          <h3 className="text-white/40 text-xs uppercase tracking-widest text-center mb-6">Other Rooms</h3>
          <div className="flex justify-center gap-4">
            {Object.entries(ROOMS)
              .filter(([slug]) => slug !== roomSlug)
              .map(([slug, otherRoom]) => (
                <Link
                  key={slug}
                  href={`/villas/arka-villa/rooms/${slug}`}
                  className="flex items-center gap-4 bg-stone-900 border border-white/5 hover:border-amber-500/30 rounded-xl p-4 transition-colors group max-w-sm w-full"
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                    <Image
                      src={otherRoom.heroImage}
                      alt={otherRoom.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium group-hover:text-amber-400 transition-colors">{otherRoom.name}</p>
                    <p className="text-white/40 text-xs">{otherRoom.beds} · From ${otherRoom.price}/night</p>
                  </div>
                  <ArrowRight size={14} className="ml-auto text-white/20 group-hover:text-amber-400 transition-colors" />
                </Link>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}
