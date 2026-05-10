import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Amenities from "@/components/Amenities";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Amenities | Arka Villa – Refined Indulgences",
  description: "Explore the ultra-luxury amenities at Arka Villa, from our infinity pool overlooking the Ubud jungle to private spa treatments and gourmet dining.",
};

export default function AmenitiesPage() {
  return (
    <main className="min-h-screen bg-heritage-charcoal">
      <Navbar />
      <div className="pt-32">
        <Amenities />
      </div>
      
      {/* Additional Detail Section for Amenities Page */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div>
              <span className="text-heritage-gold uppercase tracking-[0.4em] text-xs font-bold mb-6 block">Beyond the Villa</span>
              <h2 className="text-4xl md:text-5xl font-serif text-heritage-charcoal mb-8">Tailored Experiences</h2>
              <div className="space-y-6 text-heritage-charcoal/70 leading-relaxed text-lg font-light">
                <p>
                  Our concierge team is dedicated to curating experiences that go beyond the ordinary. Whether it's a private water purification ceremony at a hidden temple or a sunrise trek through the emerald rice terraces.
                </p>
                <p>
                  At Arka Villa, we believe luxury is in the details—the scent of fresh frangipani, the sound of the jungle at dusk, and the warmth of genuine Balinese hospitality.
                </p>
              </div>
              <button className="mt-10 bg-heritage-charcoal text-white px-10 py-4 uppercase tracking-widest text-xs font-bold hover:bg-heritage-gold transition-all duration-300">
                Contact Concierge
              </button>
            </div>
            <div className="relative h-[600px] bg-heritage-sand">
              <div 
                className="absolute inset-0 shadow-2xl"
                style={{ 
                  backgroundImage: `url('https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
