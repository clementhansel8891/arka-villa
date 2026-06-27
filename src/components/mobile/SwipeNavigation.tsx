"use client";

import {
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";

/** Minimum swipe velocity (px/s) to trigger navigation */
const SWIPE_VELOCITY_THRESHOLD = 300;
/** Minimum swipe distance (px) to trigger navigation */
const SWIPE_DISTANCE_THRESHOLD = 50;
/** Minimum gesture area height per requirement (44px) */
const GESTURE_AREA_MIN_HEIGHT = 44;

export interface SwipeNavigationItem {
  /** Unique key for the panel */
  key: string;
  /** Label for accessibility/tab indicators */
  label: string;
  /** Content to render in this panel */
  content: ReactNode;
}

export interface SwipeNavigationProps {
  /** Panels available for horizontal swiping */
  items: SwipeNavigationItem[];
  /** Currently active panel index (controlled) */
  activeIndex?: number;
  /** Callback when active panel changes */
  onIndexChange?: (index: number) => void;
  /** Custom class for the container */
  className?: string;
}

const swipeVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

/**
 * Horizontal swipe navigation between panels/tabs.
 *
 * Implements requirement 18.3: swipe gestures for navigating between tabs.
 * Gesture areas are at least 44px. Supports both controlled and uncontrolled modes.
 *
 * Separated presentation (animation) from business logic (index management)
 * for Native_App portability.
 */
export function SwipeNavigation({
  items,
  activeIndex: controlledIndex,
  onIndexChange,
  className,
}: SwipeNavigationProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const currentIndex = controlledIndex ?? internalIndex;

  const goTo = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= items.length) return;
      setDirection(newIndex > currentIndex ? 1 : -1);
      if (onIndexChange) {
        onIndexChange(newIndex);
      } else {
        setInternalIndex(newIndex);
      }
    },
    [currentIndex, items.length, onIndexChange]
  );

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      const swipedRight =
        offset.x < -SWIPE_DISTANCE_THRESHOLD ||
        velocity.x < -SWIPE_VELOCITY_THRESHOLD;
      const swipedLeft =
        offset.x > SWIPE_DISTANCE_THRESHOLD ||
        velocity.x > SWIPE_VELOCITY_THRESHOLD;

      if (swipedRight && currentIndex < items.length - 1) {
        goTo(currentIndex + 1);
      } else if (swipedLeft && currentIndex > 0) {
        goTo(currentIndex - 1);
      }
    },
    [currentIndex, goTo, items.length]
  );

  const currentItem = items[currentIndex];

  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ minHeight: GESTURE_AREA_MIN_HEIGHT }}
    >
      {/* Tab indicators */}
      <div
        className="flex gap-1 justify-center pb-2"
        role="tablist"
        aria-label="Swipe navigation"
      >
        {items.map((item, i) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={i === currentIndex}
            aria-label={item.label}
            onClick={() => goTo(i)}
            className="h-1.5 rounded-full transition-all duration-200"
            style={{
              width: i === currentIndex ? 24 : 8,
              backgroundColor:
                i === currentIndex
                  ? "var(--theme-accent-gold, #d4a574)"
                  : "var(--theme-border-secondary, #e2e2e2)",
              minHeight: 6,
              minWidth: 8,
            }}
          />
        ))}
      </div>

      {/* Swipeable content area */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentItem?.key}
          custom={direction}
          variants={swipeVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="w-full touch-pan-y"
          style={{ minHeight: GESTURE_AREA_MIN_HEIGHT }}
          role="tabpanel"
          aria-label={currentItem?.label}
        >
          {currentItem?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
