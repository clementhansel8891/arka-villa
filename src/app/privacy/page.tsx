import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-heritage-sand">
      <Navbar />
      <div className="max-w-3xl mx-auto pt-48 pb-24 px-6">
        <h1 className="text-5xl font-serif text-heritage-charcoal mb-12">Privacy Policy</h1>
        <div className="prose prose-stone max-w-none text-heritage-charcoal/70 leading-relaxed space-y-8">
          <p className="text-xl italic font-light">Last updated: May 10, 2026</p>
          <section>
            <h2 className="text-2xl font-serif text-heritage-charcoal mb-4">Introduction</h2>
            <p>At Arka Villa, we respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website or stay at our villa.</p>
          </section>
          <section>
            <h2 className="text-2xl font-serif text-heritage-charcoal mb-4">The Data We Collect</h2>
            <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows: Identity Data, Contact Data, Financial Data, and Transaction Data.</p>
          </section>
          <section>
            <h2 className="text-2xl font-serif text-heritage-charcoal mb-4">Contact Us</h2>
            <p>If you have any questions about this privacy policy or our privacy practices, please contact our concierge at concierge@arkavilla.com.</p>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
