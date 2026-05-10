"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Globe, Calendar, Star, Save, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getBookingsForGuest } from "@/lib/auth";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  Confirmed: "bg-emerald-500/15 text-emerald-400",
  Completed: "bg-blue-500/15 text-blue-400",
  Pending: "bg-heritage-gold/15 text-heritage-gold",
  Cancelled: "bg-red-500/15 text-red-400",
};

export default function GuestProfile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", nationality: user?.nationality ?? "" });

  if (!user) return null;
  const bookings = getBookingsForGuest(user.id);
  const totalSpent = bookings.filter(b => b.status === "Completed").reduce((s, b) => s + b.total, 0);
  const completedStays = bookings.filter(b => b.status === "Completed").length;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 600));
    updateUser({ name: form.name, phone: form.phone, nationality: form.nationality });
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const inputCls = "w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-heritage-gold/50 transition-colors placeholder:text-white/20";

  return (
    <div className="min-h-screen bg-heritage-charcoal pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/3 border border-white/5 p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-heritage-gold/20 to-heritage-sand/10 border border-heritage-gold/20 flex items-center justify-center text-heritage-gold font-serif text-4xl flex-shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-heritage-gold text-xs uppercase tracking-[0.3em] mb-1">Arka Villa Guest</p>
            <h1 className="text-3xl font-serif text-white">{user.name}</h1>
            <p className="text-white/40 mt-1">{user.email}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            {completedStays > 0 && (
              <div className="flex items-center gap-2 bg-heritage-gold/10 border border-heritage-gold/20 px-4 py-2">
                <Star size={14} className="text-heritage-gold fill-heritage-gold" />
                <span className="text-heritage-gold text-xs uppercase tracking-widest">Returning Guest</span>
              </div>
            )}
            {!editing ? (
              <button onClick={() => setEditing(true)} className="px-5 py-2.5 border border-white/20 text-white/60 text-xs uppercase tracking-widest hover:border-heritage-gold/40 hover:text-white transition-colors">
                Edit Profile
              </button>
            ) : (
              <button onClick={() => setEditing(false)} className="px-5 py-2.5 border border-white/10 text-white/30 text-xs uppercase tracking-widest">
                Cancel
              </button>
            )}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Personal Info */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white/3 border border-white/5 p-6">
            <h3 className="text-white font-serif text-lg mb-5 flex items-center gap-2"><User size={16} className="text-heritage-gold" />My Details</h3>
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Full Name</label>
                  <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
                <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Phone / WhatsApp</label>
                  <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+62 812 0000" className={inputCls} /></div>
                <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Nationality</label>
                  <input value={form.nationality} onChange={(e) => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="e.g. Indonesian" className={inputCls} /></div>
                <button type="submit" className={`w-full py-3 text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 ${saved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-heritage-gold text-heritage-charcoal hover:bg-white"}`}>
                  {saved ? <><Check size={13} />Saved</> : <><Save size={13} />Save</>}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {[
                  { icon: Mail, label: "Email", value: user.email },
                  { icon: Phone, label: "Phone", value: user.phone || "Not set" },
                  { icon: Globe, label: "Nationality", value: user.nationality || "Not set" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-3">
                    <Icon size={14} className="text-heritage-gold flex-shrink-0 mt-0.5" />
                    <div><p className="text-white/25 text-[10px] uppercase tracking-widest">{label}</p><p className="text-white text-sm mt-0.5">{value}</p></div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
              {[["Stays", completedStays], ["Upcoming", bookings.filter(b => b.status === "Confirmed").length], ["Nights", bookings.filter(b => b.status === "Completed").reduce((s, b) => s + b.nights, 0)]].map(([l, v]) => (
                <div key={l as string}>
                  <p className="text-heritage-gold font-serif text-xl">{v}</p>
                  <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {totalSpent > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5 text-center">
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Total Spent</p>
                <p className="text-heritage-gold font-serif text-2xl">${totalSpent.toLocaleString()}</p>
              </div>
            )}
          </motion.div>

          {/* Booking History */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="md:col-span-2 bg-white/3 border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-serif text-lg flex items-center gap-2"><Calendar size={16} className="text-heritage-gold" />Stay History</h3>
              <Link href="/booking" className="text-heritage-gold text-xs uppercase tracking-widest hover:text-white transition-colors">
                Book Again →
              </Link>
            </div>

            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}
                    className="border border-white/5 hover:border-white/10 transition-colors overflow-hidden">
                    <div className="flex items-start gap-4 p-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-heritage-gold text-xs font-mono">{b.id}</p>
                          <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${STATUS_STYLES[b.status]}`}>{b.status}</span>
                        </div>
                        <p className="text-white font-serif text-lg">{b.suite}</p>
                        <div className="flex items-center gap-4 mt-2 text-white/40 text-xs">
                          <span className="flex items-center gap-1"><Calendar size={11} />{b.checkIn} → {b.checkOut}</span>
                          <span>{b.nights} nights</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-heritage-gold font-serif text-xl">${b.total.toLocaleString()}</p>
                        {b.status === "Completed" && (
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            {[1,2,3,4,5].map(s => <Star key={s} size={10} className="text-heritage-gold fill-heritage-gold" />)}
                          </div>
                        )}
                      </div>
                    </div>
                    {b.status === "Confirmed" && (
                      <div className="bg-emerald-500/5 border-t border-emerald-500/10 px-5 py-3 flex justify-between items-center">
                        <p className="text-emerald-400 text-xs">Check-in {b.checkIn}</p>
                        <Link href="/contact" className="text-xs text-white/40 hover:text-white transition-colors">Contact Concierge →</Link>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Calendar size={24} className="text-white/20" />
                </div>
                <p className="text-white/30 text-sm mb-4">No stays on record yet.</p>
                <Link href="/booking" className="inline-block bg-heritage-gold text-heritage-charcoal px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors">
                  Plan Your First Stay
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
