import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import PageTracker from "@/components/PageTracker";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Arka Villa | Luxury Villa Management in Bali",
  description: "Book handpicked luxury villas across Bali directly with the best rates. Managed by Arka Villa Management Agency.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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

