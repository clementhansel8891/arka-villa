import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

// Inline social icons
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
          <h2 className="text-2xl font-serif text-heritage-gold mb-2 uppercase tracking-tighter">Arka Villa</h2>
          <p className="text-heritage-gold/50 text-[10px] uppercase tracking-[0.3em] mb-5">Management Agency</p>
          <p className="text-white/60 text-sm leading-relaxed font-light">
            A premier luxury villa management agency in Bali. We curate, manage, and market the finest private villas across the island.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-sm uppercase tracking-widest font-bold mb-6 text-white/40">Explore</h4>
          <ul className="space-y-4 text-sm font-light">
            <li><Link href="/#villas" className="hover:text-heritage-gold transition-colors">Our Villas</Link></li>
            <li><Link href="/for-owners" className="hover:text-heritage-gold transition-colors">For Villa Owners</Link></li>
            <li><Link href="/careers" className="hover:text-heritage-gold transition-colors">Careers</Link></li>
            <li><Link href="/contact" className="hover:text-heritage-gold transition-colors">Contact Us</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-sm uppercase tracking-widest font-bold mb-6 text-white/40">Connect</h4>
          <ul className="space-y-4 text-sm font-light text-white/60">
            <li className="flex items-center gap-3"><MapPin size={16} className="text-heritage-gold" /> Bali, Indonesia</li>
            <li className="flex items-center gap-3"><Phone size={16} className="text-heritage-gold" /> +62 878 3745 2510</li>
            <li className="flex items-center gap-3"><Mail size={16} className="text-heritage-gold" /> hello@arka-villa.com</li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h4 className="text-sm uppercase tracking-widest font-bold mb-6 text-white/40">Stay Updated</h4>
          <p className="text-xs text-white/40 mb-4 font-light italic">Get exclusive deals and new villa announcements.</p>
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
        <p>&copy; 2026 Arka Villa Management. All rights reserved.</p>
        <div className="flex gap-8">
          <Link href="/privacy" className="hover:text-white/40 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white/40 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
