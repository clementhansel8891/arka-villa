"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Globe, Calendar, Clock, DollarSign, TrendingUp, Save, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getScheduleForUser, computeWageSummary } from "@/lib/auth";

const SHIFT_COLORS: Record<string, string> = {
  Morning: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  Afternoon: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  Evening: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  Off: "bg-white/5 text-white/30 border-white/10",
};

export default function StaffProfile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: user?.name ?? "", phone: user?.phone ?? "" });

  if (!user) return null;

  const schedule = getScheduleForUser(user.id);
  const wages = computeWageSummary(user.id);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 600));
    updateUser({ name: form.name, phone: form.phone });
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const inputCls = "w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-heritage-gold/50 transition-colors";

  return (
    <div className="min-h-screen bg-heritage-charcoal pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white/3 border border-white/5 p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-heritage-gold/30 to-heritage-green/20 border border-heritage-gold/20 flex items-center justify-center text-heritage-gold font-serif text-4xl flex-shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1">
            <p className="text-heritage-gold text-xs uppercase tracking-[0.3em] mb-1">{user.role}</p>
            <h1 className="text-3xl font-serif text-white">{user.name}</h1>
            <p className="text-white/40 mt-1">{user.position} · {user.department}</p>
            <p className="text-white/20 text-sm mt-1 flex items-center gap-2"><Calendar size={12} />Since {user.startDate}</p>
          </div>
          <div className="flex gap-3">
            {!editing ? (
              <button onClick={() => setEditing(true)} className="px-5 py-2.5 border border-white/20 text-white/60 text-xs uppercase tracking-widest hover:border-heritage-gold/40 hover:text-white transition-colors">
                Edit Profile
              </button>
            ) : (
              <button onClick={() => setEditing(false)} className="px-5 py-2.5 border border-white/10 text-white/30 text-xs uppercase tracking-widest hover:text-white/60 transition-colors">
                Cancel
              </button>
            )}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Personal Info */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white/3 border border-white/5 p-6">
              <h3 className="text-white font-serif text-lg mb-5 flex items-center gap-2"><User size={16} className="text-heritage-gold" />Personal Info</h3>
              {editing ? (
                <form onSubmit={handleSave} className="space-y-4">
                  <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Full Name</label>
                    <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
                  <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Phone</label>
                    <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+62 812 0000" className={inputCls} /></div>
                  <button type="submit" className={`w-full py-3 text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 ${saved ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-heritage-gold text-heritage-charcoal hover:bg-white"}`}>
                    {saved ? <><Check size={13} />Saved</> : <><Save size={13} />Save</>}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  {[
                    { icon: Mail, label: "Email", value: user.email },
                    { icon: Phone, label: "Phone", value: user.phone || "Not set" },
                    { icon: User, label: "Department", value: user.department ?? "—" },
                    { icon: Globe, label: "Position", value: user.position ?? "—" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex gap-3">
                      <Icon size={14} className="text-heritage-gold flex-shrink-0 mt-0.5" />
                      <div><p className="text-white/25 text-[10px] uppercase tracking-widest">{label}</p><p className="text-white text-sm mt-0.5">{value}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Wage Summary */}
            {wages && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="bg-white/3 border border-white/5 p-6">
                <h3 className="text-white font-serif text-lg mb-5 flex items-center gap-2"><DollarSign size={16} className="text-heritage-gold" />This Week's Wages</h3>
                <div className="space-y-3">
                  {[
                    ["Rate", `$${wages.hourlyRate}/hr`, "text-white"],
                    ["Regular Hours", `${wages.regularHours} hrs`, "text-white"],
                    ["Overtime Hours", `${wages.overtimeHours} hrs`, "text-amber-400"],
                    ["Regular Pay", `$${wages.regularPay.toLocaleString()}`, "text-white"],
                    ["OT Pay (1.5×)", `$${wages.overtimePay.toFixed(2)}`, "text-emerald-400"],
                  ].map(([l, v, cls]) => (
                    <div key={l as string} className="flex justify-between text-sm border-b border-white/5 pb-2 last:border-0">
                      <span className="text-white/40">{l}</span>
                      <span className={cls as string}>{v}</span>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between">
                    <span className="text-white/60 text-xs uppercase tracking-widest">Est. Total</span>
                    <span className="text-heritage-gold font-serif text-xl">${wages.totalPay.toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column — Schedule */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="md:col-span-2 bg-white/3 border border-white/5 p-6">
            <h3 className="text-white font-serif text-lg mb-6 flex items-center gap-2"><Clock size={16} className="text-heritage-gold" />Weekly Schedule</h3>
            {schedule.length > 0 ? (
              <div className="space-y-3">
                {schedule.map((entry) => (
                  <div key={entry.date} className={`flex items-center gap-4 p-4 border ${SHIFT_COLORS[entry.shift]}`}>
                    <div className="w-24 flex-shrink-0">
                      <p className="text-xs uppercase tracking-widest opacity-60">{new Date(entry.date).toLocaleDateString("en-US", { weekday: "short" })}</p>
                      <p className="text-sm font-medium">{entry.date}</p>
                    </div>
                    <div className="flex-1">
                      <span className="text-xs uppercase tracking-widest font-semibold">{entry.shift}</span>
                    </div>
                    <div className="text-right">
                      {entry.hours > 0 ? (
                        <>
                          <p className="text-sm">{entry.hours}h regular</p>
                          {(entry.overtime ?? 0) > 0 && <p className="text-amber-400 text-xs">+{entry.overtime}h overtime</p>}
                        </>
                      ) : (
                        <p className="text-xs opacity-50">Day off</p>
                      )}
                    </div>
                    {(entry.overtime ?? 0) > 0 && (
                      <div className="flex-shrink-0">
                        <TrendingUp size={14} className="text-amber-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/20 italic text-sm">No schedule assigned yet.</p>
            )}

            {/* Weekly summary */}
            {wages && (
              <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-4">
                {[["Total Hours", wages.regularHours + wages.overtimeHours, "text-white"], ["Regular", wages.regularHours, "text-white/60"], ["Overtime", wages.overtimeHours, "text-amber-400"]].map(([l, v, cls]) => (
                  <div key={l as string} className="text-center">
                    <p className={`text-2xl font-serif ${cls}`}>{v}</p>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1">{l}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
