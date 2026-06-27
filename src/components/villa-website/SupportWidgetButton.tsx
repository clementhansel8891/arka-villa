'use client';

/**
 * Support Widget Floating Action Button
 *
 * Persistent floating button in the bottom-right corner of villa websites.
 * Includes a pulse animation when closed to draw attention, and smoothly
 * transitions to a close icon when the panel is open.
 *
 * Design language: Uses the villa's accent color, minimal and elegant.
 *
 * Requirements: 26.1
 */

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';

export interface SupportWidgetButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  accentColor: string;
}

export function SupportWidgetButton({ isOpen, onToggle, accentColor }: SupportWidgetButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      onClick={onToggle}
      className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
      style={{
        backgroundColor: accentColor,
        boxShadow: `0 4px 20px ${accentColor}40`,
      }}
      aria-label={isOpen ? 'Close support widget' : 'Open support widget'}
      aria-expanded={isOpen}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X size={22} className="text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MessageCircle size={24} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse ring — visible only when widget is closed */}
      {!isOpen && (
        <span
          className="absolute inset-0 rounded-full animate-ping opacity-25"
          style={{ backgroundColor: accentColor }}
        />
      )}
    </motion.button>
  );
}
