"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const GALLERY = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
    alt: "Infinity pool at sunrise",
    span: "col-span-2 row-span-2",
    caption: "Infinity Pool",
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?w=800&q=80",
    alt: "Balinese outdoor dining",
    span: "col-span-1 row-span-1",
    caption: "Alfresco Dining",
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&q=80",
    alt: "Heritage suite bedroom",
    span: "col-span-1 row-span-1",
    caption: "Royal Suite",
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80",
    alt: "Stone bath with flowers",
    span: "col-span-1 row-span-1",
    caption: "Flower Bath",
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80",
    alt: "Yoga shala jungle view",
    span: "col-span-1 row-span-1",
    caption: "Yoga Shala",
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=800&q=80",
    alt: "Traditional carved wooden door",
    span: "col-span-1 row-span-1",
    caption: "Heritage Craftsmanship",
  },
];

export default function GalleryGrid() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="py-24 bg-heritage-charcoal">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-14">
          <div>
            <p className="text-heritage-gold uppercase tracking-[0.3em] text-xs font-bold mb-3">Gallery</p>
            <h2 className="text-4xl md:text-5xl font-serif text-white leading-tight">
              Through the <em className="text-heritage-gold">Lens</em>
            </h2>
          </div>
          <div className="hidden md:block h-px w-40 bg-heritage-gold/20" />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 grid-rows-3 gap-3 h-[700px]">
          {GALLERY.map((item, i) => (
            <motion.div
              key={item.id}
              className={`relative overflow-hidden cursor-pointer ${item.span}`}
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              onHoverStart={() => setHovered(item.id)}
              onHoverEnd={() => setHovered(null)}
            >
              <div
                className="absolute inset-0 transition-transform duration-700"
                style={{
                  backgroundImage: `url('${item.src}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transform: hovered === item.id ? "scale(1.08)" : "scale(1)",
                }}
              />
              {/* Overlay */}
              <div
                className="absolute inset-0 bg-heritage-charcoal/40 transition-opacity duration-300"
                style={{ opacity: hovered === item.id ? 0.2 : 0.5 }}
              />
              {/* Caption */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 p-5"
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: hovered === item.id ? 0 : 8, opacity: hovered === item.id ? 1 : 0 }}
                transition={{ duration: 0.25 }}
              >
                <span className="text-white text-xs uppercase tracking-[0.3em] font-semibold bg-heritage-charcoal/80 px-3 py-1 backdrop-blur-sm">
                  {item.caption}
                </span>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
