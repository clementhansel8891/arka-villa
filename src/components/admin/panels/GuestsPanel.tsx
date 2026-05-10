"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Globe, Phone, Calendar, X } from "lucide-react";
import { getAllGuests, User } from "@/lib/auth";

export default function GuestsPanel() {
  const [guests, setGuests] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  useEffect(() => { setGuests(getAllGuests()); }, []);

  const filtered = guests.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.email.toLowerCase().includes(search.toLowerCase())
  );

  const MOCK_STAYS: Record<string, number> = { "guest-001": 3 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-serif text-2xl">Guest Registry</h2>
          <p className="text-white/30 text-xs mt-1">{guests.length} registered guests</p>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="text" placeholder="Search guests..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm pl-9 pr-4 py-2 focus:outline-none focus:border-heritage-gold/40 w-52 placeholder:text-white/20" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((g, i) => (
          <motion.div key={g.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            onClick={() => setSelected(g)}
            className="bg-white/3 border border-white/5 p-6 hover:border-heritage-gold/20 cursor-pointer transition-all duration-200 group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-heritage-gold/30 to-heritage-gold/10 flex items-center justify-center text-heritage-gold font-serif text-xl flex-shrink-0">
                {g.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate group-hover:text-heritage-gold transition-colors">{g.name}</p>
                <p className="text-white/30 text-xs truncate mt-0.5">{g.email}</p>
                <div className="flex items-center gap-4 mt-3">
                  {g.nationality && (
                    <span className="flex items-center gap-1 text-white/30 text-xs">
                      <Globe size={11} />{g.nationality}
                    </span>
                  )}
                  {g.phone && (
                    <span className="flex items-center gap-1 text-white/30 text-xs">
                      <Phone size={11} />{g.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between">
              <div className="text-center">
                <p className="text-heritage-gold font-serif text-lg">{MOCK_STAYS[g.id] ?? 0}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wider">Stays</p>
              </div>
              <div className="text-center">
                <p className="text-heritage-gold font-serif text-lg">${(MOCK_STAYS[g.id] ?? 0) > 0 ? "14,850" : "0"}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wider">Lifetime Value</p>
              </div>
              <div className="text-center">
                <p className="text-emerald-400 font-serif text-lg">{(MOCK_STAYS[g.id] ?? 0) > 0 ? "4.9" : "—"}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wider">Avg Rating</p>
              </div>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-20 text-white/20">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p>No guests found.</p>
          </div>
        )}
      </div>

      {/* Guest Detail Drawer */}
      {selected && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40" onClick={() => setSelected(null)} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-96 bg-[#0E0E0E] border-l border-white/10 z-50 overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-serif text-xl">Guest Profile</h3>
              <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-heritage-gold/30 to-heritage-gold/10 flex items-center justify-center text-heritage-gold font-serif text-3xl mb-4">
                {selected.name.charAt(0)}
              </div>
              <h4 className="text-white text-xl font-serif">{selected.name}</h4>
              <p className="text-white/30 text-sm mt-1">{selected.email}</p>
            </div>
            <div className="space-y-4">
              {selected.phone && <div><p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Phone</p><p className="text-white text-sm">{selected.phone}</p></div>}
              {selected.nationality && <div><p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Nationality</p><p className="text-white text-sm">{selected.nationality}</p></div>}
              <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-4 mt-4">
                {[["Stays", MOCK_STAYS[selected.id] ?? 0], ["Total Spent", `$${(MOCK_STAYS[selected.id] ?? 0) > 0 ? "14,850" : "0"}`], ["Rating", (MOCK_STAYS[selected.id] ?? 0) > 0 ? "4.9★" : "—"]].map(([l, v]) => (
                  <div key={l as string} className="text-center">
                    <p className="text-heritage-gold font-serif text-xl">{v}</p>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1">{l}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/5 pt-4">
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2"><Calendar size={11} />Stay History</p>
                {(MOCK_STAYS[selected.id] ?? 0) > 0 ? (
                  <div className="space-y-2">
                    {[{ id: "HH-0201", suite: "Royal Heritage Suite", dates: "Dec 2025", nights: 5, total: 6000, status: "Completed" },
                      { id: "HH-0228", suite: "Jungle Horizon Villa", dates: "Mar 2026", nights: 3, total: 2850, status: "Completed" },
                      { id: "HH-0241", suite: "Royal Heritage Suite", dates: "Jun 2026", nights: 5, total: 6000, status: "Confirmed" }
                    ].map((b) => (
                      <div key={b.id} className="bg-white/3 border border-white/5 p-3">
                        <div className="flex justify-between items-start">
                          <div><p className="text-white text-xs">{b.suite}</p><p className="text-white/30 text-[10px]">{b.dates} · {b.nights}n</p></div>
                          <div className="text-right"><p className="text-heritage-gold text-xs font-serif">${b.total.toLocaleString()}</p>
                            <span className={`text-[9px] uppercase ${b.status === "Confirmed" ? "text-emerald-400" : "text-blue-400"}`}>{b.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-white/20 text-sm italic">No stays recorded yet.</p>}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
