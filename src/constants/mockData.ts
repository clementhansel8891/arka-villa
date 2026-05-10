export const VILLA_DETAILS = {
  name: "Arka Villa",
  location: "Ubud, Bali",
  description: "A sanctuary where modern luxury meets Balinese ancestral heritage. Experience the soul of Bali in our meticulously crafted villa.",
  amenities: [
    { id: "pool", name: "Infinity Pool", icon: "Waves" },
    { id: "spa", name: "Private Spa", icon: "Sparkles" },
    { id: "chef", name: "Private Chef", icon: "Utensils" },
    { id: "butler", name: "24/7 Butler", icon: "UserCheck" },
    { id: "gym", name: "Jungle Gym", icon: "Dumbbell" },
    { id: "yoga", name: "Yoga Shala", icon: "Flower2" },
  ],
  rooms: [
    {
      id: "royal-suite",
      name: "The Royal Heritage Suite",
      description: "Our flagship suite featuring hand-carved teak panels and a private terrace.",
      price: 1200,
      image: "/images/suite.png",
      features: ["King Size Bed", "Jungle View", "Outdoor Tub"],
    },
    {
      id: "jungle-villa",
      name: "Jungle Horizon Villa",
      description: "Perched on the edge of the valley, offering breathtaking sunrise views.",
      price: 950,
      image: "/images/jungle.png",
      features: ["Infinity Pool", "Private Garden", "Rain Shower"],
    }
  ],
  heroVideo: "https://assets.mixkit.co/videos/preview/mixkit-tropical-luxury-resort-villa-with-pool-42523-large.mp4", // Stable luxury villa shot
  heroImage: "/images/hero.png"
};

export const ANALYTICS_DATA = {
  revenue: [
    { month: "Jan", amount: 45000 },
    { month: "Feb", amount: 52000 },
    { month: "Mar", amount: 48000 },
    { month: "Apr", amount: 61000 },
    { month: "May", amount: 55000 },
    { month: "Jun", amount: 67000 },
  ],
  occupancy: 88,
  metaAdsROI: 4.2,
  googleAdsROI: 3.8,
  performance: [
    { category: "Meta Ads", value: 4.2 },
    { category: "Google Ads", value: 3.8 },
    { category: "Organic", value: 5.1 },
    { category: "Direct", value: 3.5 },
  ]
};
