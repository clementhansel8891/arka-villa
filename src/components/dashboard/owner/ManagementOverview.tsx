'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Wrench,
  CheckCircle,
  Star,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { ManagementOverviewData } from './types';
import { MANAGEMENT_OVERVIEW } from './mockData';

interface ManagementOverviewProps {
  villaId: string;
  onError?: (error: string) => void;
}

export default function ManagementOverview({ villaId, onError }: ManagementOverviewProps) {
  const [data, setData] = useState<ManagementOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [villaId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call with delay
      await new Promise((resolve) => setTimeout(resolve, 600));
      const result = MANAGEMENT_OVERVIEW[villaId];
      if (!result) throw new Error('Villa data not found');
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load management overview';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white/3 border border-white/5 p-6 animate-pulse">
        <div className="h-5 w-48 bg-white/10 rounded mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/3 border border-red-500/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400" />
            <div>
              <p className="text-white text-sm font-medium">Management Overview Unavailable</p>
              <p className="text-white/40 text-xs mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-heritage-gold border border-heritage-gold/30 hover:bg-heritage-gold/10 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      icon: Calendar,
      label: 'Occupancy',
      value: `${data.occupancyRate}%`,
      sub: 'current month',
      color: 'text-heritage-gold',
    },
    {
      icon: Users,
      label: 'Upcoming Bookings',
      value: String(data.upcomingBookings.length),
      sub: 'next 30 days',
      color: 'text-blue-400',
    },
    {
      icon: Wrench,
      label: 'Maintenance',
      value: String(data.maintenanceTickets.open + data.maintenanceTickets.inProgress),
      sub: `${data.maintenanceTickets.critical} critical`,
      color: data.maintenanceTickets.critical > 0 ? 'text-red-400' : 'text-emerald-400',
    },
    {
      icon: CheckCircle,
      label: 'Task Completion',
      value: `${data.employeeCompletionRate}%`,
      sub: 'employee rate',
      color: 'text-emerald-400',
    },
    {
      icon: Star,
      label: 'Satisfaction',
      value: data.satisfactionScore.toFixed(1),
      sub: 'out of 5.0',
      color: 'text-heritage-gold',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-white/3 border border-white/5 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-heritage-gold/10 flex items-center justify-center">
            <TrendingUp size={16} className="text-heritage-gold" />
          </div>
          <h2 className="text-white font-serif text-lg">Management Overview</h2>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className="bg-white/3 border border-white/5 p-4 hover:border-heritage-gold/20 transition-colors"
          >
            <kpi.icon size={16} className={`${kpi.color} mb-3`} />
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className={`text-xl font-serif ${kpi.color}`}>{kpi.value}</p>
            <p className="text-white/25 text-[10px] mt-1">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Upcoming Bookings Table */}
      <div>
        <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">
          Upcoming Bookings (30 days)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-white/25 text-[10px] uppercase tracking-widest border-b border-white/5">
                <th className="text-left pb-3 font-normal">ID</th>
                <th className="text-left pb-3 font-normal">Guest</th>
                <th className="text-left pb-3 font-normal hidden md:table-cell">Room</th>
                <th className="text-left pb-3 font-normal hidden sm:table-cell">Check-In</th>
                <th className="text-right pb-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.upcomingBookings.map((booking, i) => (
                <motion.tr
                  key={booking.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="hover:bg-white/3 transition-colors"
                >
                  <td className="py-3 text-heritage-gold text-xs font-mono">{booking.id}</td>
                  <td className="py-3 text-white text-sm">{booking.guestName}</td>
                  <td className="py-3 text-white/50 text-xs hidden md:table-cell">{booking.roomType}</td>
                  <td className="py-3 text-white/50 text-xs hidden sm:table-cell">{booking.checkIn}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`text-[10px] uppercase tracking-widest px-2 py-1 ${
                        booking.status === 'confirmed'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-heritage-gold/15 text-heritage-gold'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
