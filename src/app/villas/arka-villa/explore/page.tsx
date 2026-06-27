"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Explore Ubud — Real landmark photos from Unsplash (free commercial use).
 * Photo credits displayed at the bottom of the page.
 */

const attractions = [
  {
    name: "Tegallalang Rice Terraces",
    distance: "5.4 km",
    image: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1200&q=80&fit=crop",
    description:
      "Iconic cascading rice paddies carved into steep hillsides, a UNESCO Cultural Landscape. Walk along the narrow ridges between emerald green terraces and witness centuries-old subak irrigation.",
    time: "Best at sunrise, 06:00 – 09:00",
    credit: "Unsplash",
  },
  {
    name: "Campuhan Ridge Walk",
    distance: "5 km",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80&fit=crop",
    description:
      "A sacred ridge walk through jungle and valleys. This serene morning trek follows a narrow path along grassy hilltops with sweeping views of the Wos River valley below.",
    time: "Early morning, 06:00 – 08:00",
    credit: "Unsplash",
  },
  {
    name: "Ubud Royal Palace",
    distance: "6 km",
    image: "https://images.unsplash.com/photo-1708436137498-1b660e94c782?w=1200&q=80&fit=crop",
    description:
      "Historic royal palace at the heart of Ubud, featuring traditional Balinese architecture and nightly Legong dance performances in its torchlit courtyard.",
    time: "Evening performances at 19:30",
    credit: "Unsplash",
  },
  {
    name: "Sacred Monkey Forest",
    distance: "7 km",
    image: "https://images.unsplash.com/photo-1590084475782-582f4841a08c?w=1200&q=80&fit=crop",
    description:
      "A lush sacred sanctuary home to over 700 long-tailed macaques. Walk ancient moss-covered paths past Hindu temples and towering banyan trees.",
    time: "Morning or late afternoon",
    credit: "Unsplash",
  },
  {
    name: "Tirta Empul Temple",
    distance: "8 km",
    image: "https://images.unsplash.com/photo-1552301726-570d51466ae2?w=1200&q=80&fit=crop",
    description:
      "A sacred water temple where Balinese Hindus perform purification rituals in crystal-clear spring water. The carved stone fountains date back to 962 AD.",
    time: "08:00 – 18:00 daily",
    credit: "Unsplash",
  },
  {
    name: "Goa Gajah Elephant Cave",
    distance: "14 km",
    image: "https://images.unsplash.com/photo-1655289112263-edd3bf75bbdd?w=1200&q=80&fit=crop",
    description:
      "A 9th-century archaeological site featuring a rock-carved cave entrance, ancient bathing pools, and Buddhist and Hindu relics surrounded by tropical jungle.",
    time: "08:00 – 16:00 daily",
    credit: "Unsplash",
  },
];

export default function ExplorePage() {
  return (
    <div className="text-white pt-20 md:pt-24">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <nav className="flex items-center gap-2 text-sm text-white/40">
          <Link href="/villas/arka-villa" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-white/70">Explore</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="relative w-full aspect-[21/9] md:aspect-[21/7] mb-16 md:mb-24 overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=1920&q=80&fit=crop"
          alt="Tegallalang Rice Terraces, Ubud"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-12 md:pb-16 text-center px-4">
          <p className="text-amber-400 text-sm uppercase tracking-[0.3em] mb-3">
            Discover
          </p>
          <h1 className="font-serif text-4xl md:text-6xl font-light mb-3">
            Explore Ubud
          </h1>
          <p className="text-white/60 text-lg max-w-xl">
            From ancient temples to rice terraces and art galleries — the cultural
            heart of Bali is at your doorstep.
          </p>
        </div>
      </section>

      {/* Journey Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24 space-y-16 md:space-y-24">
        {attractions.map((place, i) => (
          <div
            key={place.name}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center"
          >
            {/* Image */}
            <div
              className={cn(
                "relative aspect-[4/3] rounded-2xl overflow-hidden",
                i % 2 === 1 && "lg:order-2"
              )}
            >
              <Image
                src={place.image}
                alt={place.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute top-4 left-4 bg-stone-950/80 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-1.5">
                <MapPin size={12} className="text-amber-400" />
                <span className="text-white/80 text-xs">{place.distance}</span>
              </div>
            </div>

            {/* Content */}
            <div className={cn(i % 2 === 1 && "lg:order-1")}>
              <span className="text-amber-400/60 text-sm font-mono">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="font-serif text-2xl md:text-3xl font-light mt-2 mb-4">
                {place.name}
              </h2>
              <p className="text-white/70 leading-relaxed text-lg mb-6">
                {place.description}
              </p>
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Clock size={14} className="text-amber-400" />
                <span>{place.time}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Photo Credits */}
      <section className="max-w-7xl mx-auto px-6 pb-12">
        <p className="text-white/20 text-xs text-center">
          Location photos via{" "}
          <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/40">
            Unsplash
          </a>{" "}
          — free for commercial use.
        </p>
      </section>
    </div>
  );
}
