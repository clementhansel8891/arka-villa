export const VILLA_DETAILS = {
  name: "Arka Villa",
  location: "Ubud, Bali",
  description: "A sanctuary where modern luxury meets Balinese ancestral heritage. Experience the soul of Bali in our meticulously crafted villa.",
  amenities: [
    { 
      id: "pool", 
      name: "Infinity Pool", 
      icon: "Waves",
      description: "A 25-meter slate-tiled infinity pool that seems to spill into the lush Ubud jungle. Temperature-controlled and treated with natural salt.",
      image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800&q=80"
    },
    { 
      id: "spa", 
      name: "Private Spa", 
      icon: "Sparkles",
      description: "Traditional Balinese healing treatments in the privacy of your suite. Using organic oils and ancient techniques passed down through generations.",
      image: "https://images.unsplash.com/photo-1544161515-4af6b1d4b1b2?w=800&q=80"
    },
    { 
      id: "chef", 
      name: "Private Chef", 
      icon: "Utensils",
      description: "Gourmet Balinese and international cuisine prepared in-villa. Our chefs source ingredients daily from local organic markets.",
      image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80"
    },
    { 
      id: "butler", 
      name: "24/7 Butler", 
      icon: "UserCheck",
      description: "Dedicated personalized service for everything from unpacking to arranging spiritual ceremonies. Your wish is our priority.",
      image: "https://images.unsplash.com/photo-1563911302283-d2bc129e7570?w=800&q=80"
    },
    { 
      id: "gym", 
      name: "Jungle Gym", 
      icon: "Dumbbell",
      description: "Open-air fitness pavilion with state-of-the-art equipment, overlooking the sacred Agung river valley.",
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80"
    },
    { 
      id: "yoga", 
      name: "Yoga Shala", 
      icon: "Flower2",
      description: "A bamboo-crafted sanctuary for daily sunrise yoga and meditation sessions led by master practitioners.",
      image: "https://images.unsplash.com/photo-1545208393-2160291ba69e?w=800&q=80"
    },
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
  heroVideo: "/videos/hero-bali.mp4",
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
