'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type AttendanceStatus = 'present' | 'late' | 'absent';
export type EmployeeRole = 'housekeeping' | 'maintenance' | 'front_desk' | 'management';

export interface StaffMember {
  id: string;
  name: string;
  villaName: string;
  roles: EmployeeRole[];
  attendanceStatus: AttendanceStatus;
  tasksCompleted: number;
  tasksTotal: number;
  clockIn?: string;
  clockOut?: string;
}

interface StaffPanelProps {
  staff?: StaffMember[];
}

const attendanceConfig: Record<
  AttendanceStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  present: { label: 'Present', icon: <UserCheck size={14} />, color: 'text-emerald-400' },
  late: { label: 'Late', icon: <Clock size={14} />, color: 'text-amber-400' },
  absent: { label: 'Absent', icon: <UserX size={14} />, color: 'text-red-400' },
};

const defaultStaff: StaffMember[] = [];

export default function StaffPanel({ staff = defaultStaff }: StaffPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [villaFilter, setVillaFilter] = useState<string>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceStatus | 'all'>('all');

  const villaNames = useMemo(() => {
    const names = new Set(staff.map((s) => s.villaName));
    return Array.from(names).sort();
  }, [staff]);

  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      if (villaFilter !== 'all' && member.villaName !== villaFilter) return false;
      if (attendanceFilter !== 'all' && member.attendanceStatus !== attendanceFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          member.name.toLowerCase().includes(query) ||
          member.villaName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [staff, villaFilter, attendanceFilter, searchQuery]);

  const summaryStats = useMemo(() => {
    const total = staff.length;
    const present = staff.filter((s) => s.attendanceStatus === 'present').length;
    const late = staff.filter((s) => s.attendanceStatus === 'late').length;
    const absent = staff.filter((s) => s.attendanceStatus === 'absent').length;
    const avgCompletion =
      total > 0
        ? Math.round(
            (staff.reduce((acc, s) => acc + (s.tasksTotal > 0 ? s.tasksCompleted / s.tasksTotal : 0), 0) /
              total) *
              100
          )
        : 0;
    return { total, present, late, absent, avgCompletion };
  }, [staff]);

  return (
    <section aria-label="Cross-villa staff management" className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-cyan-400/10 text-cyan-400">
          <Users size={22} />
        </div>
        <div>
          <h2 className="text-lg font-serif font-bold text-white">Staff Management</h2>
          <p className="text-xs text-white/40">
            All employees across villas
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <p className="text-xs text-white/40 uppercase tracking-wide">Total</p>
          <p className="text-xl font-serif font-bold text-white">{summaryStats.total}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <p className="text-xs text-emerald-400/80 uppercase tracking-wide">Present</p>
          <p className="text-xl font-serif font-bold text-emerald-400">{summaryStats.present}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <p className="text-xs text-amber-400/80 uppercase tracking-wide">Late</p>
          <p className="text-xl font-serif font-bold text-amber-400">{summaryStats.late}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <p className="text-xs text-red-400/80 uppercase tracking-wide">Absent</p>
          <p className="text-xl font-serif font-bold text-red-400">{summaryStats.absent}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/60 p-3"
        >
          <p className="text-xs text-white/40 uppercase tracking-wide">Avg Completion</p>
          <p className="text-xl font-serif font-bold text-heritage-gold">{summaryStats.avgCompletion}%</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="search"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-heritage-gold/10 bg-heritage-charcoal/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-heritage-gold/40"
            aria-label="Search staff"
          />
        </div>

        <select
          value={villaFilter}
          onChange={(e) => setVillaFilter(e.target.value)}
          className="rounded-lg border border-heritage-gold/20 bg-heritage-charcoal/80 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-heritage-gold/50"
          aria-label="Filter by villa"
        >
          <option value="all">All Villas</option>
          {villaNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={attendanceFilter}
          onChange={(e) => setAttendanceFilter(e.target.value as AttendanceStatus | 'all')}
          className="rounded-lg border border-heritage-gold/20 bg-heritage-charcoal/80 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-heritage-gold/50"
          aria-label="Filter by attendance"
        >
          <option value="all">All Status</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </select>
      </div>

      {/* Staff table */}
      <div className="overflow-x-auto rounded-xl border border-heritage-gold/10">
        <table className="w-full text-sm text-left" aria-label="Staff list">
          <thead className="bg-heritage-charcoal/80 border-b border-heritage-gold/10">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Employee
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Villa
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Roles
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Attendance
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Tasks
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Clock In/Out
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-heritage-gold/5">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-white/30">
                    <Users size={32} />
                    <p className="text-sm">No staff members match the current filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredStaff.map((member) => {
                const attendance = attendanceConfig[member.attendanceStatus];
                const completionPct =
                  member.tasksTotal > 0
                    ? Math.round((member.tasksCompleted / member.tasksTotal) * 100)
                    : 0;
                return (
                  <tr
                    key={member.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">{member.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-white/70">
                        <Building2 size={12} />
                        {member.villaName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {member.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-block rounded bg-white/5 px-2 py-0.5 text-xs text-white/60 capitalize"
                          >
                            {role.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5', attendance.color)}>
                        {attendance.icon}
                        {attendance.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/10 max-w-[80px]">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              completionPct >= 80
                                ? 'bg-emerald-400'
                                : completionPct >= 50
                                ? 'bg-amber-400'
                                : 'bg-red-400'
                            )}
                            style={{ width: `${completionPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/50">
                          {member.tasksCompleted}/{member.tasksTotal}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/50">
                      {member.clockIn ? (
                        <>
                          {member.clockIn}
                          {member.clockOut && ` — ${member.clockOut}`}
                        </>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
