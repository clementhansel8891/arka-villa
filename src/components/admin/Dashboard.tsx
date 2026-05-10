"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, BarChart2, BedDouble, Users, Star, Settings, Bell, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import OverviewPanel from "./panels/OverviewPanel";
import BookingsPanel from "./panels/BookingsPanel";
import GuestsPanel from "./panels/GuestsPanel";
import StaffPanel from "./panels/StaffPanel";
import RoomsPanel from "./panels/RoomsPanel";
import ReviewsPanel from "./panels/ReviewsPanel";
import SettingsPanel from "./panels/SettingsPanel";

const NAV_ITEMS = [
  { icon: Home, label: "Overview", id: "overview" },
  { icon: BarChart2, label: "Bookings", id: "bookings" },
  { icon: BedDouble, label: "Rooms", id: "rooms" },
  { icon: Users, label: "Guests", id: "guests" },
  { icon: Users, label: "Staff", id: "staff" },
  { icon: Star, label: "Reviews", id: "reviews" },
  { icon: Settings, label: "Settings", id: "settings" },
];

const PANEL_TITLES: Record<string, string> = {
  overview: "Performance Overview",
  bookings: "Bookings Manager",
  rooms: "Room Management",
  guests: "Guest Registry",
  staff: "Staff Management",
  reviews: "Guest Reviews",
  settings: "Settings",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role === "guest") { router.push("/profile"); }
  }, [user, router]);

  if (!user || user.role === "guest") return null;

  const panel = (() => {
    switch (activeNav) {
      case "overview": return <OverviewPanel />;
      case "bookings": return <BookingsPanel />;
      case "rooms": return <RoomsPanel />;
      case "guests": return <GuestsPanel />;
      case "staff": return <StaffPanel />;
      case "reviews": return <ReviewsPanel />;
      case "settings": return <SettingsPanel />;
      default: return <OverviewPanel />;
    }
  })();

  return (
    <div className="flex h-screen bg-[#0E0E0E] text-white overflow-hidden font-sans">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:relative z-30 h-full w-64 flex-shrink-0 border-r border-white/5 flex flex-col bg-[#0A0A0A] transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Brand */}
        <div className="p-6 border-b border-white/5">
          <p className="text-heritage-gold font-serif text-xl leading-none">Arka Villa</p>
          <p className="text-white/30 text-[10px] uppercase tracking-widest mt-1">Admin Console</p>
        </div>

        {/* Back to Site — Re-reverted version styling */}
        <button onClick={() => router.push("/")}
          className="flex items-center gap-3 px-6 py-3 text-xs text-white/40 hover:text-heritage-gold hover:bg-heritage-gold/5 transition-all duration-200 border-b border-white/5 group">
          <Home size={13} className="group-hover:text-heritage-gold" />
          <span className="uppercase tracking-widest">← Back to Site</span>
        </button>

        {/* User */}
        <div className="px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-heritage-gold/30 to-heritage-gold/10 border border-heritage-gold/20 flex items-center justify-center text-heritage-gold font-serif flex-shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm truncate">{user.name}</p>
              <p className="text-heritage-gold text-[10px] uppercase tracking-wider capitalize">{user.position ?? user.role}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ icon: Icon, label, id }) => {
            if (user.role === "staff" && ["staff", "settings"].includes(id)) return null;
            return (
              <button key={id} onClick={() => { setActiveNav(id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 ${activeNav === id ? "bg-heritage-gold/10 text-heritage-gold border-l-2 border-heritage-gold" : "text-white/40 hover:text-white/70 hover:bg-white/3 border-l-2 border-transparent"}`}>
                <Icon size={15} />{label}
                {activeNav === id && <ChevronRight size={12} className="ml-auto opacity-50" />}
              </button>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-3 border-t border-white/5">
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400/50 hover:text-red-400 hover:bg-red-400/5 transition-colors">
            <LogOut size={15} />Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-10 bg-[#0E0E0E]/90 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-white/40 hover:text-white" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <div>
              <h1 className="text-lg font-serif text-white">{PANEL_TITLES[activeNav]}</h1>
              <p className="text-white/30 text-[9px] uppercase tracking-widest mt-0.5">Arka Villa · May 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="hidden md:flex items-center gap-2 text-white/30 hover:text-white/70 text-xs uppercase tracking-widest transition-colors border border-white/10 hover:border-white/30 px-3 py-1.5">
              <Home size={12} />Home
            </button>
            <button className="relative p-2 text-white/40 hover:text-white transition-colors">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-heritage-gold rounded-full flex items-center justify-center text-heritage-charcoal text-[9px] font-bold">3</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-heritage-gold/20 border border-heritage-gold/30 flex items-center justify-center text-heritage-gold text-xs font-bold">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeNav} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {panel}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
