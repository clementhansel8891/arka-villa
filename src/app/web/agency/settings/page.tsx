"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Globe,
  Bell,
  Shield,
  Palette,
  CreditCard,
  Mail,
  Save,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

/**
 * Agency Settings Page — General configuration, notifications, branding, and billing.
 */

type SettingsTab = "general" | "notifications" | "branding" | "billing" | "security";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "security", label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-serif text-white font-bold">Settings</h1>
        <p className="text-sm text-white/40 mt-1">Manage agency configuration, branding, and preferences</p>
      </header>

      {/* Horizontal Tabs */}
      <nav className="flex gap-1 border-b border-white/10 pb-0 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm transition-colors whitespace-nowrap border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-heritage-gold text-heritage-gold"
                  : "border-transparent text-white/50 hover:text-white hover:border-white/20"
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div className="mt-6">
        {activeTab === "general" && <GeneralSettings />}
        {activeTab === "notifications" && <NotificationSettings />}
        {activeTab === "branding" && <BrandingSettings />}
        {activeTab === "billing" && <BillingSettings />}
        {activeTab === "security" && <SecuritySettings user={user} />}
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-serif text-lg mb-4">Agency Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Agency Name" defaultValue="Arka Villa Management" />
          <Field label="Business Email" defaultValue="hello@arka-villa.com" />
          <Field label="Phone" defaultValue="+62 878 3745 2510" />
          <Field label="Website" defaultValue="https://arka-villa.com" />
          <Field label="Location" defaultValue="Bali, Indonesia" />
          <Field label="Business License" defaultValue="SIUP-2024/VIII/1234" />
        </div>
      </div>

      <div className="border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-serif text-lg mb-4">Operational Settings</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Default Check-in Time" defaultValue="14:00" />
          <Field label="Default Check-out Time" defaultValue="11:00" />
          <Field label="Currency" defaultValue="USD" />
          <Field label="Timezone" defaultValue="Asia/Bali (GMT+8)" />
          <Field label="Commission Rate" defaultValue="20%" />
          <Field label="Booking Window (days)" defaultValue="365" />
        </div>
      </div>

      <SaveButton />
    </motion.div>
  );
}

function NotificationSettings() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-serif text-lg mb-4">Email Notifications</h3>
        <div className="space-y-4">
          <Toggle label="New booking confirmation" description="Receive email when a new booking is made" defaultChecked />
          <Toggle label="Booking cancellation" description="Get notified when a guest cancels" defaultChecked />
          <Toggle label="Guest check-in reminder" description="24h before guest arrives" defaultChecked />
          <Toggle label="Payment received" description="When a payment is processed" defaultChecked />
          <Toggle label="Maintenance overdue" description="When a ticket passes its due date" defaultChecked />
          <Toggle label="New job application" description="When someone applies via careers page" defaultChecked />
          <Toggle label="Weekly performance report" description="Summary of all villas every Monday" defaultChecked={false} />
        </div>
      </div>

      <div className="border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-serif text-lg mb-4">WhatsApp Notifications</h3>
        <div className="space-y-4">
          <Toggle label="VIP guest arrivals" description="Notify team on WhatsApp for priority guests" defaultChecked />
          <Toggle label="Critical maintenance alerts" description="Immediate WhatsApp for urgent issues" defaultChecked />
          <Toggle label="Staff absence alerts" description="When staff doesn't clock in" defaultChecked={false} />
        </div>
      </div>

      <SaveButton />
    </motion.div>
  );
}

function BrandingSettings() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-serif text-lg mb-4">Brand Colors</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Primary (Gold)</label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded bg-heritage-gold border border-white/10" />
              <span className="text-white/60 text-sm font-mono">#D4AF37</span>
            </div>
          </div>
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Background</label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded bg-heritage-charcoal border border-white/10" />
              <span className="text-white/60 text-sm font-mono">#1A1A1A</span>
            </div>
          </div>
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">Accent (Green)</label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded bg-heritage-green border border-white/10" />
              <span className="text-white/60 text-sm font-mono">#2D5016</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-serif text-lg mb-4">Guest-Facing Content</h3>
        <div className="space-y-4">
          <Field label="Tagline" defaultValue="Luxury Villa Collection · Bali" />
          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-2">About Us (short)</label>
            <textarea
              defaultValue="A premier luxury villa management agency in Bali. We curate, manage, and market the finest private villas across the island."
              className="w-full bg-white/5 border border-white/10 text-white text-sm px-4 py-3 rounded-lg focus:outline-none focus:border-heritage-gold/50 resize-none h-20"
            />
          </div>
        </div>
      </div>

      <SaveButton />
    </motion.div>
  );
}

function BillingSettings() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-serif text-lg mb-4">Payment Gateway</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Payment Provider" defaultValue="Xendit (Indonesia)" />
          <Field label="Merchant ID" defaultValue="xnd_••••••••4321" type="password" />
          <Field label="Payout Schedule" defaultValue="Weekly (every Monday)" />
          <Field label="Bank Account" defaultValue="BCA ••••7890" />
        </div>
      </div>

      <div className="border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-serif text-lg mb-4">Pricing Rules</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Agency Commission" defaultValue="20%" />
          <Field label="Peak Season Markup" defaultValue="+30%" />
          <Field label="Long Stay Discount (7+ nights)" defaultValue="-10%" />
          <Field label="Last Minute Discount (48h)" defaultValue="-15%" />
        </div>
      </div>

      <SaveButton />
    </motion.div>
  );
}

function SecuritySettings({ user }: { user: { name?: string; email?: string; role?: string } | null }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-serif text-lg mb-4">Your Account</h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-heritage-gold flex items-center justify-center text-heritage-charcoal text-xl font-bold">
            {user?.name?.charAt(0) || "?"}
          </div>
          <div>
            <p className="text-white font-medium">{user?.name}</p>
            <p className="text-white/40 text-sm">{user?.email}</p>
            <p className="text-heritage-gold text-xs capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Current Password" defaultValue="" type="password" placeholder="••••••••" />
          <Field label="New Password" defaultValue="" type="password" placeholder="Leave blank to keep current" />
        </div>
      </div>

      <div className="border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-serif text-lg mb-4">Access Control</h3>
        <div className="space-y-4">
          <Toggle label="Two-Factor Authentication" description="Require 2FA for all admin logins" defaultChecked />
          <Toggle label="IP Whitelisting" description="Restrict dashboard access to specific IPs" defaultChecked={false} />
          <Toggle label="Session Timeout" description="Auto-logout after 30 minutes of inactivity" defaultChecked />
          <Toggle label="Audit Logging" description="Log all admin actions for compliance" defaultChecked />
        </div>
      </div>

      <SaveButton />
    </motion.div>
  );
}

// Reusable components
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

function SaveButton() {
  const [saved, setSaved] = useState(false);
  return (
    <button
      onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
      className="flex items-center gap-2 bg-heritage-gold text-heritage-charcoal px-6 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-white transition-colors"
    >
      <Save size={14} />
      {saved ? "Saved!" : "Save Changes"}
    </button>
  );
}
