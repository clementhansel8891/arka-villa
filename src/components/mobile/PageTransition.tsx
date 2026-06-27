"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type TransitionDirection = "forward" | "backward";

export interface PageTransitionProps {
  /** Unique key for the current page (triggers transition on change) */
  pageKey: string;
  /** Direction of the transition (forward = slide from right, backward = slide from left) */
  direction?: TransitionDirection;
  /** Content to render with transition */
  children: ReactNode;
  /** Custom class for the wrapper */
  className?: string;
}

const slideVariants = {
  enterForward: {
    x: "100%",
    opacity: 0,
  },
  enterBackward: {
    x: "-100%",
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exitForward: {
    x: "-30%",
    opacity: 0,
  },
  exitBackward: {
    x: "30%",
    opacity: 0,
  },
};

const transitionConfig = {
  type: "spring" as const,
  stiffness: 350,
  damping: 30,
  mass: 0.8,
};

/**
 * Native-like page transition wrapper using slide animations.
 *
 * Forward navigation slides in from the right (like iOS push).
 * Backward navigation slides in from the left (like iOS pop).
 *
 * Wraps content in AnimatePresence for automatic enter/exit animations.
 * Designed as a self-contained module for Native_App portability (requirement 18.7).
 */
export function PageTransition({
  pageKey,
  direction = "forward",
  children,
  className,
}: PageTransitionProps) {
  const isForward = direction === "forward";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={isForward ? "enterForward" : "enterBackward"}
        animate="center"
        exit={isForward ? "exitForward" : "exitBackward"}
        variants={slideVariants}
        transition={transitionConfig}
        className={`w-full ${className ?? ""}`}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
