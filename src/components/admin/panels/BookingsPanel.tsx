"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, X, Check, Eye } from "lucide-react";

type Booking = {
  id: string; guest: string; email: string; suite: string;
  checkIn: string; checkOut: string; nights: number; guests: number;
  value: number; status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
  specialRequests?: string;
};

const INITIAL_BOOKINGS: Booking[] = [
  { id: "HH-0241", guest: "James Whitmore", email: "j.whitmore@email.com", suite: "Royal Heritage Suite", checkIn: "2026-05-18", checkOut: "2026-05-23", nights: 5, guests: 2, value: 6000, status: "Confirmed" },
  { id: "HH-0242", guest: "Yuki Tanaka", email: "yuki.t@email.com", suite: "Jungle Horizon Villa", checkIn: "2026-05-20", checkOut: "2026-05-23", nights: 3, guests: 2, value: 2850, status: "Pending", specialRequests: "Vegetarian meals" },
  { id: "HH-0243", guest: "Maria Santos", email: "msantos@email.com", suite: "Sacred Lotus Pavilion", checkIn: "2026-05-22", checkOut: "2026-05-29", nights: 7, guests: 1, value: 5250, status: "Confirmed", specialRequests: "Early check-in" },
  { id: "HH-0244", guest: "Ravi Mehta", email: "r.mehta@email.com", suite: "Royal Heritage Suite", checkIn: "2026-05-25", checkOut: "2026-05-29", nights: 4, guests: 2, value: 4800, status: "Confirmed" },
  { id: "HH-0245", guest: "Chloe Dupont", email: "cdupont@email.com", suite: "Jungle Horizon Villa", checkIn: "2026-05-28", checkOut: "2026-05-30", nights: 2, guests: 2, value: 1900, status: "Pending" },
  { id: "HH-0238", guest: "Aiko Sato", email: "aiko.sato@email.com", suite: "Sacred Lotus Pavilion", checkIn: "2026-05-10", checkOut: "2026-05-15", nights: 5, guests: 1, value: 3750, status: "Completed" },
  { id: "HH-0230", guest: "Sophie Laurent", email: "slaurent@email.com", suite: "Jungle Horizon Villa", checkIn: "2026-04-20", checkOut: "2026-04-23", nights: 3, guests: 2, value: 2850, status: "Cancelled" },
];

const STATUS_COLORS: Record<string, string> = {
  Confirmed: "bg-emerald-500/15 text-emerald-400",
  Pending: "bg-heritage-gold/15 text-heritage-gold",
  Completed: "bg-blue-500/15 text-blue-400",
  Cancelled: "bg-red-500/15 text-red-400",
};

export default function BookingsPanel() {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selected, setSelected] = useState<Booking | null>(null);

  const filtered = bookings.filter((b) => {
    const matchSearch = b.guest.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const updateStatus = (id: string, status: Booking["status"]) => {
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
    setSelected((s) => s?.id === id ? { ...s, status } : s);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-serif text-2xl">Bookings</h2>
          <p className="text-white/30 text-xs mt-1">{bookings.length} total · {bookings.filter(b => b.status === "Pending").length} pending</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Search guest or ID..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 text-white text-sm pl-9 pr-4 py-2 focus:outline-none focus:border-heritage-gold/40 w-48 placeholder:text-white/20" />
          </div>
          <div className="flex">
            {["All", "Confirmed", "Pending", "Completed", "Cancelled"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 text-xs uppercase tracking-wider border-y border-r first:border-l transition-colors ${filterStatus === s ? "bg-heritage-gold/10 text-heritage-gold border-heritage-gold/30" : "border-white/10 text-white/30 hover:text-white/60"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/3 border border-white/5 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-white/25 text-[10px] uppercase tracking-widest border-b border-white/5">
              {["Booking ID","Guest","Suite","Check-In","Nights","Value","Status","Actions"].map((h, i) => (
                <th key={h} className={`${i >= 5 ? "text-right" : "text-left"} px-5 py-4 font-normal ${i === 2 ? "hidden lg:table-cell" : i === 3 || i === 4 ? "hidden md:table-cell" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((b, i) => (
              <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="hover:bg-white/3 transition-colors">
                <td className="px-5 py-4 text-heritage-gold text-xs font-mono">{b.id}</td>
                <td className="px-5 py-4"><p className="text-white text-sm">{b.guest}</p><p className="text-white/30 text-xs">{b.email}</p></td>
                <td className="px-5 py-4 text-white/50 text-xs hidden lg:table-cell">{b.suite}</td>
                <td className="px-5 py-4 text-white/50 text-xs hidden md:table-cell">{b.checkIn}</td>
                <td className="px-5 py-4 text-white/50 text-xs hidden md:table-cell">{b.nights}n</td>
                <td className="px-5 py-4 text-right text-white text-sm font-serif">${b.value.toLocaleString()}</td>
                <td className="px-5 py-4 text-right"><span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${STATUS_COLORS[b.status]}`}>{b.status}</span></td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setSelected(b)} className="p-1.5 text-white/30 hover:text-white hover:bg-white/5 transition-colors"><Eye size={13} /></button>
                    {b.status === "Pending" && <button onClick={() => updateStatus(b.id, "Confirmed")} className="p-1.5 text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-400/5 transition-colors"><Check size={13} /></button>}
                    {(b.status === "Pending" || b.status === "Confirmed") && <button onClick={() => updateStatus(b.id, "Cancelled")} className="p-1.5 text-red-400/50 hover:text-red-400 hover:bg-red-400/5 transition-colors"><X size={13} /></button>}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-16 text-white/20"><Filter size={28} className="mx-auto mb-3 opacity-30" /><p className="text-sm">No bookings match.</p></div>}
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelected(null)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-96 bg-[#0E0E0E] border-l border-white/10 z-50 overflow-y-auto p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-white font-serif text-xl">{selected.id}</h3>
                <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-5">
                {[["Guest", selected.guest], ["Email", selected.email], ["Suite", selected.suite], ["Status", selected.status], ["Check-In", selected.checkIn], ["Check-Out", selected.checkOut], ["Nights", `${selected.nights} nights`], ["Guests", `${selected.guests} guests`]].map(([l, v]) => (
                  <div key={l}><p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">{l}</p><p className="text-white text-sm">{v}</p></div>
                ))}
                <div className="border-t border-white/5 pt-5"><p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Total</p><p className="text-heritage-gold text-3xl font-serif">${selected.value.toLocaleString()}</p></div>
                {selected.specialRequests && <div className="bg-heritage-gold/5 border border-heritage-gold/20 p-4"><p className="text-heritage-gold text-[10px] mb-2 uppercase tracking-widest">Special Requests</p><p className="text-white/60 text-sm">{selected.specialRequests}</p></div>}
                <div className="space-y-2 pt-2">
                  {selected.status === "Pending" && <button onClick={() => updateStatus(selected.id, "Confirmed")} className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-3 text-xs uppercase tracking-widest hover:bg-emerald-500/20 transition-colors">Confirm Booking</button>}
                  {(selected.status === "Pending" || selected.status === "Confirmed") && <button onClick={() => updateStatus(selected.id, "Cancelled")} className="w-full bg-red-500/10 border border-red-500/30 text-red-400 py-3 text-xs uppercase tracking-widest hover:bg-red-500/20 transition-colors">Cancel Booking</button>}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
