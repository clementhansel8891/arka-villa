"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Legacy /admin route — redirects to the new agency dashboard.
 */
export default function AdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/web/agency");
  }, [router]);

  return (
    <div className="min-h-screen bg-heritage-charcoal flex items-center justify-center">
      <p className="text-white/30 text-xs uppercase tracking-widest">Redirecting to Agency Dashboard...</p>
    </div>
  );
}
