"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  BarChart2, 
  BedDouble, 
  Users, 
  Star, 
  Settings, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight,
  ShieldCheck,
  LayoutDashboard
} from "lucide-react";
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
  { icon: LayoutDashboard, label: "Overview", id: "overview" },
  { icon: BarChart2, label: "Bookings", id: "bookings" },
  { icon: BedDouble, label: "Rooms", id: "rooms" },
  { icon: Users, label: "Guests", id: "guests" },
  { icon: ShieldCheck, label: "Staff", id: "staff" },
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

  if (!user || user.role === "guest") return (
    <div className="h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );

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
    <div className="flex h-screen bg-[#0E0E0E] text-white overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative z-50 h-full w-72 flex-shrink-0 
        bg-[#0A0A0A] border-r border-white/5 flex flex-col 
        transition-transform duration-500 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Brand Section */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-b from-white/3 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-heritage-gold flex items-center justify-center rounded-none transform rotate-45">
              <div className="transform -rotate-45 text-heritage-charcoal font-serif font-bold text-xl">A</div>
            </div>
            <div>
              <p className="text-white font-serif text-2xl tracking-tighter leading-none">Arka Villa</p>
              <p className="text-heritage-gold text-[9px] uppercase tracking-[0.3em] mt-1.5 font-bold">Administration</p>
            </div>
          </div>
        </div>

        {/* Back to Home Button — High Visibility */}
        <div className="px-6 py-4">
          <button 
            onClick={() => router.push("/")}
            className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300 text-[10px] uppercase tracking-widest font-bold"
          >
            <Home size={12} />
            Back to Public Site
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="px-4 mb-4 mt-2">
          <p className="text-white/20 text-[9px] uppercase tracking-[0.2em] px-4 mb-4 font-bold">Management Menu</p>
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ icon: Icon, label, id }) => {
              const isLocked = user.role === "staff" && ["staff", "settings"].includes(id);
              if (isLocked) return null;
              
              const isActive = activeNav === id;
              return (
                <button 
                  key={id} 
                  onClick={() => { setActiveNav(id); setSidebarOpen(false); }}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3.5 rounded-none transition-all duration-300 group
                    ${isActive 
                      ? "bg-heritage-gold/10 text-heritage-gold border-r-4 border-heritage-gold" 
                      : "text-white/40 hover:text-white hover:bg-white/3 border-r-4 border-transparent"}
                  `}
                >
                  <Icon size={18} className={isActive ? "text-heritage-gold" : "text-white/20 group-hover:text-white/60 transition-colors"} />
                  <span className={`text-sm tracking-wide ${isActive ? "font-medium" : "font-light"}`}>{label}</span>
                  {isActive && (
                    <motion.div layoutId="nav-glow" className="ml-auto w-1 h-1 rounded-full bg-heritage-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile / Logout */}
        <div className="mt-auto p-6 border-t border-white/5 bg-[#080808]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-heritage-gold/20 border border-heritage-gold/30 flex items-center justify-center text-heritage-gold font-serif font-bold text-lg">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-heritage-gold text-[10px] uppercase tracking-widest">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-2 py-3 border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 text-[10px] uppercase tracking-widest font-bold"
          >
            <LogOut size={13} />
            Sign Out Session
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-[#0E0E0E]/80 backdrop-blur-xl border-b border-white/5 px-8 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden w-10 h-10 flex items-center justify-center text-white/60 hover:text-white border border-white/10 rounded-none bg-white/5" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            
            <div>
              <h1 className="text-xl font-serif text-white tracking-wide">{PANEL_TITLES[activeNav]}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-white/30 text-[10px] uppercase tracking-widest">System Operational · Ubud Local Time</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <p className="text-white/60 text-xs font-medium">{user.name}</p>
              <p className="text-heritage-gold text-[9px] uppercase tracking-widest">{user.position ?? user.role}</p>
            </div>
            <button className="relative p-2.5 text-white/40 hover:text-white border border-white/10 transition-colors bg-white/3">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-heritage-gold rounded-full flex items-center justify-center text-heritage-charcoal text-[9px] font-bold">2</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeNav} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {panel}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
