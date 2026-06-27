import BookingsPanel from '@/components/dashboard/agency/BookingsPanel';

export const metadata = {
  title: 'Bookings Management | Agency Dashboard',
  description: 'Cross-villa booking management with filters for status, date range, villa, and channel.',
};

export default function AgencyBookingsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-serif text-white font-bold">
          Booking Management
        </h1>
        <p className="text-sm text-white/40 mt-1">
          View and manage bookings across all villas
        </p>
      </header>

      <BookingsPanel />
    </div>
  );
}
