/**
 * Bookings module types.
 *
 * Covers booking lifecycle, availability states,
 * pricing/rate plans, and event payloads.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.6, 5.7, 5.8, 5.10
 */

// ─── Booking Core ─────────────────────────────────────────────────────────────

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type PaymentStatus =
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'refunded'
  | 'failed';

export type BookingSource =
  | 'direct'
  | 'booking_com'
  | 'airbnb'
  | 'expedia'
  | 'manual';

export interface Booking {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: string; // ISO date (YYYY-MM-DD)
  checkOut: string; // ISO date (YYYY-MM-DD)
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number | null;
  currency: string;
  source: BookingSource;
  specialRequests: string | null;
  numGuests: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

export interface CreateBookingRequest {
  roomId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestNationality?: string;
  numGuests?: number;
  specialRequests?: string;
  source?: BookingSource;
}

export interface ModifyBookingRequest {
  checkIn?: string;
  checkOut?: string;
  roomId?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  numGuests?: number;
  specialRequests?: string;
}

// ─── Availability ─────────────────────────────────────────────────────────────

export type RoomAvailabilityState = 'available' | 'booked' | 'blocked';

export interface AvailabilityEntry {
  date: string; // YYYY-MM-DD
  roomId: string;
  roomName: string;
  state: RoomAvailabilityState;
  bookingId?: string;
}

export interface AvailabilityQuery {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  roomId?: string;
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

export type RatePlanType = 'base' | 'seasonal' | 'promotional';

export interface RatePlan {
  id: string;
  roomTypeId: string;
  name: string;
  type: RatePlanType;
  rate: number;
  currency: string;
  minStay: number;
  discountPercent: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface PricingBreakdown {
  nights: number;
  nightlyRate: number;
  baseTotal: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  appliedRatePlan: {
    id: string;
    name: string;
    type: RatePlanType;
  };
}

// ─── Event Payloads ───────────────────────────────────────────────────────────

export interface BookingCreatedPayload {
  bookingId: string;
  roomId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number | null;
  currency: string;
  source: BookingSource;
}

export interface BookingConfirmedPayload {
  bookingId: string;
  roomId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
}

export interface BookingCancelledPayload {
  bookingId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  reason?: string;
}

export interface BookingCompletedPayload {
  bookingId: string;
  roomId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface BookingRow {
  id: string;
  guest_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_amount: string | null;
  currency: string;
  source: BookingSource;
  special_requests: string | null;
  num_guests: number;
  created_at: string;
  updated_at: string;
}

export interface RoomRow {
  id: string;
  room_type_id: string;
  name: string;
  floor: number | null;
  status: string;
}

export interface RatePlanRow {
  id: string;
  room_type_id: string;
  name: string;
  type: RatePlanType;
  rate: string;
  currency: string;
  min_stay: number;
  discount_percent: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export interface GuestRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
}
