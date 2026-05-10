import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ContactForm from "@/components/contact/ContactForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Arka Villa – Ubud, Bali",
  description: "Reach our concierge team for reservations, enquiries, and bespoke arrangements.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-heritage-charcoal">
      <Navbar />
      <ContactForm />
      <Footer />
    </main>
  );
}
