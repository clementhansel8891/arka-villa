"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Check } from "lucide-react";

export default function SettingsPanel() {
  const [saved, setSaved] = useState(false);
  const [villa, setVilla] = useState({ name: "Arka Villa", tagline: "Where Ancient Bali Meets Modern Luxury", location: "Jl. Raya Ubud No. 1, Ubud, Gianyar, Bali 80571, Indonesia", phone: "+62 812 3456 7890", email: "concierge@heritagehaven.com", checkIn: "14:00", checkOut: "12:00", currency: "USD" });
  const [pricing, setPricing] = useState({ royalSuite: 1200, jungleVilla: 950, lotusLounge: 750, taxRate: 11, serviceFee: 8 });
  const [notif, setNotif] = useState({ newBooking: true, cancelBooking: true, newReview: true, lowOccupancy: false, weeklyReport: true });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await new Promise((r) => setTimeout(r, 700));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const inputCls = "w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-heritage-gold/50 transition-colors placeholder:text-white/20";
  const Label = ({ children }: { children: React.ReactNode }) => <label className="text-white/30 text-[10px] uppercase tracking-widest block mb-2">{children}</label>;

  return (
    <form onSubmit={handleSave} className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h2 className="text-white font-serif text-2xl">Settings</h2><p className="text-white/30 text-xs mt-1">Villa configuration and notifications</p></div>
        <motion.button type="submit" whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-2 px-6 py-3 text-xs uppercase tracking-widest font-bold transition-all duration-300 ${saved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-heritage-gold text-heritage-charcoal hover:bg-white"}`}>
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save Changes</>}
        </motion.button>
      </div>

      {/* Villa Info */}
      <section className="bg-white/3 border border-white/5 p-6 space-y-4">
        <h3 className="text-white font-serif text-lg mb-5">Villa Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Villa Name</Label><input type="text" value={villa.name} onChange={(e) => setVilla({ ...villa, name: e.target.value })} className={inputCls} /></div>
          <div><Label>Tagline</Label><input type="text" value={villa.tagline} onChange={(e) => setVilla({ ...villa, tagline: e.target.value })} className={inputCls} /></div>
        </div>
        <div><Label>Address</Label><input type="text" value={villa.location} onChange={(e) => setVilla({ ...villa, location: e.target.value })} className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Phone / WhatsApp</Label><input type="tel" value={villa.phone} onChange={(e) => setVilla({ ...villa, phone: e.target.value })} className={inputCls} /></div>
          <div><Label>Concierge Email</Label><input type="email" value={villa.email} onChange={(e) => setVilla({ ...villa, email: e.target.value })} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Check-In Time</Label><input type="time" value={villa.checkIn} onChange={(e) => setVilla({ ...villa, checkIn: e.target.value })} className={inputCls} /></div>
          <div><Label>Check-Out Time</Label><input type="time" value={villa.checkOut} onChange={(e) => setVilla({ ...villa, checkOut: e.target.value })} className={inputCls} /></div>
          <div><Label>Currency</Label>
            <select value={villa.currency} onChange={(e) => setVilla({ ...villa, currency: e.target.value })} className={`${inputCls} cursor-pointer`}>
              {["USD","EUR","SGD","AUD","GBP"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white/3 border border-white/5 p-6 space-y-4">
        <h3 className="text-white font-serif text-lg mb-5">Pricing Configuration</h3>
        <div className="grid grid-cols-3 gap-4">
          {[["Royal Heritage Suite", "royalSuite"], ["Jungle Horizon Villa", "jungleVilla"], ["Sacred Lotus Pavilion", "lotusLounge"]].map(([label, key]) => (
            <div key={key as string}><Label>{label} ($/night)</Label>
              <input type="number" min={0} value={pricing[key as keyof typeof pricing]} onChange={(e) => setPricing({ ...pricing, [key]: Number(e.target.value) })} className={inputCls} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Tax Rate (%)</Label><input type="number" min={0} max={100} value={pricing.taxRate} onChange={(e) => setPricing({ ...pricing, taxRate: Number(e.target.value) })} className={inputCls} /></div>
          <div><Label>Service Fee (%)</Label><input type="number" min={0} max={100} value={pricing.serviceFee} onChange={(e) => setPricing({ ...pricing, serviceFee: Number(e.target.value) })} className={inputCls} /></div>
        </div>
        <div className="bg-heritage-gold/5 border border-heritage-gold/20 p-4">
          <p className="text-heritage-gold text-[10px] uppercase tracking-widest mb-2">Effective Rate Example — Royal Suite, 3 nights</p>
          <p className="text-white text-sm">
            Base: <span className="text-white/60">${(pricing.royalSuite * 3).toLocaleString()}</span>
            {" "}+ Tax: <span className="text-white/60">${((pricing.royalSuite * 3) * pricing.taxRate / 100).toFixed(0)}</span>
            {" "}+ Service: <span className="text-white/60">${((pricing.royalSuite * 3) * pricing.serviceFee / 100).toFixed(0)}</span>
            {" "}= <span className="text-heritage-gold font-serif">${((pricing.royalSuite * 3) * (1 + pricing.taxRate / 100 + pricing.serviceFee / 100)).toFixed(0)}</span>
          </p>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white/3 border border-white/5 p-6">
        <h3 className="text-white font-serif text-lg mb-6">Admin Notifications</h3>
        <div className="space-y-4">
          {[
            ["newBooking", "New Booking Received", "Alert when a new reservation is submitted"],
            ["cancelBooking", "Booking Cancellation", "Alert when a guest cancels their booking"],
            ["newReview", "New Guest Review", "Alert when a review is posted"],
            ["lowOccupancy", "Low Occupancy Warning", "Alert when occupancy drops below 70%"],
            ["weeklyReport", "Weekly Performance Report", "Receive a weekly email digest every Monday"],
          ].map(([key, title, desc]) => (
            <div key={key as string} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div>
                <p className="text-white text-sm">{title as string}</p>
                <p className="text-white/30 text-xs mt-0.5">{desc as string}</p>
              </div>
              <button type="button" onClick={() => setNotif({ ...notif, [key as string]: !notif[key as keyof typeof notif] })}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${notif[key as keyof typeof notif] ? "bg-heritage-gold" : "bg-white/10"}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${notif[key as keyof typeof notif] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </form>
  );
}
