"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import OwnerShell from "@/components/dashboard/owner/OwnerShell";

/**
 * Owner Portal — Reports Page
 * Portfolio-level analytics and downloadable reports.
 */

const MONTHLY_PERFORMANCE = [
  { month: "Jan", revenue: 185000, expenses: 67000, occupancy: 82 },
  { month: "Feb", revenue: 169000, expenses: 63000, occupancy: 76 },
  { month: "Mar", revenue: 176000, expenses: 60100, occupancy: 79 },
  { month: "Apr", revenue: 194000, expenses: 64200, occupancy: 84 },
  { month: "May", revenue: 177000, expenses: 60500, occupancy: 78 },
  { month: "Jun", revenue: 204000, expenses: 67700, occupancy: 85 },
];

const PORTFOLIO_SUMMARY = {
  totalRevenue: "$1.15M",
  totalExpenses: "$385K",
  netIncome: "$765K",
  avgOccupancy: "81%",
  totalBookings: 186,
  avgRating: 4.8,
};

const REPORTS_AVAILABLE = [
  { name: "Monthly Revenue Report — June 2026", date: "Jul 1, 2026", type: "PDF" },
  { name: "Q2 2026 Financial Summary", date: "Jul 1, 2026", type: "PDF" },
  { name: "Annual Tax Report 2025", date: "Jan 15, 2026", type: "PDF" },
  { name: "Occupancy Analysis H1 2026", date: "Jul 1, 2026", type: "Excel" },
  { name: "Maintenance Cost Report — YTD", date: "Jun 26, 2026", type: "PDF" },
  { name: "Guest Satisfaction Survey Results", date: "Jun 15, 2026", type: "PDF" },
];

function downloadMockReport(reportName: string, reportType: string) {
  const content = `
===============================================
  ARKA VILLA MANAGEMENT — ${reportType.toUpperCase()} REPORT
===============================================

Report: ${reportName}
Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
Agency: Arka Villa Management
Location: Bali, Indonesia

-----------------------------------------------
SUMMARY
-----------------------------------------------

Total Revenue (YTD):    $1,150,000
Total Expenses (YTD):   $385,000
Net Income (YTD):       $765,000
Average Occupancy:      81%
Total Bookings:         186
Average Rating:         4.8 / 5.0

-----------------------------------------------
MONTHLY BREAKDOWN
-----------------------------------------------

Month    Revenue      Expenses     Occupancy
Jan      $185,000     $67,000      82%
Feb      $169,000     $63,000      76%
Mar      $176,000     $60,100      79%
Apr      $194,000     $64,200      84%
May      $177,000     $60,500      78%
Jun      $204,000     $67,700      85%

-----------------------------------------------
PROPERTY PERFORMANCE
-----------------------------------------------

Arka Villa       Revenue: $67,000/mo   Occ: 88%   Rating: 4.9
Surya Villa      Revenue: $48,000/mo   Occ: 72%   Rating: 4.6
Chandra Villa    Revenue: $89,000/mo   Occ: 95%   Rating: 4.9

===============================================
  This is a mock report generated for demo purposes.
===============================================
`.trim();

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportName.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function OwnerReportsPage() {
  const maxRevenue = Math.max(...MONTHLY_PERFORMANCE.map((m) => m.revenue));

  return (
    <OwnerShell activeNav="reports">
      <div className="space-y-8">
        <header>
          <h1 className="text-2xl font-serif text-white font-bold">Reports & Analytics</h1>
          <p className="text-white/40 text-sm mt-1">Portfolio performance across all your properties</p>
        </header>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Revenue (YTD)", value: PORTFOLIO_SUMMARY.totalRevenue, icon: DollarSign, color: "text-heritage-gold" },
            { label: "Total Expenses", value: PORTFOLIO_SUMMARY.totalExpenses, icon: TrendingUp, color: "text-red-400" },
            { label: "Net Income", value: PORTFOLIO_SUMMARY.netIncome, icon: DollarSign, color: "text-emerald-400" },
            { label: "Avg. Occupancy", value: PORTFOLIO_SUMMARY.avgOccupancy, icon: BarChart3, color: "text-purple-400" },
            { label: "Total Bookings", value: String(PORTFOLIO_SUMMARY.totalBookings), icon: Calendar, color: "text-blue-400" },
            { label: "Avg. Rating", value: String(PORTFOLIO_SUMMARY.avgRating), icon: TrendingUp, color: "text-yellow-400" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border border-white/10 rounded-xl p-4"
              >
                <Icon size={14} className={cn(stat.color, "mb-2")} />
                <p className="text-xl font-serif text-white font-bold">{stat.value}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">{stat.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Revenue Chart */}
        <div className="border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-serif text-lg">Monthly Revenue vs Expenses</h2>
              <p className="text-white/30 text-xs mt-0.5">All properties combined — H1 2026</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-heritage-gold" /> Revenue</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-400/60" /> Expenses</span>
            </div>
          </div>
          <div className="flex items-end gap-4 h-48">
            {MONTHLY_PERFORMANCE.map((m, i) => {
              const revenueH = (m.revenue / maxRevenue) * 100;
              const expenseH = (m.expenses / maxRevenue) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end gap-1 h-40">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${revenueH}%` }}
                      transition={{ delay: i * 0.08, duration: 0.5 }}
                      className="flex-1 bg-heritage-gold/80 rounded-t-sm"
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${expenseH}%` }}
                      transition={{ delay: i * 0.08 + 0.1, duration: 0.5 }}
                      className="flex-1 bg-red-400/40 rounded-t-sm"
                    />
                  </div>
                  <span className="text-white/30 text-[10px]">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Occupancy Trend */}
        <div className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4">Occupancy Trend</h2>
          <div className="flex items-end gap-3 h-32">
            {MONTHLY_PERFORMANCE.map((m, i) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-white/60 text-xs font-bold">{m.occupancy}%</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${m.occupancy}%` }}
                  transition={{ delay: i * 0.08, duration: 0.6 }}
                  className={cn("w-full rounded-t-sm", m.occupancy >= 80 ? "bg-emerald-400/70" : m.occupancy >= 70 ? "bg-yellow-400/70" : "bg-red-400/70")}
                />
                <span className="text-white/30 text-[10px]">{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Downloadable Reports */}
        <div className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4">Available Reports</h2>
          <div className="space-y-3">
            {REPORTS_AVAILABLE.map((report) => (
              <div key={report.name} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white text-sm">{report.name}</p>
                  <p className="text-white/30 text-xs mt-0.5">{report.date} · {report.type}</p>
                </div>
                <button
                  onClick={() => downloadMockReport(report.name, report.type)}
                  className="flex items-center gap-2 text-heritage-gold text-xs uppercase tracking-wider font-bold hover:text-white transition-colors"
                >
                  <Download size={14} /> Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </OwnerShell>
  );
}
