/**
 * Booking Store — localStorage-backed booking management.
 * Villa pages create bookings, agency/owner dashboards read them.
 * Shared across all dashboards via localStorage key: av_bookings
 */

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface Booking {
  id: string;
  villaSlug: string;
  villaName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  roomType: string;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
}

const STORAGE_KEY = "av_bookings";

const DEFAULT_BOOKINGS: Booking[] = [
  {
    id: "BK-001",
    villaSlug: "arka-villa",
    villaName: "Arka Villa",
    guestName: "James Whitmore",
    guestEmail: "james@example.com",
    guestPhone: "+1 555 0102",
    checkIn: "2026-07-15",
    checkOut: "2026-07-20",
    nights: 5,
    guests: 2,
    roomType: "Royal Heritage Suite",
    totalAmount: 2250,
    status: "confirmed",
    createdAt: "2026-06-01T10:30:00Z",
  },
  {
    id: "BK-002",
    villaSlug: "villa-serenity",
    villaName: "Villa Serenity",
    guestName: "Yuki Tanaka",
    guestEmail: "yuki@example.com",
    guestPhone: "+81 90 1234 5678",
    checkIn: "2026-06-20",
    checkOut: "2026-06-27",
    nights: 7,
    guests: 4,
    roomType: "Ocean Master Suite",
    totalAmount: 2660,
    status: "confirmed",
    createdAt: "2026-05-15T14:20:00Z",
  },
  {
    id: "BK-003",
    villaSlug: "villa-harmony",
    villaName: "Villa Harmony",
    guestName: "Maria Santos",
    guestEmail: "maria@example.com",
    guestPhone: "+55 11 99999 0000",
    checkIn: "2026-08-10",
    checkOut: "2026-08-15",
    nights: 5,
    guests: 2,
    roomType: "Cliff Master Suite",
    totalAmount: 1600,
    status: "pending",
    createdAt: "2026-06-18T09:45:00Z",
  },
  {
    id: "BK-004",
    villaSlug: "villa-tropicana",
    villaName: "Villa Tropicana",
    guestName: "Alex Thompson",
    guestEmail: "alex@example.com",
    guestPhone: "+44 7891 234567",
    checkIn: "2026-09-01",
    checkOut: "2026-09-07",
    nights: 6,
    guests: 8,
    roomType: "Canopy Master Suite",
    totalAmount: 3120,
    status: "pending",
    createdAt: "2026-06-20T16:10:00Z",
  },
  {
    id: "BK-005",
    villaSlug: "villa-coral",
    villaName: "Villa Coral",
    guestName: "Emma Thompson",
    guestEmail: "emma.t@example.com",
    guestPhone: "+44 7700 900123",
    checkIn: "2026-07-01",
    checkOut: "2026-07-05",
    nights: 4,
    guests: 6,
    roomType: "Coral Master Suite",
    totalAmount: 2720,
    status: "confirmed",
    createdAt: "2026-05-28T11:00:00Z",
  },
  {
    id: "BK-006",
    villaSlug: "villa-jade",
    villaName: "Villa Jade",
    guestName: "Chen Li",
    guestEmail: "chen.li@example.com",
    guestPhone: "+86 138 0000 1234",
    checkIn: "2026-07-10",
    checkOut: "2026-07-16",
    nights: 6,
    guests: 4,
    roomType: "Joglo Master",
    totalAmount: 1740,
    status: "confirmed",
    createdAt: "2026-06-05T08:30:00Z",
  },
  {
    id: "BK-007",
    villaSlug: "arka-villa",
    villaName: "Arka Villa",
    guestName: "Sophie Laurent",
    guestEmail: "sophie@example.com",
    guestPhone: "+33 6 12 34 56 78",
    checkIn: "2026-06-25",
    checkOut: "2026-06-30",
    nights: 5,
    guests: 2,
    roomType: "Jungle Horizon Villa",
    totalAmount: 2250,
    status: "completed",
    createdAt: "2026-05-10T13:15:00Z",
  },
  {
    id: "BK-008",
    villaSlug: "villa-serenity",
    villaName: "Villa Serenity",
    guestName: "Ravi Mehta",
    guestEmail: "ravi.m@example.com",
    guestPhone: "+91 98765 43210",
    checkIn: "2026-05-15",
    checkOut: "2026-05-18",
    nights: 3,
    guests: 2,
    roomType: "Beach View Room",
    totalAmount: 1140,
    status: "completed",
    createdAt: "2026-04-20T17:45:00Z",
  },
  {
    id: "BK-009",
    villaSlug: "villa-tropicana",
    villaName: "Villa Tropicana",
    guestName: "Olga Petrov",
    guestEmail: "olga@example.com",
    guestPhone: "+7 916 123 4567",
    checkIn: "2026-04-10",
    checkOut: "2026-04-14",
    nights: 4,
    guests: 6,
    roomType: "Jungle Room 1",
    totalAmount: 2080,
    status: "cancelled",
    createdAt: "2026-03-25T10:00:00Z",
  },
  {
    id: "BK-010",
    villaSlug: "arka-villa",
    villaName: "Arka Villa",
    guestName: "David Kim",
    guestEmail: "david.k@example.com",
    guestPhone: "+82 10 9876 5432",
    checkIn: "2026-08-20",
    checkOut: "2026-08-25",
    nights: 5,
    guests: 4,
    roomType: "Sacred Lotus Pavilion",
    totalAmount: 2250,
    status: "pending",
    createdAt: "2026-06-22T12:00:00Z",
  },
];

export function getBookings(): Booking[] {
  if (typeof window === "undefined") return DEFAULT_BOOKINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BOOKINGS));
      return DEFAULT_BOOKINGS;
    }
    return JSON.parse(stored);
  } catch {
    return DEFAULT_BOOKINGS;
  }
}

function saveBookings(bookings: Booking[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function addBooking(
  data: Omit<Booking, "id" | "createdAt" | "status">
): Booking {
  const bookings = getBookings();
  const newBooking: Booking = {
    ...data,
    id: `BK-${String(bookings.length + 1).padStart(3, "0")}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const updated = [newBooking, ...bookings];
  saveBookings(updated);
  return newBooking;
}

export function updateBookingStatus(
  id: string,
  status: BookingStatus
): Booking[] {
  const bookings = getBookings();
  const updated = bookings.map((b) =>
    b.id === id ? { ...b, status } : b
  );
  saveBookings(updated);
  return updated;
}

export function getBookingsForVilla(villaSlug: string): Booking[] {
  return getBookings().filter((b) => b.villaSlug === villaSlug);
}

export function getBookingsForGuest(email: string): Booking[] {
  return getBookings().filter(
    (b) => b.guestEmail.toLowerCase() === email.toLowerCase()
  );
}
