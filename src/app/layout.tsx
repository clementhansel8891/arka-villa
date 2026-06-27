import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import PageTracker from "@/components/PageTracker";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: true,
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#121212",
};

export const metadata: Metadata = {
  title: {
    default: "Arka Villa Management | Luxury Villas in Bali",
    template: "%s | Arka Villa",
  },
  description: "Book handpicked luxury villas across Bali directly with the best rates. Premium villa management, concierge services, and direct booking.",
  keywords: ["bali villa", "luxury villa ubud", "villa management bali", "arka villa", "private pool villa", "ubud accommodation", "bali holiday rental"],
  authors: [{ name: "Arka Villa Management" }],
  creator: "Arka Villa Management",
  publisher: "Arka Villa Management",
  metadataBase: new URL("https://arka-villa.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://arka-villa.com",
    siteName: "Arka Villa Management",
    title: "Arka Villa Management | Luxury Villas in Bali",
    description: "Book handpicked luxury villas across Bali directly. Premium management, best rates, no middlemen.",
    images: [
      {
        url: "/images/villas/arka-villa/front-view.webp",
        width: 1920,
        height: 1080,
        alt: "Arka Villa - Luxury Villa in Ubud, Bali",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arka Villa Management | Luxury Villas in Bali",
    description: "Book handpicked luxury villas across Bali directly with the best rates.",
    images: ["/images/villas/arka-villa/front-view.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <AuthProvider>
          <ThemeProvider>
            <PageTracker />
            {children}
            <WhatsAppFloat />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
