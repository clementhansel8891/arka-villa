import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VillaHero from "@/components/villa/VillaHero";
import RoomCollection from "@/components/villa/RoomCollection";
import GalleryGrid from "@/components/villa/GalleryGrid";
import ExperienceSection from "@/components/villa/ExperienceSection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Villa | Arka Villa – Ubud, Bali",
  description:
    "Explore our curated collection of ultra-luxury suites and pavilions at Arka Villa villa in Ubud, Bali.",
};

export default function TheVillaPage() {
  return (
    <main className="min-h-screen bg-heritage-sand">
      <Navbar />
      <VillaHero />
      <RoomCollection />
      <GalleryGrid />
      <ExperienceSection />
      <Footer />
    </main>
  );
}
