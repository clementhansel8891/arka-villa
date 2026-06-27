'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarCheck,
  Filter,
  Search,
  ChevronDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBookings, type Booking } from '@/lib/booking-store';
import DateRangeFilter, { type DateRange } from './DateRangeFilter';

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';
export type BookingChannel = 'direct' | 'booking.com' | 'airbnb' | 'expedia';

export interface BookingRecord {
  id: string;
  guestName: string;
  villaName: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  channel: BookingChannel;
  totalAmount: number;
  currency: string;
}

interface BookingsPanelProps {
  bookings?: BookingRecord[];
}

const statusConfig: Record<BookingStatus, { label: string; icon: React.ReactNode; color: string }> = {
  confirmed: { label: 'Confirmed', icon: <CheckCircle2 size={14} />, color: 'text-emerald-400' },
  pending: { label: 'Pending', icon: <Clock size={14} />, color: 'text-amber-400' },
  cancelled: { label: 'Cancelled', icon: <XCircle size={14} />, color: 'text-red-400' },
  completed: { label: 'Completed', icon: <CheckCircle2 size={14} />, color: 'text-blue-400' },
};

const channelOptions: BookingChannel[] = ['direct', 'booking.com', 'airbnb', 'expedia'];
const statusOptions: BookingStatus[] = ['confirmed', 'pending', 'cancelled', 'completed'];

function mapStoreBookings(): BookingRecord[] {
  const storeBookings = getBookings();
  return storeBookings.map((b: Booking) => ({
    id: b.id,
    guestName: b.guestName,
    villaName: b.villaName,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    status: b.status as BookingStatus,
    channel: 'direct' as BookingChannel,
    totalAmount: b.totalAmount,
    currency: '$',
  }));
}

export default function BookingsPanel({ bookings: propBookings }: BookingsPanelProps) {
  const [storeBookings, setStoreBookings] = useState<BookingRecord[]>([]);

  useEffect(() => {
    setStoreBookings(mapStoreBookings());
  }, []);

  const bookings = propBookings && propBookings.length > 0 ? propBookings : storeBookings;
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<BookingChannel | 'all'>('all');
  const [villaFilter, setVillaFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const villaNames = useMemo(() => {
    const names = new Set(bookings.map((b) => b.villaName));
    return Array.from(names).sort();
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
      if (channelFilter !== 'all' && booking.channel !== channelFilter) return false;
      if (villaFilter !== 'all' && booking.villaName !== villaFilter) return false;
      if (dateRange) {
        const checkIn = new Date(booking.checkIn);
        const rangeStart = new Date(dateRange.start);
        const rangeEnd = new Date(dateRange.end);
        if (checkIn < rangeStart || checkIn > rangeEnd) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          booking.guestName.toLowerCase().includes(query) ||
          booking.villaName.toLowerCase().includes(query) ||
          booking.id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [bookings, statusFilter, channelFilter, villaFilter, dateRange, searchQuery]);

  return (
    <section aria-label="Cross-villa booking management" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-400/10 text-blue-400">
            <CalendarCheck size={22} />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-white">Bookings</h2>
            <p className="text-xs text-white/40">
              {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            showFilters
              ? 'bg-heritage-gold/20 text-heritage-gold'
              : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
          )}
          aria-expanded={showFilters}
          aria-controls="bookings-filters"
        >
          <Filter size={16} />
          Filters
          <ChevronDown
            size={14}
            className={cn('transition-transform', showFilters && 'rotate-180')}
          />
        </button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="search"
          placeholder="Search by guest name, villa, or booking ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-heritage-gold/10 bg-heritage-charcoal/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-heritage-gold/40"
          aria-label="Search bookings"
        />
      </div>

      {/* Filters panel */}
      {showFilters && (
        <motion.div
          id="bookings-filters"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-xl border border-heritage-gold/10 bg-heritage-charcoal/40 p-4 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Status filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/40 font-medium uppercase tracking-wide">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
                className="rounded-lg border border-heritage-gold/20 bg-heritage-charcoal/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-heritage-gold/50"
                aria-label="Filter by booking status"
              >
                <option value="all">All Statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {statusConfig[s].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Channel filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/40 font-medium uppercase tracking-wide">
                Channel
              </label>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value as BookingChannel | 'all')}
                className="rounded-lg border border-heritage-gold/20 bg-heritage-charcoal/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-heritage-gold/50"
                aria-label="Filter by booking channel"
              >
                <option value="all">All Channels</option>
                {channelOptions.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Villa filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/40 font-medium uppercase tracking-wide">
                Villa
              </label>
              <select
                value={villaFilter}
                onChange={(e) => setVillaFilter(e.target.value)}
                className="rounded-lg border border-heritage-gold/20 bg-heritage-charcoal/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-heritage-gold/50"
                aria-label="Filter by villa"
              >
                <option value="all">All Villas</option>
                {villaNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date range filter */}
          <DateRangeFilter onChange={setDateRange} />
        </motion.div>
      )}

      {/* Bookings table */}
      <div className="overflow-x-auto rounded-xl border border-heritage-gold/10">
        <table className="w-full text-sm text-left" aria-label="Bookings list">
          <thead className="bg-heritage-charcoal/80 border-b border-heritage-gold/10">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Guest
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Villa
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Check-in
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Check-out
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide">
                Channel
              </th>
              <th className="px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wide text-right">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-heritage-gold/5">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-white/30">
                    <AlertCircle size={32} />
                    <p className="text-sm">No bookings match the current filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking) => {
                const status = statusConfig[booking.status];
                return (
                  <tr
                    key={booking.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {booking.guestName}
                    </td>
                    <td className="px-4 py-3 text-white/70">{booking.villaName}</td>
                    <td className="px-4 py-3 text-white/70">{booking.checkIn}</td>
                    <td className="px-4 py-3 text-white/70">{booking.checkOut}</td>
                    <td className="px-4 py-3">
                      <span className={cn('flex items-center gap-1.5', status.color)}>
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70 capitalize">
                      {booking.channel}
                    </td>
                    <td className="px-4 py-3 text-white font-medium text-right">
                      {booking.currency}{' '}
                      {booking.totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
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
