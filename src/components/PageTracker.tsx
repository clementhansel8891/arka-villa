"use client";

import { usePageTracking } from "@/lib/usePageTracking";
import { seedDemoAnalytics } from "@/lib/analytics-store";
import { useEffect } from "react";

/**
 * Client component that tracks page views site-wide.
 * Place in root layout to capture all navigation events.
 */
export default function PageTracker() {
  usePageTracking();

  // Seed demo data on first load
  useEffect(() => {
    seedDemoAnalytics();
  }, []);

  return null;
}
