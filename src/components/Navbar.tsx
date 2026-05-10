"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, User, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const close = () => setProfileOpen(false);
    if (profileOpen) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [profileOpen]);

  const navLinks = [
    { name: "The Villa", href: "/the-villa" },
    { name: "Amenities", href: "/#amenities" },
    { name: "Story", href: "/#story" },
    { name: "Contact", href: "/contact" },
  ];

  const isStaff = user && (user.role === "admin" || user.role === "staff");

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4",
        isScrolled ? "bg-heritage-charcoal/90 backdrop-blur-md py-3" : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className={cn(
            "text-2xl font-serif tracking-tighter uppercase",
            isScrolled ? "text-heritage-gold" : "text-white"
          )}>
            Arka Villa
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "text-sm uppercase tracking-widest transition-colors hover:text-heritage-gold",
                isScrolled ? "text-white/80" : "text-white/90"
              )}
            >
              {link.name}
            </Link>
          ))}

          {user ? (
            /* Logged-in profile dropdown */
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-heritage-gold/40 px-4 py-2 transition-all duration-200"
              >
                <div className="w-6 h-6 rounded-full bg-heritage-gold flex items-center justify-center text-heritage-charcoal text-[10px] font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="text-white text-xs">{user.name.split(" ")[0]}</span>
                <ChevronDown size={12} className={cn("text-white/40 transition-transform", profileOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 bg-heritage-charcoal border border-white/10 shadow-2xl py-2"
                  >
                    <div className="px-4 py-3 border-b border-white/5 mb-1">
                      <p className="text-white text-sm font-medium">{user.name}</p>
                      <p className="text-white/30 text-[10px] capitalize mt-0.5">{user.role}</p>
                    </div>

                    {isStaff && (
                      <Link
                        href="/admin"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LayoutDashboard size={14} />
                        Admin Dashboard
                      </Link>
                    )}

                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <User size={14} />
                      {isStaff ? "My Profile" : "My Account"}
                    </Link>

                    <div className="border-t border-white/5 mt-1 pt-1">
                      <button
                        onClick={() => { setProfileOpen(false); logout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-colors"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* Not logged in */
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className={cn(
                  "text-sm uppercase tracking-widest transition-colors hover:text-heritage-gold",
                  isScrolled ? "text-white/80" : "text-white/90"
                )}
              >
                Sign In
              </Link>
              <Link
                href="/booking"
                className="bg-heritage-gold text-heritage-charcoal px-6 py-2 text-sm uppercase tracking-widest font-semibold hover:bg-white transition-all duration-300"
              >
                Book Now
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 bg-heritage-charcoal border-t border-heritage-gold/20 p-6 flex flex-col gap-5 md:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-white text-lg uppercase tracking-widest"
            >
              {link.name}
            </Link>
          ))}
          {user ? (
            <>
              {isStaff && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="text-heritage-gold text-lg uppercase tracking-widest">
                  Dashboard
                </Link>
              )}
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="text-white text-lg uppercase tracking-widest">
                My Profile
              </Link>
              <button onClick={() => { setMobileMenuOpen(false); logout(); }} className="text-red-400 text-lg uppercase tracking-widest text-left">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-white text-lg uppercase tracking-widest">
                Sign In
              </Link>
              <Link href="/booking" onClick={() => setMobileMenuOpen(false)} className="bg-heritage-gold text-heritage-charcoal px-6 py-3 text-center uppercase tracking-widest font-semibold">
                Book Now
              </Link>
            </>
          )}
        </motion.div>
      )}
    </nav>
  );
}
