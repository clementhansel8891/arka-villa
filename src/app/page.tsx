import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgencyHero from "@/components/home/AgencyHero";
import VillaShowcase from "@/components/home/VillaShowcase";
import WhyBookWithUs from "@/components/home/WhyBookWithUs";
import FeaturedExperiences from "@/components/home/FeaturedExperiences";
import BookingCTA from "@/components/home/BookingCTA";

/**
 * Arka Villa Management Agency — Public Landing Page
 *
 * This is the customer-facing booking site where visitors:
 * - Discover all managed luxury villas in Bali
 * - Browse villa details, rooms, and amenities
 * - Filter by location, capacity, price, and amenities
 * - Book directly without leaving the site
 *
 * Combines the Agency Showcase with a luxury booking experience.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-heritage-charcoal">
      <Navbar />
      <AgencyHero />
      <VillaShowcase />
      <WhyBookWithUs />
      <FeaturedExperiences />
      <BookingCTA />
      <Footer />
    </main>
  );
}
