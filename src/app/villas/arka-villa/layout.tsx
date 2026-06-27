"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import StructuredData from "./structured-data";

const navLinks = [
  { label: "Home", href: "/villas/arka-villa" },
  { label: "Rooms", href: "/villas/arka-villa/rooms" },
  { label: "Facilities", href: "/villas/arka-villa/facilities" },
  { label: "Explore", href: "/villas/arka-villa/explore" },
  { label: "Gallery", href: "/villas/arka-villa/gallery" },
  { label: "Book", href: "/villas/arka-villa/booking" },
];

export default function ArkaVillaLayout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-stone-950">
      {/* SEO: Structured Data */}
      <StructuredData />

      {/* Navbar */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-stone-950/95 backdrop-blur-xl border-b border-white/5 shadow-lg"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link
            href="/villas/arka-villa"
            className="font-serif text-xl md:text-2xl text-white tracking-tight hover:text-amber-400 transition-colors"
          >
            Arka Villa
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm uppercase tracking-widest transition-colors",
                  pathname === link.href
                    ? "text-amber-400"
                    : "text-white/60 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white/80 hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 bg-stone-950/98 backdrop-blur-xl border-b border-white/5",
            menuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-6 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block py-3 text-base uppercase tracking-widest transition-colors min-h-[44px] flex items-center",
                  pathname === link.href
                    ? "text-amber-400"
                    : "text-white/60 hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main>{children}</main>

      {/* Agency Promotion — Compact elegant banner */}
      <section className="border-t border-white/5 bg-stone-900/40">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <span className="text-amber-400 font-serif text-sm">A</span>
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">Managed by Arka Villa Management</p>
              <p className="text-white/40 text-xs mt-0.5">Premier villa management agency in Bali — marketing, bookings & operations</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-xs uppercase tracking-widest transition-colors whitespace-nowrap border border-amber-500/20 hover:border-amber-500/40 px-5 py-2.5 rounded-full"
          >
            Visit Agency Site
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-stone-950">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <h3 className="font-serif text-xl text-white mb-4">Arka Villa</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                A serene escape in the heart of Ubud, Bali. Surrounded by tropical
                gardens and just minutes from Tegallalang Rice Terraces.
              </p>
            </div>
            <div>
              <h4 className="text-white/80 text-sm uppercase tracking-widest mb-4">Contact</h4>
              <p className="text-white/50 text-sm leading-relaxed">
                Jalan Sinta No.88, Keliki,<br />
                Ubud 80561, Bali, Indonesia
              </p>
            </div>
            <div>
              <h4 className="text-white/80 text-sm uppercase tracking-widest mb-4">Hours</h4>
              <p className="text-white/50 text-sm leading-relaxed">
                Check-in: 14:00 – 23:00<br />
                Check-out: 12:00 – 13:00
              </p>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-xs">
              © {new Date().getFullYear()} Arka Villa. All rights reserved.
            </p>
            <Link href="/" className="text-white/30 hover:text-amber-400 text-xs transition-colors">
              Arka Villa Management →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
