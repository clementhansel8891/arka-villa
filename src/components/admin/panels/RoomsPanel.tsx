"use client";

import { motion } from "framer-motion";
import { Waves, BedDouble, Droplets } from "lucide-react";

const ROOMS = [
  { id: "royal-heritage-suite", name: "The Royal Heritage Suite", type: "Flagship Suite", price: 1200, sqm: 320, guests: 2, status: "Occupied", nextAvailable: "2026-05-23", image: "https://images.unsplash.com/photo-1618221941000-0a47fcca15ae?w=600&q=80", features: ["King Heritage Bed", "Outdoor Stone Tub", "Private Plunge Pool", "In-Villa Barista"], occupancyRate: 92 },
  { id: "jungle-horizon-villa", name: "Jungle Horizon Villa", type: "Valley View", price: 950, sqm: 260, guests: 2, status: "Available", nextAvailable: "Today", image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=600&q=80", features: ["Queen Canopy Bed", "Infinity Pool", "Rain Shower Garden", "Daily Breakfast"], occupancyRate: 85 },
  { id: "sacred-lotus-pavilion", name: "Sacred Lotus Pavilion", type: "Wellness Retreat", price: 750, sqm: 180, guests: 1, status: "Maintenance", nextAvailable: "2026-05-16", image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80", features: ["Balian Healing Bed", "Flower Petal Bath", "Meditation Deck", "Herbal Tea Service"], occupancyRate: 78 },
];

const STATUS_STYLES: Record<string, string> = {
  Available: "bg-emerald-500/15 text-emerald-400",
  Occupied: "bg-heritage-gold/15 text-heritage-gold",
  Maintenance: "bg-red-500/15 text-red-400",
};

export default function RoomsPanel() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-white font-serif text-2xl">Room Management</h2>
          <p className="text-white/30 text-xs mt-1">3 suites · 1 available · 1 occupied · 1 maintenance</p>
        </div>
        
        {/* Status Quick Stats - Scrollable on mobile */}
        <div className="flex overflow-x-auto scrollbar-hide gap-3 pb-1">
          {[["Available", "1", "emerald"], ["Occupied", "1", "heritage-gold"], ["Maintenance", "1", "red"]].map(([label, count, color]) => (
            <div key={label as string} className="bg-white/3 border border-white/5 px-6 py-3 text-center min-w-[100px] flex-shrink-0">
              <p className={`text-xl font-serif ${color === "emerald" ? "text-emerald-400" : color === "red" ? "text-red-400" : "text-heritage-gold"}`}>{count}</p>
              <p className="text-white/30 text-[10px] uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {ROOMS.map((room, i) => (
          <motion.div key={room.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white/3 border border-white/5 hover:border-white/10 transition-colors overflow-hidden">
            <div className="grid md:grid-cols-4 gap-0">
              {/* Image */}
              <div className="h-48 md:h-auto relative overflow-hidden">
                <div className="absolute inset-0" style={{ backgroundImage: `url('${room.image}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
                <div className="absolute inset-0 bg-heritage-charcoal/40" />
                <span className={`absolute top-3 left-3 text-[10px] uppercase tracking-widest px-2 py-1 ${STATUS_STYLES[room.status]}`}>{room.status}</span>
              </div>

              {/* Info */}
              <div className="p-6 md:col-span-2">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-heritage-gold text-[10px] uppercase tracking-widest">{room.type} · {room.sqm}m²</p>
                </div>
                <h3 className="text-white font-serif text-xl mb-3">{room.name}</h3>
                <div className="flex flex-wrap gap-2 mb-6">
                  {room.features.map((f) => (
                    <span key={f} className="text-white/30 text-[9px] uppercase tracking-wider border border-white/10 px-2 py-1 whitespace-nowrap">{f}</span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] uppercase tracking-widest text-white/40">
                  <span className="flex items-center gap-2"><BedDouble size={12} className="text-heritage-gold/50" />{room.guests} guests max</span>
                  <span className="flex items-center gap-2"><Waves size={12} className="text-heritage-gold/50" />Pool access</span>
                  <span className="flex items-center gap-2"><Droplets size={12} className="text-heritage-gold/50" />Private bath</span>
                </div>
              </div>

              {/* Stats */}
              <div className="p-6 border-t md:border-t-0 md:border-l border-white/5 flex flex-col justify-between bg-white/[0.01]">
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Nightly Rate</p>
                  <p className="text-heritage-gold font-serif text-2xl">${room.price}</p>
                </div>
                <div className="space-y-4 mt-6 md:mt-0">
                  <div>
                    <div className="flex justify-between text-[10px] uppercase tracking-widest mb-1.5">
                      <span className="text-white/30">Occupancy</span>
                      <span className="text-white">{room.occupancyRate}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-heritage-gold rounded-full" initial={{ width: 0 }} animate={{ width: `${room.occupancyRate}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-widest">
                    <span className="text-white/30">Next Available</span>
                    <span className={room.status === "Available" ? "text-emerald-400" : "text-white/60"}>{room.nextAvailable}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
