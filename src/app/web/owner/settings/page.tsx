"use client";

import { useState } from "react";
import { User, Bell, Shield, CreditCard, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import OwnerShell from "@/components/dashboard/owner/OwnerShell";

/**
 * Owner Portal — Settings Page
 */

export default function OwnerSettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  return (
    <OwnerShell activeNav="settings">
      <div className="space-y-8 max-w-3xl">
        <header>
          <h1 className="text-2xl font-serif text-white font-bold">Settings</h1>
          <p className="text-white/40 text-sm mt-1">Manage your account and preferences</p>
        </header>

        {/* Profile */}
        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4 flex items-center gap-2">
            <User size={18} className="text-heritage-gold" /> Profile
          </h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-heritage-gold/20 border border-heritage-gold/30 flex items-center justify-center text-heritage-gold font-serif text-2xl font-bold">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <p className="text-white font-medium text-lg">{user?.name}</p>
              <p className="text-white/40 text-sm">{user?.email}</p>
              <p className="text-heritage-gold text-xs uppercase tracking-wider mt-0.5">Villa Owner</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Full Name" defaultValue={user?.name || ""} />
            <Field label="Email" defaultValue={user?.email || ""} type="email" />
            <Field label="Phone" defaultValue={user?.phone || "+65 9123 4567"} />
            <Field label="Nationality" defaultValue={user?.nationality || "Singaporean"} />
          </div>
        </section>

        {/* Notifications */}
        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4 flex items-center gap-2">
            <Bell size={18} className="text-heritage-gold" /> Notifications
          </h2>
          <div className="space-y-4">
            <Toggle label="Booking confirmations" description="Get notified when a guest books your villa" defaultChecked />
            <Toggle label="Monthly financial reports" description="Receive revenue and expense summaries" defaultChecked />
            <Toggle label="Maintenance updates" description="Know when repairs are completed on your property" defaultChecked />
            <Toggle label="Guest reviews" description="Be notified when guests leave a review" defaultChecked />
            <Toggle label="Occupancy alerts" description="Get alerted when occupancy drops below 50%" defaultChecked={false} />
          </div>
        </section>

        {/* Payment */}
        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4 flex items-center gap-2">
            <CreditCard size={18} className="text-heritage-gold" /> Payout Settings
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Bank Name" defaultValue="DBS Bank" />
            <Field label="Account Number" defaultValue="••••••7890" type="password" />
            <Field label="Payout Frequency" defaultValue="Monthly (1st of each month)" />
            <Field label="Currency" defaultValue="USD" />
          </div>
        </section>

        {/* Security */}
        <section className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4 flex items-center gap-2">
            <Shield size={18} className="text-heritage-gold" /> Security
          </h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <Field label="Current Password" defaultValue="" type="password" placeholder="••••••••" />
            <Field label="New Password" defaultValue="" type="password" placeholder="Leave blank to keep" />
          </div>
          <div className="space-y-4">
            <Toggle label="Two-Factor Authentication" description="Extra security for your account" defaultChecked />
            <Toggle label="Login notifications" description="Email me when a new device signs in" defaultChecked />
          </div>
        </section>

        {/* Save */}
        <button
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className="flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors"
        >
          <Save size={14} />
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>
    </OwnerShell>
  );
}

function Field({ label, defaultValue = "", type = "text", placeholder }: { label: string; defaultValue?: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">{label}</label>
      <input
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-lg focus:outline-none focus:border-heritage-gold/50 placeholder:text-white/30"
      />
    </div>
  );
}

function Toggle({ label, description, defaultChecked = false }: { label: string; description: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-white text-sm">{label}</p>
        <p className="text-white/30 text-xs mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => setChecked(!checked)}
        className={cn(
          "w-10 h-5 rounded-full transition-colors relative",
          checked ? "bg-heritage-gold" : "bg-white/10"
        )}
      >
        <span className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )} />
      </button>
    </div>
  );
}
