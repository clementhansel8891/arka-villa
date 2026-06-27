"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  DollarSign,
  BarChart3,
  Star,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  ChevronDown,
  Users,
  Wrench,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OwnerShell from "@/components/dashboard/owner/OwnerShell";
import { useAuth } from "@/context/AuthContext";

/**
 * Owner Portal — Main Dashboard
 * Portfolio overview with charts, revenue, occupancy, and property insights.
 */

const VILLAS = [
  { id: "villa-001", name: "Arka Villa", location: "Ubud, Bali" },
  { id: "villa-002", name: "Surya Villa", location: "Canggu, Bali" },
  { id: "villa-003", name: "Chandra Villa", location: "Seminyak, Bali" },
];

const VILLA_DATA: Record<string, {
  occupancy: number;
  revenue: number;
  expenses: number;
  bookings: number;
  rating: number;
  reviews: number;
  maintenance: { open: number; critical: number };
  revenueByMonth: { month: string; value: number }[];
  upcomingBookings: { guest: string; checkIn: string; nights: number; amount: number }[];
}> = {
  "villa-001": {
    occupancy: 88,
    revenue: 67000,
    expenses: 22400,
    bookings: 8,
    rating: 4.9,
    reviews: 127,
    maintenance: { open: 3, critical: 1 },
    revenueByMonth: [
      { month: "Jan", value: 68000 },
      { month: "Feb", value: 62000 },
      { month: "Mar", value: 58000 },
      { month: "Apr", value: 64000 },
      { month: "May", value: 55000 },
      { month: "Jun", value: 67000 },
    ],
    upcomingBookings: [
      { guest: "James Whitmore", checkIn: "Jun 28", nights: 5, amount: 2250 },
      { guest: "Yuki Tanaka", checkIn: "Jul 2", nights: 7, amount: 2660 },
      { guest: "Maria Santos", checkIn: "Jul 12", nights: 4, amount: 1800 },
    ],
  },
  "villa-002": {
    occupancy: 72,
    revenue: 48000,
    expenses: 16800,
    bookings: 5,
    rating: 4.6,
    reviews: 84,
    maintenance: { open: 1, critical: 0 },
    revenueByMonth: [
      { month: "Jan", value: 49000 },
      { month: "Feb", value: 45000 },
      { month: "Mar", value: 42000 },
      { month: "Apr", value: 46000 },
      { month: "May", value: 43000 },
      { month: "Jun", value: 48000 },
    ],
    upcomingBookings: [
      { guest: "Alex Chen", checkIn: "Jul 1", nights: 3, amount: 1140 },
      { guest: "Sophie Martin", checkIn: "Jul 10", nights: 4, amount: 1520 },
    ],
  },
  "villa-003": {
    occupancy: 95,
    revenue: 89000,
    expenses: 28500,
    bookings: 7,
    rating: 4.9,
    reviews: 156,
    maintenance: { open: 0, critical: 0 },
    revenueByMonth: [
      { month: "Jan", value: 88000 },
      { month: "Feb", value: 82000 },
      { month: "Mar", value: 76000 },
      { month: "Apr", value: 84000 },
      { month: "May", value: 79000 },
      { month: "Jun", value: 89000 },
    ],
    upcomingBookings: [
      { guest: "Emma Thompson", checkIn: "Jun 27", nights: 4, amount: 2720 },
      { guest: "Liam O'Brien", checkIn: "Jul 7", nights: 5, amount: 3400 },
      { guest: "Anna Kowalski", checkIn: "Jul 14", nights: 3, amount: 2040 },
    ],
  },
};

export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [selectedVilla, setSelectedVilla] = useState(VILLAS[0].id);
  const [villaDropdownOpen, setVillaDropdownOpen] = useState(false);

  const villa = VILLAS.find((v) => v.id === selectedVilla)!;
  const data = VILLA_DATA[selectedVilla];
  const netIncome = data.revenue - data.expenses;
  const maxRevenue = Math.max(...data.revenueByMonth.map((m) => m.value));

  // Portfolio totals
  const totalRevenue = Object.values(VILLA_DATA).reduce((s, d) => s + d.revenue, 0);
  const totalNet = Object.values(VILLA_DATA).reduce((s, d) => s + d.revenue - d.expenses, 0);

  return (
    <OwnerShell activeNav="dashboard">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-white font-bold">Welcome back, {user?.name?.split(" ")[0]}</h1>
            <p className="text-white/40 text-sm mt-1">
              Portfolio: {VILLAS.length} villas · ${(totalRevenue / 1000).toFixed(0)}K monthly revenue · ${(totalNet / 1000).toFixed(0)}K net income
            </p>
          </div>

          {/* Villa Selector */}
          <div className="relative">
            <button
              onClick={() => setVillaDropdownOpen(!villaDropdownOpen)}
              className="flex items-center gap-2 border border-heritage-gold/30 text-heritage-gold px-4 py-2.5 text-sm hover:bg-heritage-gold/10 transition-colors"
            >
              <Building2 size={14} />
              {villa.name}
              <ChevronDown size={14} className={cn("transition-transform", villaDropdownOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {villaDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 z-20 bg-[#1A1A1A] border border-white/10 shadow-xl min-w-[200px]"
                >
                  {VILLAS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVilla(v.id); setVillaDropdownOpen(false); }}
                      className={cn(
                        "w-full text-left px-4 py-3 text-sm transition-colors",
                        v.id === selectedVilla ? "text-heritage-gold bg-heritage-gold/10" : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <p>{v.name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{v.location}</p>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Key Metrics for selected villa */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: "Revenue (MTD)", value: `$${(data.revenue / 1000).toFixed(0)}K`, icon: DollarSign, color: "text-heritage-gold" },
            { label: "Net Income", value: `$${(netIncome / 1000).toFixed(0)}K`, icon: TrendingUp, color: "text-emerald-400" },
            { label: "Occupancy", value: `${data.occupancy}%`, icon: BarChart3, color: data.occupancy >= 80 ? "text-emerald-400" : "text-yellow-400" },
            { label: "Bookings", value: String(data.bookings), icon: CalendarCheck, color: "text-blue-400" },
            { label: "Rating", value: String(data.rating), icon: Star, color: "text-yellow-400" },
            { label: "Open Issues", value: String(data.maintenance.open), icon: data.maintenance.critical > 0 ? AlertTriangle : CheckCircle2, color: data.maintenance.critical > 0 ? "text-red-400" : "text-emerald-400" },
          ].map((metric, i) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border border-white/10 rounded-xl p-4"
              >
                <Icon size={14} className={cn(metric.color, "mb-2")} />
                <p className="text-xl font-serif text-white font-bold">{metric.value}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">{metric.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-serif text-lg">{villa.name} — Revenue</h2>
              <span className="text-heritage-gold text-sm font-bold">${(data.revenueByMonth.reduce((s, m) => s + m.value, 0) / 1000).toFixed(0)}K YTD</span>
            </div>
            <div className="flex items-end gap-2 h-36">
              {data.revenueByMonth.map((m, i) => {
                const h = (m.value / maxRevenue) * 100;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.08, duration: 0.5 }}
                      className="w-full bg-gradient-to-t from-heritage-gold/50 to-heritage-gold rounded-t-sm relative group cursor-pointer"
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-heritage-gold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ${(m.value / 1000).toFixed(0)}K
                      </div>
                    </motion.div>
                    <span className="text-white/30 text-[10px]">{m.month}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-serif text-lg">Expense Breakdown</h2>
              <span className="text-red-400/70 text-sm">${(data.expenses / 1000).toFixed(1)}K this month</span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Staff Wages", pct: 44, amount: Math.round(data.expenses * 0.44) },
                { label: "Maintenance", pct: 19, amount: Math.round(data.expenses * 0.19) },
                { label: "Utilities", pct: 14, amount: Math.round(data.expenses * 0.14) },
                { label: "Supplies", pct: 12, amount: Math.round(data.expenses * 0.12) },
                { label: "Marketing", pct: 7, amount: Math.round(data.expenses * 0.07) },
                { label: "Insurance", pct: 4, amount: Math.round(data.expenses * 0.04) },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">{item.label}</span>
                    <span className="text-white/40">${(item.amount / 1000).toFixed(1)}K ({item.pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 0.6 }}
                      className="h-full rounded-full bg-red-400/60"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4">Upcoming Bookings — {villa.name}</h2>
          <div className="space-y-3">
            {data.upcomingBookings.map((booking, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white text-sm font-medium">{booking.guest}</p>
                  <p className="text-white/30 text-xs">{booking.checkIn} · {booking.nights} nights</p>
                </div>
                <span className="text-heritage-gold font-medium">${booking.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Comparison */}
        <div className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4">All Properties — Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider">Villa</th>
                  <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider">Revenue</th>
                  <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider">Net Income</th>
                  <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider">Occupancy</th>
                  <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {VILLAS.map((v) => {
                  const d = VILLA_DATA[v.id];
                  return (
                    <tr key={v.id} className={cn("hover:bg-white/[0.02]", v.id === selectedVilla && "bg-heritage-gold/5")}>
                      <td className="py-3 text-white font-medium">{v.name}<span className="text-white/30 text-xs ml-2">{v.location}</span></td>
                      <td className="py-3 text-right text-heritage-gold">${(d.revenue / 1000).toFixed(0)}K</td>
                      <td className="py-3 text-right text-emerald-400">${((d.revenue - d.expenses) / 1000).toFixed(0)}K</td>
                      <td className="py-3 text-right">
                        <span className={cn(d.occupancy >= 80 ? "text-emerald-400" : "text-yellow-400")}>{d.occupancy}%</span>
                      </td>
                      <td className="py-3 text-right text-white/60 flex items-center justify-end gap-1">
                        <Star size={10} className="text-yellow-400 fill-yellow-400" /> {d.rating}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </OwnerShell>
  );
}
