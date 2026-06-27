"use client";

import {
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

/** Minimum drag distance (px) to trigger a refresh */
const PULL_THRESHOLD = 64;
/** Maximum visual pull distance */
const MAX_PULL = 120;
/** Minimum gesture area height per requirement (44px) */
const GESTURE_AREA_MIN = 44;

export interface PullToRefreshProps {
  /** Callback invoked when the pull-to-refresh threshold is met */
  onRefresh: () => Promise<void>;
  /** Content to render inside the scrollable area */
  children: ReactNode;
  /** Custom class for the container */
  className?: string;
  /** Whether pulling is disabled */
  disabled?: boolean;
}

/**
 * Pull-to-refresh wrapper implementing a native-like drag-down gesture.
 *
 * Business logic (onRefresh) is separated from presentation.
 * Designed for Native_App portability — gesture thresholds and animation
 * values are configurable constants.
 *
 * Meets requirement 18.6: pull-to-refresh on all scrollable content lists.
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const pullDistance = useMotionValue(0);
  const indicatorOpacity = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 1]);
  const indicatorRotation = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 360]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      const container = containerRef.current;
      // Only activate if scrolled to top
      if (container && container.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    },
    [disabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || disabled || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const delta = Math.max(0, currentY - startY.current);
      // Apply resistance factor for natural feel
      const dampened = Math.min(delta * 0.5, MAX_PULL);
      pullDistance.set(dampened);
    },
    [disabled, isRefreshing, pullDistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || disabled) return;
    isPulling.current = false;

    if (pullDistance.get() >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      pullDistance.set(PULL_THRESHOLD * 0.75);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        pullDistance.set(0);
      }
    } else {
      pullDistance.set(0);
    }
  }, [disabled, isRefreshing, onRefresh, pullDistance]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto overscroll-none ${className ?? ""}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ minHeight: GESTURE_AREA_MIN }}
    >
      {/* Pull indicator */}
      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-0 flex items-center justify-center"
        style={{
          height: pullDistance,
          opacity: indicatorOpacity,
        }}
        aria-hidden="true"
      >
        <motion.div
          className="h-6 w-6 rounded-full border-2 border-current border-t-transparent"
          style={{
            rotate: indicatorRotation,
            color: "var(--theme-accent-gold, #d4a574)",
          }}
          animate={isRefreshing ? { rotate: 360 } : undefined}
          transition={
            isRefreshing
              ? { repeat: Infinity, duration: 0.8, ease: "linear" }
              : undefined
          }
        />
      </motion.div>

      {/* Content area shifted down during pull */}
      <motion.div style={{ y: pullDistance }}>
        {children}
      </motion.div>
    </div>
  );
}
