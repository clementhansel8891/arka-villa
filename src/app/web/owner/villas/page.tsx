"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  MapPin,
  Star,
  Users,
  Bed,
  TrendingUp,
  Camera,
  Edit2,
  ExternalLink,
  X,
  Wrench,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OwnerShell from "@/components/dashboard/owner/OwnerShell";
import { getTickets, type MaintenanceTicket } from "@/lib/maintenance-store";
import Link from "next/link";

/**
 * Owner Portal — My Villas Page
 * View and manage all owned properties with key details.
 */

const VILLAS = [
  {
    id: "villa-001",
    name: "Arka Villa",
    slug: "arka-villa",
    location: "Ubud, Bali",
    image: "/images/hero.png",
    bedrooms: 4,
    maxGuests: 8,
    rating: 4.9,
    reviews: 127,
    occupancy: 88,
    status: "active",
    monthlyRevenue: "$67,000",
    nextBooking: "Jun 28 — James Whitmore",
    amenities: ["Infinity Pool", "Spa", "Rice Terrace View", "Private Chef", "Yoga Pavilion", "Library", "Outdoor Cinema"],
    listingUrl: "/villas/arka-villa",
    recentBookings: [
      { guest: "James Whitmore", dates: "Jun 28 — Jul 3", status: "Confirmed" },
      { guest: "Yuki Tanaka", dates: "Jul 5 — Jul 10", status: "Confirmed" },
      { guest: "Maria Santos", dates: "Jul 15 — Jul 20", status: "Pending" },
    ],
  },
  {
    id: "villa-002",
    name: "Surya Villa",
    slug: "surya-villa",
    location: "Canggu, Bali",
    image: "/images/suite.png",
    bedrooms: 3,
    maxGuests: 6,
    rating: 4.6,
    reviews: 84,
    occupancy: 72,
    status: "active",
    monthlyRevenue: "$48,000",
    nextBooking: "Jul 1 — Alex Chen",
    amenities: ["Ocean View", "Rooftop Deck", "Surf Access", "Yoga Pavilion", "BBQ Area", "Plunge Pool"],
    listingUrl: "/villas/surya-villa",
    recentBookings: [
      { guest: "Alex Chen", dates: "Jul 1 — Jul 5", status: "Confirmed" },
      { guest: "Emma Wilson", dates: "Jul 8 — Jul 12", status: "Pending" },
    ],
  },
  {
    id: "villa-003",
    name: "Chandra Villa",
    slug: "chandra-villa",
    location: "Seminyak, Bali",
    image: "/images/jungle.png",
    bedrooms: 5,
    maxGuests: 12,
    rating: 4.9,
    reviews: 156,
    occupancy: 95,
    status: "active",
    monthlyRevenue: "$89,000",
    nextBooking: "Jun 27 — Emma Thompson",
    amenities: ["Beach Access", "Cinema Room", "Tennis Court", "Wine Cellar", "Infinity Pool", "Private Garden", "Chef's Kitchen"],
    listingUrl: "/villas/chandra-villa",
    recentBookings: [
      { guest: "Emma Thompson", dates: "Jun 27 — Jul 2", status: "Confirmed" },
      { guest: "David Park", dates: "Jul 4 — Jul 9", status: "Confirmed" },
      { guest: "Sofia Rossi", dates: "Jul 12 — Jul 18", status: "Confirmed" },
    ],
  },
];

type Villa = (typeof VILLAS)[number];

export default function OwnerVillasPage() {
  const [selectedVilla, setSelectedVilla] = useState<Villa | null>(null);
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>([]);

  useEffect(() => {
    setMaintenanceTickets(getTickets());
  }, []);

  function getVillaMaintenanceCount(villaName: string) {
    return maintenanceTickets.filter(
      (t) => t.villa === villaName && t.status !== "resolved"
    ).length;
  }

  return (
    <OwnerShell activeNav="villas">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-serif text-white font-bold">My Villas</h1>
          <p className="text-white/40 text-sm mt-1">
            Manage and monitor your {VILLAS.length} properties
          </p>
        </header>

        {/* Villa Cards */}
        <div className="space-y-6">
          {VILLAS.map((villa, i) => (
            <motion.div
              key={villa.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedVilla(villa)}
              className="border border-white/10 rounded-xl overflow-hidden hover:border-heritage-gold/20 transition-colors cursor-pointer"
            >
              <div className="flex flex-col lg:flex-row">
                {/* Image */}
                <div className="relative w-full lg:w-72 h-48 lg:h-auto shrink-0">
                  <img src={villa.image} alt={villa.name} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-heritage-charcoal/80 backdrop-blur px-2 py-1 text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
                    {villa.status}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-serif text-white">{villa.name}</h2>
                      <p className="text-white/40 text-sm flex items-center gap-1 mt-0.5">
                        <MapPin size={12} /> {villa.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-colors rounded-lg"
                      >
                        <Edit2 size={14} />
                      </button>
                      <a
                        href={villa.listingUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 border border-white/10 text-white/40 hover:text-heritage-gold hover:border-heritage-gold/30 transition-colors rounded-lg"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">Revenue</p>
                      <p className="text-heritage-gold font-serif text-lg font-bold">{villa.monthlyRevenue}</p>
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">Occupancy</p>
                      <p className={cn("font-serif text-lg font-bold", villa.occupancy >= 80 ? "text-emerald-400" : "text-yellow-400")}>
                        {villa.occupancy}%
                      </p>
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">Rating</p>
                      <p className="text-white font-serif text-lg font-bold flex items-center gap-1">
                        <Star size={12} className="text-yellow-400 fill-yellow-400" /> {villa.rating}
                        <span className="text-white/30 text-xs font-normal">({villa.reviews})</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">Bedrooms</p>
                      <p className="text-white font-serif text-lg font-bold flex items-center gap-1">
                        <Bed size={14} className="text-white/40" /> {villa.bedrooms}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/30 text-[10px] uppercase tracking-wider">Max Guests</p>
                      <p className="text-white font-serif text-lg font-bold flex items-center gap-1">
                        <Users size={14} className="text-white/40" /> {villa.maxGuests}
                      </p>
                    </div>
                  </div>

                  {/* Amenities (limited) */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {villa.amenities.slice(0, 4).map((a) => (
                      <span key={a} className="text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded">
                        {a}
                      </span>
                    ))}
                    {villa.amenities.length > 4 && (
                      <span className="text-[10px] text-heritage-gold/60 bg-heritage-gold/5 px-2 py-1 rounded">
                        +{villa.amenities.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Next Booking */}
                  <p className="text-white/30 text-xs">
                    Next booking: <span className="text-white/60">{villa.nextBooking}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Villa Detail Modal */}
      <AnimatePresence>
        {selectedVilla && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedVilla(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-heritage-charcoal border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              {/* Modal Header with Image */}
              <div className="relative h-48">
                <img src={selectedVilla.image} alt={selectedVilla.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-heritage-charcoal/90 to-transparent" />
                <button
                  onClick={() => setSelectedVilla(null)}
                  className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur text-white/80 hover:text-white rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="absolute bottom-4 left-6">
                  <h2 className="text-white font-serif text-2xl">{selectedVilla.name}</h2>
                  <p className="text-white/60 text-sm flex items-center gap-1 mt-0.5">
                    <MapPin size={12} /> {selectedVilla.location}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="p-6 border-b border-white/10">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">Revenue/mo</p>
                    <p className="text-heritage-gold font-serif text-lg font-bold">{selectedVilla.monthlyRevenue}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">Occupancy</p>
                    <p className={cn("font-serif text-lg font-bold", selectedVilla.occupancy >= 80 ? "text-emerald-400" : "text-yellow-400")}>
                      {selectedVilla.occupancy}%
                    </p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">Rating</p>
                    <p className="text-white font-serif text-lg font-bold flex items-center gap-1">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" /> {selectedVilla.rating}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">Bedrooms</p>
                    <p className="text-white font-serif text-lg font-bold">{selectedVilla.bedrooms}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">Max Guests</p>
                    <p className="text-white font-serif text-lg font-bold">{selectedVilla.maxGuests}</p>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="p-6 border-b border-white/10">
                <h3 className="text-white/40 text-[10px] uppercase tracking-wider mb-3">All Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedVilla.amenities.map((a) => (
                    <span key={a} className="text-xs text-white/60 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recent Bookings */}
              <div className="p-6 border-b border-white/10">
                <h3 className="text-white/40 text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1">
                  <CalendarDays size={10} /> Recent Bookings
                </h3>
                <div className="space-y-2">
                  {selectedVilla.recentBookings.map((booking) => (
                    <div key={booking.guest} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-white text-sm">{booking.guest}</p>
                        <p className="text-white/30 text-xs">{booking.dates}</p>
                      </div>
                      <span className={cn(
                        "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded",
                        booking.status === "Confirmed" ? "text-emerald-400 bg-emerald-400/10" : "text-yellow-400 bg-yellow-400/10"
                      )}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance Status */}
              <div className="p-6 border-b border-white/10">
                <h3 className="text-white/40 text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Wrench size={10} /> Maintenance Status
                </h3>
                {(() => {
                  const activeCount = getVillaMaintenanceCount(selectedVilla.name);
                  return activeCount > 0 ? (
                    <p className="text-yellow-400 text-sm">{activeCount} active maintenance ticket{activeCount > 1 ? "s" : ""}</p>
                  ) : (
                    <p className="text-emerald-400 text-sm">No active maintenance issues</p>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="p-6 flex items-center justify-between">
                <Link
                  href={`/villas/${selectedVilla.slug}`}
                  className="flex items-center gap-2 text-heritage-gold text-xs uppercase tracking-widest font-bold hover:text-white transition-colors"
                >
                  <ExternalLink size={14} /> View Public Listing
                </Link>
                <button
                  onClick={() => setSelectedVilla(null)}
                  className="px-6 py-2.5 text-xs uppercase tracking-widest font-bold text-white/60 border border-white/10 rounded-lg hover:text-white hover:border-white/30 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </OwnerShell>
  );
}
