"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function VillaComingSoon({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const villaName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-950 text-white px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-8">
          <span className="text-amber-400 text-2xl font-serif">✦</span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-light mb-4">{villaName}</h1>
        <p className="text-white/50 text-lg mb-10 leading-relaxed">
          This villa page is currently being prepared. Check back soon for a full
          experience.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors text-sm uppercase tracking-widest"
        >
          <ArrowLeft size={16} />
          Return Home
        </Link>
      </div>
    </div>
  );
}
