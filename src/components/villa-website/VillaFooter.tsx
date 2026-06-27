'use client';

/**
 * Villa Footer — contact info, navigation links, and branding.
 *
 * Design language: Dark background, subtle borders, gold accent elements.
 * Responsive layout adapting across mobile/tablet/desktop breakpoints.
 *
 * Requirements: 8.4, 8.6
 */

import { Mail, Phone, MapPin } from 'lucide-react';

interface VillaFooterProps {
  villaName: string;
  accentColor: string;
  slug: string;
}

const FOOTER_NAV = [
  { label: 'About', href: '#about' },
  { label: 'Amenities', href: '#amenities' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'Location', href: '#location' },
  { label: 'Book Now', href: '#booking' },
];

export function VillaFooter({ villaName, accentColor, slug }: VillaFooterProps) {
  const handleNavClick = (href: string) => {
    if (href.startsWith('#')) {
      const el = document.getElementById(href.slice(1));
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer
      className="border-t border-white/5 pt-16 pb-8 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--villa-primary)' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Branding */}
          <div>
            <h3
              className="text-2xl mb-4"
              style={{ fontFamily: 'var(--font-villa-serif)', color: accentColor }}
            >
              {villaName}
            </h3>
            <p
              className="text-sm leading-relaxed max-w-sm"
              style={{ color: 'var(--villa-text-muted)' }}
            >
              An exclusive sanctuary where luxury meets tradition.
              Experience the beauty of Bali in unparalleled comfort.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4
              className="text-xs uppercase tracking-[0.3em] mb-5"
              style={{ color: 'var(--villa-text)' }}
            >
              Explore
            </h4>
            <nav aria-label="Footer navigation">
              <ul className="space-y-3">
                {FOOTER_NAV.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleNavClick(link.href)}
                      className="text-sm transition-colors hover:opacity-80"
                      style={{ color: 'var(--villa-text-muted)' }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLElement).style.color = accentColor;
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLElement).style.color = '';
                      }}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h4
              className="text-xs uppercase tracking-[0.3em] mb-5"
              style={{ color: 'var(--villa-text)' }}
            >
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone size={14} style={{ color: accentColor }} className="mt-0.5 shrink-0" />
                <span className="text-sm" style={{ color: 'var(--villa-text-muted)' }}>
                  +62 812 3456 7890
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={14} style={{ color: accentColor }} className="mt-0.5 shrink-0" />
                <span className="text-sm" style={{ color: 'var(--villa-text-muted)' }}>
                  hello@{villaName.toLowerCase().replace(/\s+/g, '')}.com
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={14} style={{ color: accentColor }} className="mt-0.5 shrink-0" />
                <span className="text-sm" style={{ color: 'var(--villa-text-muted)' }}>
                  Ubud, Bali, Indonesia
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs" style={{ color: 'var(--villa-text-muted)' }}>
            &copy; {new Date().getFullYear()} {villaName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={`/villas/${slug}`}
              className="text-xs transition-colors"
              style={{ color: 'var(--villa-text-muted)' }}
            >
              Privacy Policy
            </a>
            <span className="text-white/10">|</span>
            <a
              href={`/villas/${slug}`}
              className="text-xs transition-colors"
              style={{ color: 'var(--villa-text-muted)' }}
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
