'use client';

/**
 * Villa Booking Widget — real-time availability and reservation.
 *
 * Displays a booking form with date selection, guest count, and real-time
 * availability from the Booking Engine API. Falls back gracefully when
 * the Booking Engine is unavailable.
 *
 * Design language: Dark surface, gold accents, elegant form styling.
 *
 * Requirements: 8.3, 8.7
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, AlertCircle, Phone, Mail } from 'lucide-react';

interface VillaBookingWidgetProps {
  villaId: string;
  tenantId: string;
  accentColor: string;
  villaName: string;
}

interface AvailabilityState {
  status: 'idle' | 'loading' | 'available' | 'unavailable' | 'error';
  message?: string;
}

export function VillaBookingWidget({
  villaId,
  tenantId,
  accentColor,
  villaName,
}: VillaBookingWidgetProps) {
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'idle' });
  const [submitted, setSubmitted] = useState(false);

  // Minimum date is today
  const today = new Date().toISOString().split('T')[0];

  // Fetch availability when dates change
  const checkAvailability = useCallback(async () => {
    if (!checkIn || !checkOut) {
      setAvailability({ status: 'idle' });
      return;
    }

    setAvailability({ status: 'loading' });

    try {
      const response = await fetch(
        `/api/v1/bookings/availability?tenantId=${tenantId}&startDate=${checkIn}&endDate=${checkOut}`
      );

      if (!response.ok) {
        throw new Error('Booking service unavailable');
      }

      const data = await response.json();
      const hasAvailableRooms = data.entries?.some(
        (entry: { state: string }) => entry.state === 'available'
      );

      setAvailability({
        status: hasAvailableRooms ? 'available' : 'unavailable',
        message: hasAvailableRooms
          ? 'Dates are available'
          : 'Selected dates are not available. Please try different dates.',
      });
    } catch {
      setAvailability({
        status: 'error',
        message: 'Booking is temporarily unavailable. Please contact us directly.',
      });
    }
  }, [checkIn, checkOut, tenantId]);

  useEffect(() => {
    if (checkIn && checkOut && checkIn < checkOut) {
      checkAvailability();
    }
  }, [checkIn, checkOut, checkAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (availability.status === 'error') return;

    try {
      const response = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          villaId,
          checkIn,
          checkOut,
          guests,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      }
    } catch {
      setAvailability({
        status: 'error',
        message: 'Booking is temporarily unavailable. Please contact us directly.',
      });
    }
  };

  return (
    <section
      id="booking"
      className="py-20 md:py-32 px-4 sm:px-6 lg:px-8"
      style={{
        background: `linear-gradient(180deg, transparent 0%, ${accentColor}08 50%, transparent 100%)`,
      }}
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Section Header */}
          <div className="text-center mb-12">
            <span
              className="text-[10px] uppercase tracking-[0.4em] block mb-4"
              style={{ color: accentColor }}
            >
              Reserve Your Stay
            </span>
            <h2
              className="text-3xl sm:text-4xl md:text-5xl"
              style={{ fontFamily: 'var(--font-villa-serif)', color: 'var(--villa-text)' }}
            >
              Book {villaName}
            </h2>
          </div>

          {/* Booking Form */}
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 border border-white/10 bg-white/[0.02]"
            >
              <div
                className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}20` }}
              >
                <Calendar size={24} style={{ color: accentColor }} />
              </div>
              <h3
                className="text-2xl mb-3"
                style={{ fontFamily: 'var(--font-villa-serif)', color: 'var(--villa-text)' }}
              >
                Reservation Request Sent
              </h3>
              <p style={{ color: 'var(--villa-text-muted)' }} className="text-sm max-w-md mx-auto">
                Thank you for your interest. Our team will confirm your booking shortly.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6 md:p-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Check-in Date */}
                <div>
                  <label
                    htmlFor="checkin"
                    className="block text-xs uppercase tracking-wider mb-2"
                    style={{ color: 'var(--villa-text-muted)' }}
                  >
                    <Calendar size={12} className="inline mr-2" style={{ color: accentColor }} />
                    Check-in
                  </label>
                  <input
                    id="checkin"
                    type="date"
                    value={checkIn}
                    min={today}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[var(--villa-accent)] transition-colors"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                {/* Check-out Date */}
                <div>
                  <label
                    htmlFor="checkout"
                    className="block text-xs uppercase tracking-wider mb-2"
                    style={{ color: 'var(--villa-text-muted)' }}
                  >
                    <Calendar size={12} className="inline mr-2" style={{ color: accentColor }} />
                    Check-out
                  </label>
                  <input
                    id="checkout"
                    type="date"
                    value={checkOut}
                    min={checkIn || today}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[var(--villa-accent)] transition-colors"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Guests */}
              <div className="mb-6">
                <label
                  htmlFor="guests"
                  className="block text-xs uppercase tracking-wider mb-2"
                  style={{ color: 'var(--villa-text-muted)' }}
                >
                  <Users size={12} className="inline mr-2" style={{ color: accentColor }} />
                  Guests
                </label>
                <select
                  id="guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm focus:outline-none focus:border-[var(--villa-accent)] transition-colors"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n} className="bg-neutral-900">
                      {n} {n === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Status */}
              {availability.status !== 'idle' && (
                <div
                  className={`mb-6 p-4 border text-sm ${
                    availability.status === 'available'
                      ? 'border-green-500/30 bg-green-500/5 text-green-400'
                      : availability.status === 'unavailable'
                        ? 'border-amber-500/30 bg-amber-500/5 text-amber-400'
                        : availability.status === 'error'
                          ? 'border-red-500/30 bg-red-500/5 text-red-400'
                          : 'border-white/10 bg-white/5 text-white/60'
                  }`}
                >
                  {availability.status === 'loading' ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Checking availability...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {availability.status === 'error' && <AlertCircle size={14} />}
                      {availability.message}
                    </span>
                  )}
                </div>
              )}

              {/* Error Fallback — alternative contact */}
              {availability.status === 'error' && (
                <div
                  className="mb-6 p-4 border border-white/10 text-sm"
                  style={{ color: 'var(--villa-text-muted)' }}
                >
                  <p className="font-medium mb-2" style={{ color: 'var(--villa-text)' }}>
                    Contact us directly:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <span className="flex items-center gap-2">
                      <Phone size={14} style={{ color: accentColor }} />
                      +62 812 3456 7890
                    </span>
                    <span className="flex items-center gap-2">
                      <Mail size={14} style={{ color: accentColor }} />
                      reservations@{villaName.toLowerCase().replace(/\s+/g, '')}.com
                    </span>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  !checkIn ||
                  !checkOut ||
                  availability.status === 'loading' ||
                  availability.status === 'error'
                }
                className="w-full py-4 text-sm uppercase tracking-[0.2em] font-medium transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                style={{
                  backgroundColor: accentColor,
                  color: '#1A1A1A',
                }}
              >
                {availability.status === 'loading'
                  ? 'Checking...'
                  : 'Request Reservation'}
              </button>

              <p
                className="text-center text-xs mt-4"
                style={{ color: 'var(--villa-text-muted)' }}
              >
                No payment required at this stage. Our team will confirm availability and pricing.
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
