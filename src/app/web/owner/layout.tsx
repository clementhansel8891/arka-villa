"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Owner Portal Layout
 * Provides auth protection only — the individual pages handle their own UI/navigation.
 */
export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?from=/web/owner");
      return;
    }
    if (user.role !== "owner" && user.role !== "admin") {
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
          <p className="text-white/30 text-xs uppercase tracking-widest">Loading owner portal...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
