import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BookingEngine from "@/components/booking/BookingEngine";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Reserve | Arka Villa – Ubud, Bali",
  description:
    "Begin your Arka Villa reservation. Our concierge team confirms within 2 hours.",
};

function BookingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-heritage-charcoal">
      <Navbar />
      <Suspense fallback={<BookingFallback />}>
        <BookingEngine />
      </Suspense>
      <Footer />
    </main>
  );
}
