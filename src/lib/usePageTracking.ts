"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackPageView, updateDuration } from "./analytics-store";

/**
 * Hook that automatically tracks page views on every route change.
 * Place this in a layout component to track all pages under it.
 */
export function usePageTracking() {
  const pathname = usePathname();
  const viewIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Track new page view
    startTimeRef.current = Date.now();
    viewIdRef.current = trackPageView(pathname);

    // Update duration when leaving
    return () => {
      if (viewIdRef.current) {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        updateDuration(viewIdRef.current, duration);
      }
    };
  }, [pathname]);
}
