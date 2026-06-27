"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

export interface TouchFeedbackProps {
  /** Content to wrap with touch feedback */
  children: ReactNode;
  /** Custom class for the wrapper */
  className?: string;
  /** Scale factor on press (default: 0.96 for subtle iOS-like press) */
  pressScale?: number;
  /** Opacity on press (default: 0.7) */
  pressOpacity?: number;
  /** Whether the feedback is disabled */
  disabled?: boolean;
  /** Callback on tap/click */
  onPress?: () => void;
  /** Accessible label for the interactive element */
  ariaLabel?: string;
  /** Role override (defaults to "button") */
  role?: string;
}

/**
 * Touch feedback wrapper that provides haptic-style visual feedback on press.
 *
 * Applies a scale-down + opacity change on touch/press to simulate native
 * button press behavior (like iOS UIButton highlight state).
 *
 * Meets requirement 18.4: tap-based interactions only, no hover dependency.
 * Touch target meets 48x48px minimum (requirement 18.2) when applied to cards.
 *
 * Separated from business logic for Native_App portability (requirement 18.7).
 */
export function TouchFeedback({
  children,
  className,
  pressScale = 0.96,
  pressOpacity = 0.7,
  disabled = false,
  onPress,
  ariaLabel,
  role = "button",
}: TouchFeedbackProps) {
  return (
    <motion.div
      className={`select-none ${className ?? ""}`}
      whileTap={
        disabled
          ? undefined
          : { scale: pressScale, opacity: pressOpacity }
      }
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onTap={disabled ? undefined : onPress}
      role={role}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      style={{
        cursor: disabled ? "default" : "pointer",
        minWidth: 48,
        minHeight: 48,
      }}
    >
      {children}
    </motion.div>
  );
}
