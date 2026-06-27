"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  BedDouble,
  Waves,
  TreePalm,
  MapPin,
  DollarSign,
  Star,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.7 },
};

const rooms = [
  {
    name: "Deluxe Villa",
    slug: "deluxe-villa",
    image: "/images/villas/arka-villa/img-11.webp",
    beds: "1 Super King Bed",
    capacity: "2 guests",
    price: 85,
    description:
      "A spacious sanctuary with a private terrace overlooking the tropical garden.",
  },
  {
    name: "One Bedroom Villa",
    slug: "one-bedroom-villa",
    image: "/images/villas/arka-villa/img-14.webp",
    beds: "1 Super King + Sofa Bed",
    capacity: "3 guests",
    price: 110,
    description:
      "Extra space with a separate living area — perfect for families or extended stays.",
  },
];

const reviews = [
  {
    name: "Sarah M.",
    country: "Australia",
    rating: 9.5,
    text: "Absolutely beautiful property. The garden is stunning and the pool was exactly what we needed after exploring Ubud. The location is quiet but still easy to get everywhere.",
  },
  {
    name: "Thomas B.",
    country: "Germany",
    rating: 9.0,
    text: "A peaceful escape from the busy tourist areas. We loved waking up to the sounds of nature and having breakfast on the terrace.",
  },
  {
    name: "Yuki T.",
    country: "Japan",
    rating: 9.2,
    text: "Perfect for a couple's retreat. The Deluxe Villa room was spacious and beautifully decorated. Being close to Tegallalang was a huge bonus.",
  },
];

export default function ArkaVillaHome() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="text-white">
      {/* ─── HERO ─── */}
      <section ref={heroRef} className="relative h-screen w-full overflow-hidden">
        <motion.div style={{ scale: heroScale }} className="absolute inset-0">
          <Image
            src="/images/villas/arka-villa/front-view.webp"
            alt="Arka Villa front view"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
        <motion.div
          style={{ opacity: heroOpacity }}
          className="absolute inset-0 flex flex-col items-center justify-end pb-20 md:pb-28 text-center px-4"
        >
          <p className="text-amber-400/80 text-sm uppercase tracking-[0.3em] mb-4">
            Keliki · Ubud · Bali
          </p>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-light tracking-tight mb-4">
            Arka Villa
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-xl mb-10">
            A serene private retreat nestled in the lush heart of Ubud
          </p>
          <Link
            href="/villas/arka-villa/booking"
            className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium px-8 py-4 rounded-full transition-colors text-sm uppercase tracking-widest"
          >
            Book Now
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </section>

      {/* ─── QUICK STATS BAR ─── */}
      <section className="border-y border-white/5 bg-stone-900/50">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/60">
          <span className="flex items-center gap-2">
            <BedDouble size={16} className="text-amber-400" /> 2 Room Types
          </span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span className="flex items-center gap-2">
            <Waves size={16} className="text-amber-400" /> Pool
          </span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span className="flex items-center gap-2">
            <TreePalm size={16} className="text-amber-400" /> Garden
          </span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span className="flex items-center gap-2">
            <MapPin size={16} className="text-amber-400" /> Ubud Location
          </span>
          <span className="hidden sm:inline text-white/20">·</span>
          <span className="flex items-center gap-2">
            <DollarSign size={16} className="text-amber-400" /> From $85/night
          </span>
        </div>
      </section>

      {/* ─── INTRODUCTION ─── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          <motion.div {...fadeInUp}>
            <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-4">
              Welcome
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-light mb-6">
              Your Private Sanctuary in Keliki
            </h2>
            <p className="text-white/70 leading-relaxed text-lg mb-6">
              Tucked away in the quiet village of Keliki — one of Ubud&apos;s
              best-kept secrets — Arka Villa offers an intimate retreat surrounded
              by lush tropical gardens. Just minutes from the iconic Tegallalang
              Rice Terraces, yet a world away from the crowds.
            </p>
            <p className="text-white/60 leading-relaxed">
              The property blends traditional Balinese warmth with modern comforts:
              a private infinity pool, open-air living spaces, and a peaceful terrace
              where mornings begin with birdsong and the scent of frangipani.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative aspect-[4/5] rounded-2xl overflow-hidden"
          >
            <Image
              src="/images/villas/arka-villa/img-01.webp"
              alt="Arka Villa tropical setting"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>
        </div>
      </section>

      {/* ─── ROOM PREVIEW ─── */}
      <section className="py-16 md:py-24 bg-stone-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-3">
              Accommodation
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-light">
              Choose Your Room
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {rooms.map((room, i) => (
              <motion.div
                key={room.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
              >
                <Link
                  href={`/villas/arka-villa/rooms/${room.slug}`}
                  className="group block bg-stone-900 border border-white/5 rounded-xl overflow-hidden hover:border-amber-500/20 transition-colors"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={room.image}
                      alt={room.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute bottom-4 right-4 bg-stone-950/80 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm text-amber-400">
                      From ${room.price}/night
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-xl mb-2 group-hover:text-amber-400 transition-colors">
                      {room.name}
                    </h3>
                    <p className="text-white/50 text-sm mb-4">{room.description}</p>
                    <div className="flex items-center gap-4 text-white/40 text-xs uppercase tracking-widest">
                      <span>{room.beds}</span>
                      <span>·</span>
                      <span>{room.capacity}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/villas/arka-villa/rooms"
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm uppercase tracking-widest transition-colors"
            >
              View All Rooms <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FACILITIES HIGHLIGHT ─── */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-3">
              Facilities
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-light">
              Designed for Relaxation
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Private Pool",
                image: "/images/villas/arka-villa/img-15.webp",
                desc: "Cool off in our shimmering pool surrounded by tropical greenery",
              },
              {
                title: "Tropical Garden",
                image: "/images/villas/arka-villa/img-17.webp",
                desc: "Wander through lush landscaped paths under swaying palms",
              },
              {
                title: "Terrace Living",
                image: "/images/villas/arka-villa/img-12.webp",
                desc: "Open-air relaxation with views over the garden and pool",
              },
            ].map((facility, i) => (
              <motion.div
                key={facility.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <Link
                  href="/villas/arka-villa/facilities"
                  className="group block relative aspect-[3/4] rounded-xl overflow-hidden"
                >
                  <Image
                    src={facility.image}
                    alt={facility.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="font-serif text-lg text-white mb-1">
                      {facility.title}
                    </h3>
                    <p className="text-white/50 text-sm">{facility.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/villas/arka-villa/facilities"
              className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm uppercase tracking-widest transition-colors"
            >
              All Facilities <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── GUEST REVIEWS ─── */}
      <section className="py-16 md:py-24 bg-stone-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div {...fadeInUp} className="text-center mb-14">
            <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-3">
              Testimonials
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-light">
              What Guests Say
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map((review, i) => (
              <motion.div
                key={review.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-stone-900 border border-white/5 rounded-xl p-8"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      size={14}
                      className={cn(
                        idx < Math.round(review.rating / 2)
                          ? "text-amber-400 fill-amber-400"
                          : "text-white/20"
                      )}
                    />
                  ))}
                  <span className="ml-2 text-amber-400 text-sm font-medium">
                    {review.rating}
                  </span>
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-6 italic">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="text-white/40 text-sm">
                  <span className="text-white/70">{review.name}</span> ·{" "}
                  {review.country}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 md:py-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div {...fadeInUp}>
            <h2 className="font-serif text-3xl md:text-5xl font-light mb-6">
              Reserve Your Stay
            </h2>
            <p className="text-white/60 text-lg mb-10 max-w-lg mx-auto">
              Escape to Ubud&apos;s hidden gem. Book directly for the best rates
              and a complimentary welcome drink.
            </p>
            <Link
              href="/villas/arka-villa/booking"
              className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium px-10 py-4 rounded-full transition-colors text-sm uppercase tracking-widest"
            >
              Book Now
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
