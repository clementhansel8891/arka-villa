"use client";

import { motion } from "framer-motion";
import {
  Clock,
  CheckCircle2,
  TrendingUp,
  Award,
  BarChart3,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

/**
 * Staff Portal — Reports Page
 * Performance metrics and hours worked summary.
 */

const WEEKLY_HOURS = [
  { day: "Mon", hours: 9.0 },
  { day: "Tue", hours: 8.4 },
  { day: "Wed", hours: 9.2 },
  { day: "Thu", hours: 0 },
  { day: "Fri", hours: 9.0 },
  { day: "Sat", hours: 8.9 },
  { day: "Sun", hours: 0 },
];

const MONTHLY_SUMMARY = {
  hoursWorked: 168,
  overtimeHours: 12,
  tasksCompleted: 47,
  tasksAssigned: 52,
  avgResponseTime: "1.2h",
  customerRating: 4.8,
  attendanceRate: "96%",
  onTimeRate: "92%",
};

const RECENT_COMPLETIONS = [
  { task: "Pool pump replacement", date: "Jun 25", duration: "3.5h" },
  { task: "AC filter cleaning - Villa Harmony", date: "Jun 24", duration: "1.5h" },
  { task: "Garden irrigation repair", date: "Jun 23", duration: "2.0h" },
  { task: "Bathroom fixture install", date: "Jun 22", duration: "2.5h" },
  { task: "WiFi access point setup", date: "Jun 21", duration: "1.0h" },
];

export default function StaffReportsPage() {
  const { user } = useAuth();
  const maxHours = Math.max(...WEEKLY_HOURS.map((d) => d.hours));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-serif text-white font-bold">Reports</h1>
        <p className="text-sm text-white/40 mt-1">Your performance metrics and work summary</p>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Hours This Month", value: `${MONTHLY_SUMMARY.hoursWorked}h`, icon: Clock, color: "text-heritage-gold" },
          { label: "Overtime", value: `${MONTHLY_SUMMARY.overtimeHours}h`, icon: TrendingUp, color: "text-purple-400" },
          { label: "Tasks Completed", value: String(MONTHLY_SUMMARY.tasksCompleted), icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Completion Rate", value: `${Math.round((MONTHLY_SUMMARY.tasksCompleted / MONTHLY_SUMMARY.tasksAssigned) * 100)}%`, icon: Award, color: "text-yellow-400" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border border-white/10 rounded-xl p-4"
            >
              <Icon size={14} className={cn(stat.color, "mb-2")} />
              <p className="text-2xl font-serif text-white font-bold">{stat.value}</p>
              <p className="text-white/30 text-[10px] uppercase tracking-wider mt-1">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Hours Worked Chart */}
      <div className="border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-serif text-lg">Hours This Week</h2>
          <span className="text-white/30 text-xs">Total: {WEEKLY_HOURS.reduce((s, d) => s + d.hours, 0).toFixed(1)}h</span>
        </div>
        <div className="flex items-end gap-3 h-40">
          {WEEKLY_HOURS.map((day, i) => (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-2">
              {day.hours > 0 && (
                <span className="text-white/50 text-xs">{day.hours}h</span>
              )}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: day.hours > 0 ? `${(day.hours / (maxHours || 1)) * 100}%` : "4px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className={cn(
                  "w-full rounded-t-sm",
                  day.hours > 8 ? "bg-heritage-gold/80" : day.hours > 0 ? "bg-heritage-gold/50" : "bg-white/10"
                )}
              />
              <span className="text-white/30 text-[10px]">{day.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4">Performance Metrics</h2>
          <div className="space-y-4">
            <MetricRow label="Avg. Response Time" value={MONTHLY_SUMMARY.avgResponseTime} color="text-heritage-gold" />
            <MetricRow label="Customer Rating" value={`${MONTHLY_SUMMARY.customerRating}/5.0`} color="text-yellow-400" />
            <MetricRow label="Attendance Rate" value={MONTHLY_SUMMARY.attendanceRate} color="text-emerald-400" />
            <MetricRow label="On-Time Rate" value={MONTHLY_SUMMARY.onTimeRate} color="text-blue-400" />
            <MetricRow label="Tasks Assigned" value={String(MONTHLY_SUMMARY.tasksAssigned)} color="text-white/60" />
            <MetricRow label="Tasks Completed" value={String(MONTHLY_SUMMARY.tasksCompleted)} color="text-emerald-400" />
          </div>
        </div>

        {/* Recent Completions */}
        <div className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4">Recent Completions</h2>
          <div className="space-y-3">
            {RECENT_COMPLETIONS.map((item) => (
              <div key={item.task} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white text-sm">{item.task}</p>
                  <p className="text-white/30 text-xs mt-0.5">{item.date}</p>
                </div>
                <span className="text-white/40 text-xs font-mono">{item.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-white/50 text-sm">{label}</span>
      <span className={cn("text-sm font-bold", color)}>{value}</span>
    </div>
  );
}
