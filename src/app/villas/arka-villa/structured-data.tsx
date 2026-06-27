"use client";

/**
 * JSON-LD Structured Data for SEO.
 * Provides rich search results in Google for the villa.
 */
export default function StructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: "Arka Villa",
    description: "A serene private villa nestled in the heart of Ubud, Bali. Private pool, tropical garden, and just 5km from Tegallalang Rice Terraces.",
    url: "https://arka-villa.com/villas/arka-villa",
    image: "https://arka-villa.com/images/villas/arka-villa/front-view.webp",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jalan Sinta No.88, Keliki",
      addressLocality: "Ubud",
      addressRegion: "Bali",
      postalCode: "80561",
      addressCountry: "ID",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: -8.4095,
      longitude: 115.3095,
    },
    priceRange: "$85 - $110 per night",
    starRating: {
      "@type": "Rating",
      ratingValue: "9.2",
      bestRating: "10",
    },
    amenityFeature: [
      { "@type": "LocationFeatureSpecification", name: "Private Pool", value: true },
      { "@type": "LocationFeatureSpecification", name: "Free WiFi", value: true },
      { "@type": "LocationFeatureSpecification", name: "Free Parking", value: true },
      { "@type": "LocationFeatureSpecification", name: "Air Conditioning", value: true },
      { "@type": "LocationFeatureSpecification", name: "Garden", value: true },
    ],
    checkinTime: "14:00",
    checkoutTime: "12:00",
    numberOfRooms: 2,
    petsAllowed: false,
    smokingAllowed: false,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
