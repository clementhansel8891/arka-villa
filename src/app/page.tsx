import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Narrative from "@/components/Narrative";
import Amenities from "@/components/Amenities";
import Footer from "@/components/Footer";
import Image from "next/image";
import { VILLA_DETAILS } from "@/constants/mockData";

export default function Home() {
  return (
    <main className="min-h-screen bg-heritage-sand">
      <Navbar />
      <Hero />
      
      {/* Intro Quote */}
      <section className="py-20 px-6 text-center bg-heritage-sand">
        <div className="max-w-3xl mx-auto">
          <p className="font-serif text-2xl md:text-3xl text-heritage-charcoal leading-relaxed italic">
            "We do not inherit the earth from our ancestors; we borrow it from our children."
          </p>
          <div className="mt-8 h-px w-20 bg-heritage-gold mx-auto"></div>
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-heritage-gold font-bold">The Heritage Philosophy</p>
        </div>
      </section>

      <Narrative />
      <Amenities />

      {/* Featured Room Preview */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-serif text-heritage-charcoal mb-4">The Sanctuary Collection</h2>
              <p className="text-heritage-charcoal/60 font-light text-lg">Meticulously designed spaces that blend ancestral textures with contemporary luxury.</p>
            </div>
            <button className="bg-heritage-charcoal text-white px-8 py-3 uppercase tracking-widest text-sm font-bold hover:bg-heritage-gold transition-all duration-300">
              View All Suites
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            {VILLA_DETAILS.rooms.map((room) => (
              <div key={room.id} className="group cursor-pointer">
                <div className="relative h-[500px] overflow-hidden mb-6">
                  <Image
                    src={room.image}
                    alt={room.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-6 left-6 bg-heritage-charcoal/80 backdrop-blur-sm text-heritage-gold px-4 py-1 text-[10px] uppercase tracking-widest">
                    Featured
                  </div>
                </div>
                <h3 className="text-2xl font-serif text-heritage-charcoal mb-2">{room.name}</h3>
                <p className="text-heritage-charcoal/60 text-sm mb-4 line-clamp-2">{room.description}</p>
                <div className="flex items-center gap-4 text-xs uppercase tracking-widest text-heritage-gold font-bold">
                  <span>From ${room.price} / Night</span>
                  <div className="h-px w-8 bg-heritage-gold/30"></div>
                  <span className="group-hover:translate-x-2 transition-transform duration-300">Explore Room →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
