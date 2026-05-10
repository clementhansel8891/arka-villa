"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Calendar,
  BarChart2, BedDouble, Star, 
} from "lucide-react";
import { ANALYTICS_DATA } from "@/constants/mockData";

const KPI_CARDS = [
  { label: "Monthly Revenue", value: "$67,000", change: "+21.8%", positive: true, icon: DollarSign, sub: "vs last month" },
  { label: "Occupancy Rate", value: "88%", change: "+4.2%", positive: true, icon: Calendar, sub: "this month" },
  { label: "Avg. Booking Value", value: "$3,240", change: "+12.1%", positive: true, icon: BedDouble, sub: "per booking" },
  { label: "Total Guests", value: "124", change: "-2.4%", positive: false, icon: Users, sub: "this month" },
];

const BOOKINGS = [
  { id: "HH-0241", guest: "James Whitmore", suite: "Royal Heritage Suite", checkIn: "2026-05-18", nights: 5, value: 6000, status: "Confirmed" },
  { id: "HH-0242", guest: "Yuki Tanaka", suite: "Jungle Horizon Villa", checkIn: "2026-05-20", nights: 3, value: 2850, status: "Pending" },
  { id: "HH-0243", guest: "Maria Santos", suite: "Sacred Lotus Pavilion", checkIn: "2026-05-22", nights: 7, value: 5250, status: "Confirmed" },
  { id: "HH-0244", guest: "Ravi Mehta", suite: "Royal Heritage Suite", checkIn: "2026-05-25", nights: 4, value: 4800, status: "Confirmed" },
  { id: "HH-0245", guest: "Chloe Dupont", suite: "Jungle Horizon Villa", checkIn: "2026-05-28", nights: 2, value: 1900, status: "Pending" },
];

const MAX_REVENUE = Math.max(...ANALYTICS_DATA.revenue.map((r) => r.amount));

export default function OverviewPanel() {
  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-white/3 border border-white/5 p-6 hover:border-heritage-gold/20 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 bg-heritage-gold/10 flex items-center justify-center">
                  <Icon size={16} className="text-heritage-gold" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium ${card.positive ? "text-emerald-400" : "text-red-400"}`}>
                  {card.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {card.change}
                </span>
              </div>
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">{card.label}</p>
              <p className="text-2xl font-serif text-white">{card.value}</p>
              <p className="text-white/25 text-xs mt-1">{card.sub}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Revenue Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="md:col-span-2 bg-white/3 border border-white/5 p-6"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-white font-serif text-lg">Revenue Trend</h3>
              <p className="text-white/30 text-xs mt-1">January – June 2026</p>
            </div>
            <span className="text-heritage-gold text-xs bg-heritage-gold/10 px-3 py-1 uppercase tracking-wider">+21.8% MoM</span>
          </div>
          <div className="flex items-end gap-3 h-40">
            {ANALYTICS_DATA.revenue.map((item, i) => {
              const pct = (item.amount / MAX_REVENUE) * 100;
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                  <motion.div
                    className="w-full bg-heritage-gold/20 relative group cursor-pointer"
                    style={{ height: `${pct}%` }}
                    initial={{ scaleY: 0, originY: 1 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.07 }}
                  >
                    <div className="absolute inset-0 bg-heritage-gold/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-heritage-charcoal text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ${(item.amount / 1000).toFixed(0)}k
                    </div>
                  </motion.div>
                  <span className="text-white/30 text-[10px]">{item.month}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Channel ROI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white/3 border border-white/5 p-6"
        >
          <h3 className="text-white font-serif text-lg mb-2">Channel ROI</h3>
          <p className="text-white/30 text-xs mb-8">Marketing performance multiplier</p>
          <div className="space-y-5">
            {ANALYTICS_DATA.performance.map((item, i) => {
              const pct = (item.value / 5.1) * 100;
              const colors = ["bg-heritage-gold", "bg-blue-400", "bg-emerald-400", "bg-purple-400"];
              return (
                <div key={item.category}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/50 text-xs">{item.category}</span>
                    <span className="text-white text-xs font-medium">{item.value}x</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${colors[i]} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Best Performer</p>
            <p className="text-heritage-gold font-serif text-xl">Organic · 5.1x</p>
          </div>
        </motion.div>
      </div>

      {/* Upcoming Bookings Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="bg-white/3 border border-white/5 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-serif text-lg">Upcoming Bookings</h3>
          <div className="flex items-center gap-2">
            <BarChart2 size={14} className="text-heritage-gold" />
            <span className="text-heritage-gold text-xs uppercase tracking-widest">5 upcoming</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-white/25 text-[10px] uppercase tracking-widest border-b border-white/5">
                <th className="text-left pb-4 font-normal">ID</th>
                <th className="text-left pb-4 font-normal">Guest</th>
                <th className="text-left pb-4 font-normal hidden md:table-cell">Suite</th>
                <th className="text-left pb-4 font-normal hidden md:table-cell">Check-In</th>
                <th className="text-left pb-4 font-normal">Nights</th>
                <th className="text-right pb-4 font-normal">Value</th>
                <th className="text-right pb-4 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {BOOKINGS.map((b, i) => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                  className="hover:bg-white/3 transition-colors"
                >
                  <td className="py-4 text-heritage-gold text-xs font-mono">{b.id}</td>
                  <td className="py-4 text-white text-sm">{b.guest}</td>
                  <td className="py-4 text-white/50 text-xs hidden md:table-cell">{b.suite}</td>
                  <td className="py-4 text-white/50 text-xs hidden md:table-cell">{b.checkIn}</td>
                  <td className="py-4 text-white/50 text-xs">{b.nights}n</td>
                  <td className="py-4 text-right text-white text-sm font-serif">${b.value.toLocaleString()}</td>
                  <td className="py-4 text-right">
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 ${
                      b.status === "Confirmed" ? "bg-emerald-500/15 text-emerald-400" : "bg-heritage-gold/15 text-heritage-gold"
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Star, label: "Avg Rating", value: "4.9 / 5.0", color: "text-heritage-gold" },
          { icon: Users, label: "Return Guests", value: "67%", color: "text-emerald-400" },
          { icon: Calendar, label: "Avg Stay", value: "4.2 nights", color: "text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white/3 border border-white/5 p-5 text-center">
            <s.icon size={20} className={`${s.color} mx-auto mb-3`} />
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-xl font-serif ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
