"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/dashboard/agency/Navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Agency Dashboard Layout
 * Protects dashboard routes client-side (since auth is localStorage-based in dev).
 * In production, the proxy.ts JWT check handles this server-side.
 */
export default function AgencyDesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return; // still hydrating
    if (!user) {
      router.replace("/login?from=/web/agency");
      return;
    }
    if (user.role !== "admin" && user.role !== "staff") {
      router.replace("/login?error=unauthorized");
      return;
    }
    setReady(true);
  }, [user, loading, router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-heritage-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-heritage-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/30 text-xs uppercase tracking-widest">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-heritage-charcoal">
      <Navigation variant="sidebar" />
      <main className="ml-60 min-h-screen p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
