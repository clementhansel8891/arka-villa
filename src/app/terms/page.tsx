import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-heritage-sand">
      <Navbar />
      <div className="max-w-3xl mx-auto pt-48 pb-24 px-6">
        <h1 className="text-5xl font-serif text-heritage-charcoal mb-12">Terms of Service</h1>
        <div className="prose prose-stone max-w-none text-heritage-charcoal/70 leading-relaxed space-y-8">
          <p className="text-xl italic font-light">Last updated: May 10, 2026</p>
          <section>
            <h2 className="text-2xl font-serif text-heritage-charcoal mb-4">Agreement to Terms</h2>
            <p>By accessing or using our services, you agree to be bound by these terms. If you disagree with any part of the terms, you may not access the service.</p>
          </section>
          <section>
            <h2 className="text-2xl font-serif text-heritage-charcoal mb-4">Reservations & Payments</h2>
            <p>All reservations are subject to availability. Full payment or a deposit may be required to secure your booking. Cancellation policies apply as stated during the booking process.</p>
          </section>
          <section>
            <h2 className="text-2xl font-serif text-heritage-charcoal mb-4">Guest Conduct</h2>
            <p>Guests are expected to respect the local Balinese culture, our staff, and the villa property. Arka Villa reserves the right to terminate stays for inappropriate conduct.</p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
