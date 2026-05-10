"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Eye, EyeOff } from "lucide-react";
import { getAllStaff, registerStaff, User } from "@/lib/auth";

const DEPARTMENTS = ["Management", "Hospitality", "Wellness", "F&B", "Maintenance", "Security", "Concierge"];
const POSITIONS = ["General Manager", "Villa Attendant", "Spa Therapist", "Chef", "Butler", "Housekeeper", "Security Officer", "Concierge Agent", "Receptionist"];

const SHIFT_COLORS: Record<string, string> = {
  Morning: "text-amber-400 bg-amber-400/10",
  Afternoon: "text-blue-400 bg-blue-400/10",
  Evening: "text-purple-400 bg-purple-400/10",
  Off: "text-white/30 bg-white/5",
};

const MOCK_THIS_WEEK: Record<string, { shifts: number; hours: number; overtime: number }> = {
  "admin-001": { shifts: 5, hours: 42, overtime: 3 },
  "staff-001": { shifts: 5, hours: 41, overtime: 4 },
  "staff-002": { shifts: 5, hours: 40, overtime: 2 },
};

export default function StaffPanel() {
  const [staff, setStaff] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { setStaff(getAllStaff()); }, []);

  const onStaffAdded = (newUser: User) => {
    setStaff((prev) => [...prev, newUser]);
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-serif text-2xl">Staff Management</h2>
          <p className="text-white/30 text-xs mt-1">{staff.length} team members</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-5 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors">
          <UserPlus size={14} /> Add Staff
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {staff.map((s, i) => {
          const week = MOCK_THIS_WEEK[s.id] ?? { shifts: 0, hours: 0, overtime: 0 };
          const monthlyBase = (s.hourlyRate ?? 0) * 160;
          const monthlyOT = (s.hourlyRate ?? 0) * 1.5 * (week.overtime * 4);
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-white/3 border border-white/5 p-6 hover:border-heritage-gold/20 transition-colors">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-heritage-gold/20 to-heritage-green/20 border border-heritage-gold/20 flex items-center justify-center text-heritage-gold font-serif text-xl flex-shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{s.name}</p>
                  <p className="text-heritage-gold text-xs mt-0.5">{s.position}</p>
                  <p className="text-white/30 text-xs">{s.department}</p>
                </div>
                <span className={`text-[10px] uppercase px-2 py-1 tracking-wider ${s.role === "admin" ? "bg-heritage-gold/20 text-heritage-gold" : "bg-white/5 text-white/40"}`}>
                  {s.role}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[["Shifts", week.shifts], ["Hours", week.hours], ["OT Hrs", week.overtime]].map(([l, v]) => (
                  <div key={l as string} className="bg-white/3 border border-white/5 p-2.5 text-center">
                    <p className="text-white text-base font-serif">{v}</p>
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mt-0.5">{l}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-4 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/30">Rate</span>
                  <span className="text-white">${s.hourlyRate}/hr</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/30">Base Monthly</span>
                  <span className="text-white">${monthlyBase.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/30">OT Pay</span>
                  <span className="text-emerald-400">+${monthlyOT.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/5 pt-2 mt-2">
                  <span className="text-white/40 uppercase tracking-wider">Est. Total</span>
                  <span className="text-heritage-gold font-serif">${(monthlyBase + monthlyOT).toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-white/20 text-[9px] uppercase tracking-widest mb-2">Since {s.startDate}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showModal && <AddStaffModal onClose={() => setShowModal(false)} onSuccess={onStaffAdded} />}
      </AnimatePresence>
    </div>
  );
}

function AddStaffModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (u: User) => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", position: "", department: "", startDate: new Date().toISOString().split("T")[0], hourlyRate: 45 });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    const { user, error: err } = registerStaff({ ...form, hourlyRate: Number(form.hourlyRate) });
    setLoading(false);
    if (err) { setError(err); return; }
    if (user) onSuccess(user);
  };

  const inputCls = "w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-heritage-gold/50 transition-colors placeholder:text-white/20";

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 z-40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0E0E0E] border border-white/10 w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div><h3 className="text-white font-serif text-2xl">Add Staff Member</h3><p className="text-white/30 text-xs mt-1">New account will receive login credentials</p></div>
            <button onClick={onClose} className="text-white/30 hover:text-white"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Full Name *</label>
                <input type="text" required placeholder="Nyoman Wijaya" value={form.name} onChange={set("name")} className={inputCls} /></div>
              <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Email *</label>
                <input type="email" required placeholder="nyoman@heritagehaven.com" value={form.email} onChange={set("email")} className={inputCls} /></div>
            </div>
            <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Temporary Password *</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} required placeholder="Min. 6 characters" value={form.password} onChange={set("password")} className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Position</label>
                <select value={form.position} onChange={set("position")} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select position</option>
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select></div>
              <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Department</label>
                <select value={form.department} onChange={set("department")} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Start Date</label>
                <input type="date" value={form.startDate} onChange={set("startDate")} className={inputCls} /></div>
              <div><label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">Hourly Rate (USD)</label>
                <input type="number" min={0} placeholder="45" value={form.hourlyRate} onChange={set("hourlyRate")} className={inputCls} /></div>
            </div>

            {error && <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 px-4 py-3">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 border border-white/20 text-white/50 py-3 text-xs uppercase tracking-widest hover:border-white/40 transition-colors">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 bg-heritage-gold text-heritage-charcoal py-3 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <span className="w-4 h-4 border-2 border-heritage-charcoal border-t-transparent rounded-full animate-spin" /> : "Create Staff Account"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
}
