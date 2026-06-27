"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Check,
  Calendar,
  Users,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { addBooking } from "@/lib/booking-store";
import { cn } from "@/lib/utils";

const roomOptions = [
  { label: "Deluxe Villa", value: "Deluxe Villa", price: 85 },
  { label: "One Bedroom Villa", value: "One Bedroom Villa", price: 110 },
];

export default function BookingPage() {
  const [form, setForm] = useState({
    checkIn: "",
    checkOut: "",
    guests: 2,
    roomType: "",
    name: "",
    email: "",
    phone: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedRoom = roomOptions.find((r) => r.value === form.roomType);
  const pricePerNight = selectedRoom?.price || 85;

  const nights = useMemo(() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const diff =
      new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [form.checkIn, form.checkOut]);

  const total = nights * pricePerNight;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.checkIn) newErrors.checkIn = "Required";
    if (!form.checkOut) newErrors.checkOut = "Required";
    if (!form.roomType) newErrors.roomType = "Select a room";
    if (!form.name.trim()) newErrors.name = "Required";
    if (!form.email.trim()) newErrors.email = "Required";
    if (!form.phone.trim()) newErrors.phone = "Required";
    if (form.checkIn && form.checkOut && nights <= 0)
      newErrors.checkOut = "Must be after check-in";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    addBooking({
      villaSlug: "arka-villa",
      villaName: "Arka Villa",
      guestName: form.name,
      guestEmail: form.email,
      guestPhone: form.phone,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      nights,
      guests: form.guests,
      roomType: form.roomType,
      totalAmount: total,
    });
    setSubmitted(true);
  };

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (submitted) {
    return (
      <div className="text-white pt-20 md:pt-24 min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-8">
            <Check size={32} className="text-emerald-400" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-light mb-4">
            Booking Confirmed
          </h1>
          <p className="text-white/60 text-lg mb-2">
            Thank you, {form.name}!
          </p>
          <p className="text-white/50 mb-8">
            Your reservation for {nights} night{nights > 1 ? "s" : ""} at Arka
            Villa has been received. We&apos;ll send a confirmation to{" "}
            <span className="text-amber-400">{form.email}</span>.
          </p>
          <Link
            href="/villas/arka-villa"
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm uppercase tracking-widest transition-colors"
          >
            Back to Villa
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="text-white pt-20 md:pt-24">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <nav className="flex items-center gap-2 text-sm text-white/40">
          <Link href="/villas/arka-villa" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight size={14} />
          <span className="text-white/70">Book</span>
        </nav>
      </div>

      {/* Header */}
      <section className="max-w-7xl mx-auto px-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-amber-400 text-sm uppercase tracking-[0.2em] mb-3">
            Reservation
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-light mb-4">
            Book Your Stay
          </h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Complete your reservation below. You&apos;ll receive instant
            confirmation via email.
          </p>
        </motion.div>
      </section>

      {/* Booking Form + Summary */}
      <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">
            {/* Left - Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Dates & Guests */}
              <div className="bg-stone-900 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
                <h2 className="font-serif text-xl mb-2">Stay Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      <Calendar size={14} className="inline mr-2 text-amber-400" />
                      Check-in Date
                    </label>
                    <input
                      type="date"
                      value={form.checkIn}
                      onChange={(e) => updateField("checkIn", e.target.value)}
                      className={cn(
                        "w-full bg-stone-800 border rounded-lg px-4 py-3 text-white text-sm min-h-[44px] focus:outline-none focus:border-amber-500",
                        errors.checkIn ? "border-red-500" : "border-white/10"
                      )}
                    />
                    {errors.checkIn && (
                      <p className="text-red-400 text-xs mt-1">{errors.checkIn}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      <Calendar size={14} className="inline mr-2 text-amber-400" />
                      Check-out Date
                    </label>
                    <input
                      type="date"
                      value={form.checkOut}
                      onChange={(e) => updateField("checkOut", e.target.value)}
                      className={cn(
                        "w-full bg-stone-800 border rounded-lg px-4 py-3 text-white text-sm min-h-[44px] focus:outline-none focus:border-amber-500",
                        errors.checkOut ? "border-red-500" : "border-white/10"
                      )}
                    />
                    {errors.checkOut && (
                      <p className="text-red-400 text-xs mt-1">{errors.checkOut}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      <Users size={14} className="inline mr-2 text-amber-400" />
                      Guests
                    </label>
                    <select
                      value={form.guests}
                      onChange={(e) =>
                        updateField("guests", parseInt(e.target.value))
                      }
                      className="w-full bg-stone-800 border border-white/10 rounded-lg px-4 py-3 text-white text-sm min-h-[44px] focus:outline-none focus:border-amber-500"
                    >
                      {[1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          {n} Guest{n > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      Room Type
                    </label>
                    <select
                      value={form.roomType}
                      onChange={(e) => updateField("roomType", e.target.value)}
                      className={cn(
                        "w-full bg-stone-800 border rounded-lg px-4 py-3 text-white text-sm min-h-[44px] focus:outline-none focus:border-amber-500",
                        errors.roomType ? "border-red-500" : "border-white/10"
                      )}
                    >
                      <option value="">Select a room</option>
                      {roomOptions.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label} — ${r.price}/night
                        </option>
                      ))}
                    </select>
                    {errors.roomType && (
                      <p className="text-red-400 text-xs mt-1">{errors.roomType}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Guest Info */}
              <div className="bg-stone-900 border border-white/5 rounded-2xl p-6 md:p-8 space-y-6">
                <h2 className="font-serif text-xl mb-2">Guest Information</h2>
                <div>
                  <label className="block text-white/60 text-sm mb-2">
                    <User size={14} className="inline mr-2 text-amber-400" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="John Doe"
                    className={cn(
                      "w-full bg-stone-800 border rounded-lg px-4 py-3 text-white text-sm min-h-[44px] focus:outline-none focus:border-amber-500 placeholder:text-white/30",
                      errors.name ? "border-red-500" : "border-white/10"
                    )}
                  />
                  {errors.name && (
                    <p className="text-red-400 text-xs mt-1">{errors.name}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      <Mail size={14} className="inline mr-2 text-amber-400" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="john@example.com"
                      className={cn(
                        "w-full bg-stone-800 border rounded-lg px-4 py-3 text-white text-sm min-h-[44px] focus:outline-none focus:border-amber-500 placeholder:text-white/30",
                        errors.email ? "border-red-500" : "border-white/10"
                      )}
                    />
                    {errors.email && (
                      <p className="text-red-400 text-xs mt-1">{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-2">
                      <Phone size={14} className="inline mr-2 text-amber-400" />
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+62 812 3456 7890"
                      className={cn(
                        "w-full bg-stone-800 border rounded-lg px-4 py-3 text-white text-sm min-h-[44px] focus:outline-none focus:border-amber-500 placeholder:text-white/30",
                        errors.phone ? "border-red-500" : "border-white/10"
                      )}
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit on mobile */}
              <div className="lg:hidden">
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium py-4 rounded-full transition-colors text-sm uppercase tracking-widest"
                >
                  Confirm Reservation
                </button>
              </div>
            </div>

            {/* Right - Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 bg-stone-900 border border-white/5 rounded-2xl p-6 md:p-8">
                <h2 className="font-serif text-xl mb-6">Booking Summary</h2>

                <div className="space-y-4 text-sm">
                  <div className="flex justify-between text-white/60">
                    <span>Room</span>
                    <span className="text-white/80">
                      {form.roomType || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Dates</span>
                    <span className="text-white/80">
                      {form.checkIn && form.checkOut
                        ? `${form.checkIn} → ${form.checkOut}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Nights</span>
                    <span className="text-white/80">
                      {nights > 0 ? nights : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Guests</span>
                    <span className="text-white/80">{form.guests}</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>Rate</span>
                    <span className="text-white/80">
                      ${pricePerNight}/night
                    </span>
                  </div>

                  <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="flex justify-between">
                      <span className="text-white font-medium">Total</span>
                      <span className="text-amber-400 text-xl font-light">
                        ${total > 0 ? total : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Policies */}
                <div className="mt-8 pt-6 border-t border-white/5">
                  <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">
                    Villa Policies
                  </h3>
                  <ul className="space-y-2 text-white/40 text-xs">
                    <li>• Check-in: 14:00 – 23:00</li>
                    <li>• Check-out: 12:00 – 13:00</li>
                    <li>• Free cancellation up to 48h before</li>
                    <li>• Non-smoking property</li>
                    <li>• No extra beds available</li>
                  </ul>
                </div>

                {/* Submit on desktop */}
                <div className="hidden lg:block mt-8">
                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium py-4 rounded-full transition-colors text-sm uppercase tracking-widest"
                  >
                    Confirm Reservation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
