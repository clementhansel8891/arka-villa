'use client';

/**
 * Villa Website Navbar — responsive navigation for individual villa sites.
 *
 * Features:
 * - Transparent on top, blurred background on scroll
 * - Villa logo/name branding with custom accent color
 * - Responsive: full nav on desktop, hamburger menu on mobile
 * - Smooth scroll to page sections
 *
 * Requirements: 8.4, 8.6
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VillaNavbarProps {
  villaName: string;
  logoUrl: string | null;
  accentColor: string;
  slug: string;
}

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Amenities', href: '#amenities' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Location', href: '#location' },
  { label: 'Book Now', href: '#booking', isAction: true },
];

export function VillaNavbar({ villaName, logoUrl, accentColor, slug }: VillaNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    if (href.startsWith('#')) {
      const el = document.getElementById(href.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        isScrolled
          ? 'bg-[var(--villa-primary)]/90 backdrop-blur-xl border-b border-white/5 py-3'
          : 'bg-transparent py-5'
      )}
      aria-label="Villa website navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo / Villa Name */}
        <a
          href={`/villas/${slug}`}
          className="flex items-center gap-3"
          aria-label={`${villaName} home`}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${villaName} logo`}
              className="h-8 w-auto object-contain"
            />
          ) : null}
          <span
            className="font-[var(--font-villa-serif)] text-xl md:text-2xl tracking-tight"
            style={{ color: accentColor, fontFamily: 'var(--font-villa-serif)' }}
          >
            {villaName}
          </span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link.href)}
              className={cn(
                'text-xs uppercase tracking-[0.2em] transition-colors duration-300',
                link.isAction
                  ? 'px-5 py-2 border font-medium'
                  : 'text-white/70 hover:text-white'
              )}
              style={
                link.isAction
                  ? {
                      borderColor: accentColor,
                      color: accentColor,
                    }
                  : undefined
              }
              onMouseEnter={(e) => {
                if (!link.isAction) {
                  (e.target as HTMLElement).style.color = accentColor;
                }
              }}
              onMouseLeave={(e) => {
                if (!link.isAction) {
                  (e.target as HTMLElement).style.color = '';
                }
              }}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-white/80 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="md:hidden overflow-hidden bg-[var(--villa-primary)]/95 backdrop-blur-xl border-t border-white/5"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  className={cn(
                    'text-left text-base uppercase tracking-widest py-2 transition-colors',
                    link.isAction ? 'font-medium' : 'text-white/70'
                  )}
                  style={link.isAction ? { color: accentColor } : undefined}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
