"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, LogIn, LogOut, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getScheduleForUser, type ScheduleEntry } from "@/lib/auth";

/**
 * Staff Portal — Attendance Page
 * Clock in/out and view weekly attendance history.
 */

interface AttendanceRecord {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  hoursWorked: number;
  status: "present" | "late" | "absent" | "day_off";
}

const MOCK_WEEKLY_ATTENDANCE: AttendanceRecord[] = [
  { date: "2026-06-23", clockIn: "08:02", clockOut: "17:05", hoursWorked: 9.0, status: "present" },
  { date: "2026-06-24", clockIn: "08:35", clockOut: "17:00", hoursWorked: 8.4, status: "late" },
  { date: "2026-06-25", clockIn: "07:58", clockOut: "17:10", hoursWorked: 9.2, status: "present" },
  { date: "2026-06-26", clockIn: null, clockOut: null, hoursWorked: 0, status: "day_off" },
  { date: "2026-06-27", clockIn: "08:00", clockOut: "17:00", hoursWorked: 9.0, status: "present" },
  { date: "2026-06-28", clockIn: "08:01", clockOut: "16:55", hoursWorked: 8.9, status: "present" },
  { date: "2026-06-29", clockIn: null, clockOut: null, hoursWorked: 0, status: "day_off" },
];

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  present: { label: "Present", color: "text-emerald-400", icon: CheckCircle2 },
  late: { label: "Late", color: "text-yellow-400", icon: AlertTriangle },
  absent: { label: "Absent", color: "text-red-400", icon: XCircle },
  day_off: { label: "Day Off", color: "text-white/30", icon: Clock },
};

export default function StaffAttendancePage() {
  const { user } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    if (user?.id) {
      setSchedule(getScheduleForUser(user.id));
    }
  }, [user?.id]);

  function handleClockIn() {
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    setClockInTime(now);
    setIsClockedIn(true);
  }

  function handleClockOut() {
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    setClockOutTime(now);
    setIsClockedIn(false);
  }

  const totalHoursThisWeek = MOCK_WEEKLY_ATTENDANCE.reduce((sum, r) => sum + r.hoursWorked, 0);
  const daysPresent = MOCK_WEEKLY_ATTENDANCE.filter((r) => r.status === "present" || r.status === "late").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-serif text-white font-bold">Attendance</h1>
        <p className="text-sm text-white/40 mt-1">Track your daily clock-in/out and weekly history</p>
      </header>

      {/* Today's Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-white/10 rounded-xl p-6"
      >
        <h2 className="text-white font-serif text-lg mb-4">Today</h2>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-white/30 text-[10px] uppercase tracking-wider">Status</p>
              <p className={cn("text-lg font-bold", isClockedIn ? "text-emerald-400" : clockOutTime ? "text-white/60" : "text-yellow-400")}>
                {isClockedIn ? "Clocked In" : clockOutTime ? "Shift Complete" : "Not Clocked In"}
              </p>
            </div>
            {clockInTime && (
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-wider">Clock In</p>
                <p className="text-white font-mono">{clockInTime}</p>
              </div>
            )}
            {clockOutTime && (
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-wider">Clock Out</p>
                <p className="text-white font-mono">{clockOutTime}</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {!isClockedIn && !clockOutTime && (
              <button
                onClick={handleClockIn}
                className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-5 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-emerald-500/20 transition-colors rounded-lg"
              >
                <LogIn size={14} /> Clock In
              </button>
            )}
            {isClockedIn && (
              <button
                onClick={handleClockOut}
                className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 px-5 py-2.5 text-xs uppercase tracking-widest font-bold hover:bg-red-500/20 transition-colors rounded-lg"
              >
                <LogOut size={14} /> Clock Out
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-white/10 rounded-xl p-4">
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Hours This Week</p>
          <p className="text-2xl font-serif text-white font-bold">{totalHoursThisWeek.toFixed(1)}</p>
        </div>
        <div className="border border-white/10 rounded-xl p-4">
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Days Present</p>
          <p className="text-2xl font-serif text-emerald-400 font-bold">{daysPresent}</p>
        </div>
        <div className="border border-white/10 rounded-xl p-4">
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Late Arrivals</p>
          <p className="text-2xl font-serif text-yellow-400 font-bold">{MOCK_WEEKLY_ATTENDANCE.filter((r) => r.status === "late").length}</p>
        </div>
        <div className="border border-white/10 rounded-xl p-4">
          <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">Days Off</p>
          <p className="text-2xl font-serif text-white/60 font-bold">{MOCK_WEEKLY_ATTENDANCE.filter((r) => r.status === "day_off").length}</p>
        </div>
      </div>

      {/* Weekly Schedule from auth */}
      {schedule.length > 0 && (
        <div className="border border-white/10 rounded-xl p-6">
          <h2 className="text-white font-serif text-lg mb-4">This Week&apos;s Schedule</h2>
          <div className="space-y-2">
            {schedule.map((entry) => (
              <div key={entry.date} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-sm w-24">
                    {new Date(entry.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <span className={cn("text-xs font-bold uppercase", entry.shift === "Off" ? "text-white/30" : "text-heritage-gold")}>
                    {entry.shift}
                  </span>
                </div>
                <div className="text-right">
                  {entry.hours > 0 ? (
                    <span className="text-white/60 text-sm">{entry.hours}h{entry.overtime ? ` + ${entry.overtime}h OT` : ""}</span>
                  ) : (
                    <span className="text-white/20 text-sm">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Attendance History */}
      <div className="border border-white/10 rounded-xl p-6">
        <h2 className="text-white font-serif text-lg mb-4">Weekly Attendance History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/30 text-[10px] uppercase tracking-wider py-3 pr-4">Date</th>
                <th className="text-left text-white/30 text-[10px] uppercase tracking-wider py-3 pr-4">Clock In</th>
                <th className="text-left text-white/30 text-[10px] uppercase tracking-wider py-3 pr-4">Clock Out</th>
                <th className="text-left text-white/30 text-[10px] uppercase tracking-wider py-3 pr-4">Hours</th>
                <th className="text-left text-white/30 text-[10px] uppercase tracking-wider py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_WEEKLY_ATTENDANCE.map((record) => {
                const statusInfo = STATUS_LABELS[record.status];
                const StatusIcon = statusInfo.icon;
                return (
                  <tr key={record.date} className="border-b border-white/5 last:border-0">
                    <td className="py-3 pr-4 text-white/80">
                      {new Date(record.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </td>
                    <td className="py-3 pr-4 text-white/60 font-mono">{record.clockIn || "—"}</td>
                    <td className="py-3 pr-4 text-white/60 font-mono">{record.clockOut || "—"}</td>
                    <td className="py-3 pr-4 text-white/60">{record.hoursWorked > 0 ? `${record.hoursWorked}h` : "—"}</td>
                    <td className="py-3">
                      <span className={cn("flex items-center gap-1.5 text-xs font-bold", statusInfo.color)}>
                        <StatusIcon size={12} /> {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
