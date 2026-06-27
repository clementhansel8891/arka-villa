"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Shield, Calendar, Briefcase, Building2, Save, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

/**
 * Staff Portal — Profile Page
 * View and edit personal information.
 */

export default function StaffProfilePage() {
  const { user, updateUser } = useAuth();
  const [phone, setPhone] = useState(user?.phone || "+62 812 3456 7890");
  const [emergencyContact, setEmergencyContact] = useState("Nyoman Ari — +62 813 9876 5432");
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  function handleSave() {
    if (user) {
      updateUser({ phone });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-serif text-white font-bold">My Profile</h1>
        <p className="text-sm text-white/40 mt-1">View and update your personal information</p>
      </header>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-white/10 rounded-xl p-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-heritage-gold flex items-center justify-center text-heritage-charcoal text-2xl font-bold">
            {user?.name?.charAt(0) || "?"}
          </div>
          <div>
            <h2 className="text-white text-xl font-serif">{user?.name || "Staff Member"}</h2>
            <p className="text-white/40 text-sm">{user?.position || "Staff"}</p>
            <p className="text-heritage-gold text-xs capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <InfoRow icon={Mail} label="Email" value={user?.email || "—"} />
          <InfoRow icon={Briefcase} label="Position" value={user?.position || "—"} />
          <InfoRow icon={Building2} label="Department" value={user?.department || "—"} />
          <InfoRow icon={Calendar} label="Start Date" value={user?.startDate ? new Date(user.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"} />
          <InfoRow icon={Shield} label="Role" value={user?.role || "—"} />
          <InfoRow icon={User} label="ID" value={user?.id || "—"} />
        </div>
      </motion.div>

      {/* Editable Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border border-white/10 rounded-xl p-6"
      >
        <h3 className="text-white font-serif text-lg mb-4">Contact Information</h3>
        <div className="space-y-4">
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Phone Number</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white text-sm pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
              />
            </div>
          </div>
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Emergency Contact</label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
              placeholder="Name — Phone Number"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-6 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors mt-4"
        >
          <Save size={14} />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </motion.div>

      {/* Change Password */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-white/10 rounded-xl p-6"
      >
        <h3 className="text-white font-serif text-lg mb-4">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Current Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 text-white text-sm pl-9 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
              />
            </div>
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-6 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-white/10 hover:border-white/20 transition-colors"
          >
            <Lock size={14} />
            {passwordSaved ? "Password Updated!" : "Update Password"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon size={14} className="text-white/20 shrink-0" />
      <div>
        <p className="text-white/30 text-[10px] uppercase tracking-wider">{label}</p>
        <p className="text-white text-sm capitalize">{value}</p>
      </div>
    </div>
  );
}
