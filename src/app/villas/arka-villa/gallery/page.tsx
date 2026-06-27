"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "rooms" | "pool" | "garden" | "exterior";

interface GalleryImage {
  src: string;
  category: FilterTab;
}

const allImages: GalleryImage[] = [
  { src: "/images/villas/arka-villa/front-view.webp", category: "exterior" },
  { src: "/images/villas/arka-villa/img-01.webp", category: "exterior" },
  { src: "/images/villas/arka-villa/img-02.webp", category: "exterior" },
  { src: "/images/villas/arka-villa/img-03.webp", category: "rooms" },
  { src: "/images/villas/arka-villa/img-04.webp", category: "rooms" },
  { src: "/images/villas/arka-villa/img-05.webp", category: "rooms" },
  { src: "/images/villas/arka-villa/img-06.webp", category: "rooms" },
  { src: "/images/villas/arka-villa/img-07.webp", category: "rooms" },
  { src: "/images/villas/arka-villa/img-08.webp", category: "exterior" },
  { src: "/images/villas/arka-villa/img-09.webp", category: "exterior" },
  { src: "/images/villas/arka-villa/img-10.webp", category: "exterior" },
  { src: "/images/villas/arka-villa/img-11.webp", category: "garden" },
  { src: "/images/villas/arka-villa/img-12.webp", category: "garden" },
  { src: "/images/villas/arka-villa/img-13.webp", category: "exterior" },
  { src: "/images/villas/arka-villa/img-14.webp", category: "pool" },
  { src: "/images/villas/arka-villa/img-15.webp", category: "pool" },
  { src: "/images/villas/arka-villa/img-16.webp", category: "pool" },
  { src: "/images/villas/arka-villa/img-17.webp", category: "garden" },
  { src: "/images/villas/arka-villa/img-18.webp", category: "pool" },
  { src: "/images/villas/arka-villa/img-19.webp", category: "exterior" },
  { src: "/images/villas/arka-villa/img-20.webp", category: "exterior" },
  { src: "/images/villas/arka-villa/img-21.webp", category: "exterior" },
  { src: "/images/villas/arka-villa/img-22.webp", category: "garden" },
  { src: "/images/villas/arka-villa/img-23.webp", category: "pool" },
  { src: "/images/villas/arka-villa/img-24.webp", category: "garden" },
  { src: "/images/villas/arka-villa/img-25.webp", category: "exterior" },
];

const tabs: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Rooms", value: "rooms" },
  { label: "Pool", value: "pool" },
  { label: "Garden", value: "garden" },
  { label: "Exterior", value: "exterior" },
];

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered =
    activeTab === "all"
      ? allImages
      : allImages.filter((img) => img.category === activeTab);

  return (
    <div className="text-white pt-20 md:pt-24">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <nav className="flex items-center gap-2 text-sm text-white/40">
          <Link href="/villas/arka-villa" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-white/70">Gallery</span>
        </nav>
      </div>

      {/* Header */}
      <section className="max-w-7xl mx-auto px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-3">
            Gallery
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-light mb-4">
            Visual Journey
          </h1>
          <p className="text-white/60 text-lg max-w-2xl">
            A curated collection of moments captured at Arka Villa and its
            surrounding landscapes.
          </p>
        </motion.div>
      </section>

      {/* Filter Tabs */}
      <section className="max-w-7xl mx-auto px-6 mb-10">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm uppercase tracking-widest transition-all min-h-[44px]",
                activeTab === tab.value
                  ? "bg-amber-500 text-stone-950 font-medium"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Masonry Grid */}
      <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
        <motion.div
          layout
          className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((img, i) => (
              <motion.div
                key={img.src}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                className="break-inside-avoid cursor-pointer group relative rounded-xl overflow-hidden"
                onClick={() => setLightboxIndex(i)}
              >
                <Image
                  src={img.src}
                  alt={`Gallery photo ${i + 1}`}
                  width={600}
                  height={img.category === "rooms" || img.category === "pool" ? 400 : i % 3 === 0 ? 750 : 500}
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close lightbox"
            >
              <X size={28} />
            </button>

            <div
              className="relative w-full max-w-5xl h-[80vh] mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={filtered[lightboxIndex].src}
                alt={`Gallery photo ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="90vw"
              />

              {/* Prev */}
              <button
                onClick={() =>
                  setLightboxIndex(
                    (lightboxIndex - 1 + filtered.length) % filtered.length
                  )
                }
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center bg-stone-950/50 rounded-full"
                aria-label="Previous image"
              >
                <ChevronLeft size={24} />
              </button>

              {/* Next */}
              <button
                onClick={() =>
                  setLightboxIndex((lightboxIndex + 1) % filtered.length)
                }
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center bg-stone-950/50 rounded-full"
                aria-label="Next image"
              >
                <ChevronRightIcon size={24} />
              </button>

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
                {lightboxIndex + 1} / {filtered.length}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
