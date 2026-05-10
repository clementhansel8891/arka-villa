import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

// Inline social icons — Instagram & Facebook are not in this lucide-react version
const InstagramIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);
const FacebookIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-heritage-charcoal text-white pt-20 pb-10 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 mb-20">
        
        {/* Brand */}
        <div className="col-span-1 md:col-span-1">
          <h2 className="text-2xl font-serif text-heritage-gold mb-6 uppercase tracking-tighter">Arka Villa</h2>
          <p className="text-white/60 text-sm leading-relaxed font-light">
            An ultra-exclusive luxury sanctuary in the heart of Ubud, preserving the soul of Bali through ancestral heritage and modern elegance.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-sm uppercase tracking-widest font-bold mb-6 text-white/40">Navigation</h4>
          <ul className="space-y-4 text-sm font-light">
            <li><Link href="/the-villa" className="hover:text-heritage-gold transition-colors">The Villa</Link></li>
            <li><Link href="/#amenities" className="hover:text-heritage-gold transition-colors">Amenities</Link></li>
            <li><Link href="/booking" className="hover:text-heritage-gold transition-colors">Reservations</Link></li>
            <li><Link href="/contact" className="hover:text-heritage-gold transition-colors">Contact</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-sm uppercase tracking-widest font-bold mb-6 text-white/40">Connect</h4>
          <ul className="space-y-4 text-sm font-light text-white/60">
            <li className="flex items-center gap-3"><MapPin size={16} className="text-heritage-gold" /> Ubud, Bali, Indonesia</li>
            <li className="flex items-center gap-3"><Phone size={16} className="text-heritage-gold" /> +62 812 3456 7890</li>
            <li className="flex items-center gap-3"><Mail size={16} className="text-heritage-gold" /> concierge@arkavilla.com</li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="text-sm uppercase tracking-widest font-bold mb-6 text-white/40">Private Updates</h4>
          <p className="text-xs text-white/40 mb-4 font-light italic">Join our circle for exclusive seasonal offers.</p>
          <div className="flex border-b border-heritage-gold/30 pb-2">
            <input 
              type="email" 
              placeholder="Your email" 
              className="bg-transparent border-none text-sm w-full focus:ring-0 placeholder:text-white/20"
            />
            <button className="text-heritage-gold text-sm uppercase tracking-widest font-bold px-2">Join</button>
          </div>
          <div className="flex gap-4 mt-8">
            <InstagramIcon size={20} className="text-white/40 hover:text-heritage-gold cursor-pointer transition-colors" />
            <FacebookIcon size={20} className="text-white/40 hover:text-heritage-gold cursor-pointer transition-colors" />
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] text-white/20">
        <p>© 2026 Arka Villa Luxury Villa. All rights reserved.</p>
        <div className="flex gap-8">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
