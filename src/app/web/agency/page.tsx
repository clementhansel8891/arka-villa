"use client";

import { motion } from "framer-motion";
import {
  Building2,
  CalendarCheck,
  DollarSign,
  BarChart3,
  Users,
  TrendingUp,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  AlertTriangle,
  Wrench,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Agency Dashboard — Overview Page
 * Comprehensive portfolio analytics with charts, metrics, and activity feed.
 */

// ─── Mock Data ────────────────────────────────────────────────

const METRICS = [
  { label: "Total Villas", value: "12", icon: Building2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { label: "Active Bookings", value: "28", change: +12, icon: CalendarCheck, color: "text-blue-400", bg: "bg-blue-400/10" },
  { label: "Monthly Revenue", value: "$47.8K", change: +8.5, icon: DollarSign, color: "text-heritage-gold", bg: "bg-heritage-gold/10" },
  { label: "Occupancy", value: "78%", change: +3.2, icon: BarChart3, color: "text-purple-400", bg: "bg-purple-400/10" },
  { label: "Active Staff", value: "24", change: +2, icon: Users, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  { label: "Avg. Rating", value: "4.9", icon: Star, color: "text-yellow-400", bg: "bg-yellow-400/10" },
];

const REVENUE_DATA = [
  { month: "Jan", value: 32400 },
  { month: "Feb", value: 28100 },
  { month: "Mar", value: 35600 },
  { month: "Apr", value: 41200 },
  { month: "May", value: 44800 },
  { month: "Jun", value: 47800 },
];

const OCCUPANCY_DATA = [
  { villa: "Arka Villa", rate: 92 },
  { villa: "Villa Serenity", rate: 85 },
  { villa: "Villa Coral", rate: 100 },
  { villa: "Villa Tropicana", rate: 78 },
  { villa: "Villa Harmony", rate: 65 },
  { villa: "Villa Jade", rate: 58 },
];

const RECENT_BOOKINGS = [
  { id: "AV-0301", guest: "James Whitmore", villa: "Arka Villa", checkIn: "Jun 28", nights: 5, amount: "$2,250", status: "confirmed" },
  { id: "AV-0302", guest: "Yuki Tanaka", villa: "Villa Serenity", checkIn: "Jun 30", nights: 7, amount: "$2,660", status: "confirmed" },
  { id: "AV-0303", guest: "Maria Santos", villa: "Villa Coral", checkIn: "Jul 2", nights: 4, amount: "$2,720", status: "pending" },
  { id: "AV-0304", guest: "Alex Thompson", villa: "Villa Jade", checkIn: "Jul 5", nights: 6, amount: "$1,740", status: "confirmed" },
  { id: "AV-0305", guest: "David Kim", villa: "Villa Tropicana", checkIn: "Jul 8", nights: 3, amount: "$1,560", status: "pending" },
];

const VILLA_PERFORMANCE = [
  { name: "Arka Villa", revenue: "$12,400", bookings: 8, rating: 4.9, status: "excellent" },
  { name: "Villa Serenity", revenue: "$9,800", bookings: 6, rating: 4.8, status: "good" },
  { name: "Villa Coral", revenue: "$8,200", bookings: 5, rating: 5.0, status: "excellent" },
  { name: "Villa Tropicana", revenue: "$7,600", bookings: 4, rating: 4.9, status: "good" },
  { name: "Villa Harmony", revenue: "$5,400", bookings: 3, rating: 4.7, status: "attention" },
  { name: "Villa Jade", revenue: "$4,400", bookings: 2, rating: 4.6, status: "attention" },
];

const ALERTS = [
  { type: "critical", message: "Pool pump overdue at Villa Harmony — 3 days past deadline", time: "2h ago", link: "/web/agency/maintenance" },
  { type: "warning", message: "Staff absence: Komang Dewi did not clock in today", time: "4h ago", link: "/web/agency/staff" },
  { type: "info", message: "3 new job applications received for Operations Manager", time: "6h ago", link: "/web/agency/careers" },
  { type: "success", message: "Villa Coral achieved 100% occupancy this month", time: "1d ago", link: "/web/agency/bookings" },
];

const UPCOMING_CHECKOUTS = [
  { guest: "Lisa Chen", villa: "Arka Villa", date: "Tomorrow", nights: 4 },
  { guest: "Tom Hardy", villa: "Villa Serenity", date: "Jun 28", nights: 5 },
  { guest: "Sophia Lee", villa: "Villa Tropicana", date: "Jun 29", nights: 3 },
];

export default function AgencyDashboardPage() {
  const maxRevenue = Math.max(...REVENUE_DATA.map((d) => d.value));

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-white font-bold">Agency Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/web/agency/bookings" className="text-heritage-gold text-xs uppercase tracking-widest font-bold hover:text-white transition-colors">
            View All Bookings →
          </Link>
        </div>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {METRICS.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border border-white/10 rounded-xl p-4 hover:border-heritage-gold/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-lg", metric.bg)}>
                  <Icon size={16} className={metric.color} />
                </div>
                {metric.change !== undefined && (
                  <span className={cn("text-[10px] font-bold flex items-center gap-0.5", metric.change >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {metric.change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(metric.change)}%
                  </span>
                )}
              </div>
              <p className="text-xl font-serif text-white font-bold">{metric.value}</p>
              <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">{metric.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-serif text-lg">Revenue Trend</h2>
              <p className="text-white/30 text-xs mt-0.5">Last 6 months</p>
            </div>
            <div className="text-right">
              <p className="text-heritage-gold font-serif text-xl font-bold">$229.9K</p>
              <p className="text-emerald-400 text-xs flex items-center gap-1 justify-end"><ArrowUpRight size={10} /> +18.2% YoY</p>
            </div>
          </div>
          {/* Bar Chart */}
          <div className="flex items-end gap-2 h-40">
            {REVENUE_DATA.map((d, i) => {
              const height = (d.value / maxRevenue) * 100;
              return (
                <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="w-full rounded-t-md bg-gradient-to-t from-heritage-gold/60 to-heritage-gold relative group cursor-pointer"
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-heritage-charcoal border border-heritage-gold/30 px-2 py-0.5 text-[9px] text-heritage-gold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap rounded">
                      ${(d.value / 1000).toFixed(1)}K
                    </div>
                  </motion.div>
                  <span className="text-white/30 text-[10px]">{d.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Occupancy by Villa */}
        <div className="border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-serif text-lg">Occupancy by Villa</h2>
              <p className="text-white/30 text-xs mt-0.5">Current month</p>
            </div>
            <p className="text-heritage-gold font-serif text-xl font-bold">78% avg</p>
          </div>
          <div className="space-y-4">
            {OCCUPANCY_DATA.map((villa) => (
              <div key={villa.villa} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">{villa.villa}</span>
                  <span className={cn("text-sm font-bold", villa.rate >= 80 ? "text-emerald-400" : villa.rate >= 60 ? "text-yellow-400" : "text-red-400")}>
                    {villa.rate}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${villa.rate}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={cn("h-full rounded-full", villa.rate >= 80 ? "bg-emerald-400" : villa.rate >= 60 ? "bg-yellow-400" : "bg-red-400")}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Row: Villa Performance + Alerts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Villa Performance Table */}
        <div className="lg:col-span-2 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-serif text-lg">Villa Performance</h2>
            <span className="text-white/20 text-xs">This month</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">Villa</th>
                  <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">Revenue</th>
                  <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">Bookings</th>
                  <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">Rating</th>
                  <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {VILLA_PERFORMANCE.map((villa) => (
                  <tr key={villa.name} className="hover:bg-white/[0.02]">
                    <td className="py-3 text-white font-medium">{villa.name}</td>
                    <td className="py-3 text-right text-heritage-gold">{villa.revenue}</td>
                    <td className="py-3 text-right text-white/60">{villa.bookings}</td>
                    <td className="py-3 text-right text-white/60 flex items-center justify-end gap-1">
                      <Star size={10} className="text-yellow-400 fill-yellow-400" /> {villa.rating}
                    </td>
                    <td className="py-3 text-right">
                      <span className={cn("text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 border rounded", {
                        "text-emerald-400 border-emerald-400/20 bg-emerald-400/5": villa.status === "excellent",
                        "text-blue-400 border-blue-400/20 bg-blue-400/5": villa.status === "good",
                        "text-yellow-400 border-yellow-400/20 bg-yellow-400/5": villa.status === "attention",
                      })}>
                        {villa.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts + Upcoming */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="border border-white/10 rounded-xl p-5">
            <h2 className="text-white font-serif text-lg mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-yellow-400" /> Alerts
            </h2>
            <div className="space-y-3">
              {ALERTS.map((alert, i) => (
                <Link key={i} href={alert.link} className="flex items-start gap-3 group">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", {
                    "bg-red-400": alert.type === "critical",
                    "bg-yellow-400": alert.type === "warning",
                    "bg-blue-400": alert.type === "info",
                    "bg-emerald-400": alert.type === "success",
                  })} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white/60 text-xs group-hover:text-white transition-colors">{alert.message}</p>
                    <p className="text-white/20 text-[10px] mt-0.5">{alert.time}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming Check-outs */}
          <div className="border border-white/10 rounded-xl p-5">
            <h2 className="text-white font-serif text-lg mb-4 flex items-center gap-2">
              <Clock size={16} className="text-blue-400" /> Upcoming Check-outs
            </h2>
            <div className="space-y-3">
              {UPCOMING_CHECKOUTS.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm">{item.guest}</p>
                    <p className="text-white/30 text-xs">{item.villa} · {item.nights} nights</p>
                  </div>
                  <span className="text-heritage-gold text-xs font-bold">{item.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-serif text-lg">Recent Bookings</h2>
          <Link href="/web/agency/bookings" className="text-heritage-gold text-xs uppercase tracking-widest hover:text-white transition-colors">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">ID</th>
                <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">Guest</th>
                <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">Villa</th>
                <th className="text-left py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">Check-in</th>
                <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">Amount</th>
                <th className="text-right py-2 text-white/30 text-[10px] uppercase tracking-wider font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {RECENT_BOOKINGS.map((booking) => (
                <tr key={booking.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 text-white/40 font-mono text-xs">{booking.id}</td>
                  <td className="py-3 text-white font-medium">{booking.guest}</td>
                  <td className="py-3 text-white/60">{booking.villa}</td>
                  <td className="py-3 text-white/60">{booking.checkIn} · {booking.nights}n</td>
                  <td className="py-3 text-right text-heritage-gold font-medium">{booking.amount}</td>
                  <td className="py-3 text-right">
                    <span className={cn("text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 border rounded", {
                      "text-emerald-400 border-emerald-400/20 bg-emerald-400/5": booking.status === "confirmed",
                      "text-yellow-400 border-yellow-400/20 bg-yellow-400/5": booking.status === "pending",
                    })}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Bookings", href: "/web/agency/bookings", icon: CalendarCheck, color: "text-blue-400" },
          { label: "Financial", href: "/web/agency/financial", icon: DollarSign, color: "text-heritage-gold" },
          { label: "Staff", href: "/web/agency/staff", icon: Users, color: "text-cyan-400" },
          { label: "Maintenance", href: "/web/agency/maintenance", icon: Wrench, color: "text-orange-400" },
          { label: "Careers", href: "/web/agency/careers", icon: Briefcase, color: "text-purple-400" },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:border-heritage-gold/30 hover:bg-heritage-gold/5 transition-colors group"
            >
              <Icon size={18} className={action.color} />
              <span className="text-white/60 text-sm group-hover:text-white transition-colors">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
