'use client';

/**
 * Customer Support Widget — Floating support for Villa Websites
 *
 * Persistent floating widget providing visitors/guests with access to
 * WhatsApp, Telegram, and AI-powered support. Expands on click to show
 * communication channel options and collapses on click outside.
 *
 * Configurable per villa:
 * - Which channels are active (WhatsApp, Telegram, AI chat)
 * - Operating hours for human agents
 * - Custom greeting message
 * - Estimated human response time
 *
 * Design language: Follows villa website's bespoke aesthetic with
 * dark surfaces, accent color highlights, and smooth animations.
 *
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SupportWidgetButton } from './SupportWidgetButton';
import { SupportWidgetPanel, type SupportChannel, type SupportHours } from './SupportWidgetPanel';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SupportWidgetConfig {
  villaName: string;
  villaId: string;
  tenantId: string;
  accentColor: string;
  /** Communication channels available for this villa */
  channels: SupportChannel[];
  /** Custom greeting message displayed when panel opens */
  greeting?: string;
  /** Operating hours for human support agents */
  supportHours?: SupportHours;
  /** Estimated response time when outside support hours, e.g. "2 hours" */
  estimatedResponseTime?: string;
}

export type { SupportChannel, SupportHours };

// ─── Component ───────────────────────────────────────────────────────────────

export function SupportWidget({
  villaName,
  villaId,
  tenantId,
  accentColor,
  channels,
  greeting,
  supportHours,
  estimatedResponseTime,
}: SupportWidgetConfig) {
  const [isOpen, setIsOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        isOpen &&
        widgetRef.current &&
        !widgetRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    },
    [isOpen]
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div
      ref={widgetRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
      role="region"
      aria-label="Customer support"
    >
      {/* Expanded Panel */}
      <AnimatePresence>
        {isOpen && (
          <SupportWidgetPanel
            villaName={villaName}
            villaId={villaId}
            tenantId={tenantId}
            accentColor={accentColor}
            channels={channels}
            greeting={greeting}
            supportHours={supportHours}
            estimatedResponseTime={estimatedResponseTime}
          />
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <SupportWidgetButton
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
        accentColor={accentColor}
      />
    </div>
  );
}
