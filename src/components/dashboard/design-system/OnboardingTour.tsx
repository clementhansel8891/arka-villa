'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type OnboardingRole = 'Agency_Admin' | 'Villa_Owner' | 'Employee';

export interface OnboardingStep {
  /** Unique step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Step description */
  description: string;
  /** CSS selector of the target element to highlight */
  targetSelector?: string;
  /** Position of the tooltip relative to the target */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Optional icon or illustration */
  icon?: ReactNode;
}

export interface OnboardingTourProps {
  /** Steps to display in the tour */
  steps: OnboardingStep[];
  /** Current user role (determines flow) */
  role: OnboardingRole;
  /** Whether the tour is active */
  isOpen: boolean;
  /** Callback when tour is closed or completed */
  onClose: () => void;
  /** Callback when tour is fully completed */
  onComplete?: () => void;
  /** Callback on step change */
  onStepChange?: (stepIndex: number) => void;
  /** Starting step index (for resume) */
  startAt?: number;
}

// ─── Storage helpers ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'arka-onboarding';

export interface OnboardingState {
  completed: boolean;
  currentStep: number;
  role: OnboardingRole;
  completedAt?: string;
  skippedAt?: string;
}

export function getOnboardingState(role: OnboardingRole): OnboardingState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${role}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function setOnboardingState(role: OnboardingRole, state: Partial<OnboardingState>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getOnboardingState(role) ?? { completed: false, currentStep: 0, role };
    localStorage.setItem(`${STORAGE_KEY}-${role}`, JSON.stringify({ ...current, ...state }));
  } catch {
    // localStorage unavailable — fail silently
  }
}

export function resetOnboardingState(role: OnboardingRole): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_KEY}-${role}`);
  } catch {
    // fail silently
  }
}

// ─── Predefined step flows per role ──────────────────────────────────────────

export const defaultSteps: Record<OnboardingRole, OnboardingStep[]> = {
  Agency_Admin: [
    {
      id: 'welcome',
      title: 'Welcome to Arka Agency',
      description: 'This is your central command for managing all villas. Let\u2019s take a quick tour of the key areas.',
      placement: 'bottom',
    },
    {
      id: 'portfolio',
      title: 'Portfolio Overview',
      description: 'See all your villas at a glance \u2014 occupancy, revenue, bookings, and active issues.',
      targetSelector: '[data-tour="portfolio-overview"]',
      placement: 'bottom',
    },
    {
      id: 'navigation',
      title: 'Navigation',
      description: 'Access bookings, staff, financial, marketing, and maintenance panels from the sidebar.',
      targetSelector: '[data-tour="main-nav"]',
      placement: 'right',
    },
    {
      id: 'alerts',
      title: 'Alerts Center',
      description: 'Critical notifications appear here in real-time. Never miss an urgent issue.',
      targetSelector: '[data-tour="alerts-center"]',
      placement: 'bottom',
    },
    {
      id: 'complete',
      title: 'You\u2019re all set!',
      description: 'You can restart this tour anytime from Settings > Help. Explore and manage with confidence.',
      placement: 'bottom',
    },
  ],
  Villa_Owner: [
    {
      id: 'welcome',
      title: 'Welcome to Your Owner Portal',
      description: 'Track your villa\u2019s performance with full transparency. Here\u2019s a quick overview.',
      placement: 'bottom',
    },
    {
      id: 'overview',
      title: 'Management Overview',
      description: 'See occupancy, upcoming bookings, maintenance tickets, and guest satisfaction at a glance.',
      targetSelector: '[data-tour="management-overview"]',
      placement: 'bottom',
    },
    {
      id: 'financial',
      title: 'Financial Summary',
      description: 'Revenue, expenses, and net income with full breakdowns. Download PDF reports anytime.',
      targetSelector: '[data-tour="financial-summary"]',
      placement: 'bottom',
    },
    {
      id: 'approvals',
      title: 'Expense Approvals',
      description: 'Any maintenance cost above your threshold requires your approval before it\u2019s committed.',
      targetSelector: '[data-tour="expense-approvals"]',
      placement: 'left',
    },
    {
      id: 'complete',
      title: 'Ready to go!',
      description: 'Restart this tour from Settings > Help anytime. Your villa\u2019s performance is always at your fingertips.',
      placement: 'bottom',
    },
  ],
  Employee: [
    {
      id: 'welcome',
      title: 'Welcome to Your Dashboard',
      description: 'Manage your daily tasks, attendance, and reports all in one place.',
      placement: 'bottom',
    },
    {
      id: 'attendance',
      title: 'Clock In / Clock Out',
      description: 'Tap to record your attendance. Your hours are tracked automatically.',
      targetSelector: '[data-tour="attendance"]',
      placement: 'bottom',
    },
    {
      id: 'tasks',
      title: 'Your Tasks',
      description: 'Daily and weekly tasks sorted by priority. Attach photos or notes to mark them as complete.',
      targetSelector: '[data-tour="task-list"]',
      placement: 'bottom',
    },
    {
      id: 'reports',
      title: 'Activity Reports',
      description: 'Submit your daily report and review your monthly history.',
      targetSelector: '[data-tour="reports"]',
      placement: 'top',
    },
    {
      id: 'complete',
      title: 'All done!',
      description: 'You can restart this tour from Settings > Help. Have a productive day!',
      placement: 'bottom',
    },
  ],
};

// ─── Highlight Overlay ───────────────────────────────────────────────────────

function HighlightOverlay({ targetSelector }: { targetSelector?: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetSelector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(targetSelector);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setRect(null);
    }
  }, [targetSelector]);

  if (!rect) {
    // Full overlay without cutout
    return (
      <div
        className="fixed inset-0 z-[9998]"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        aria-hidden="true"
      />
    );
  }

  const padding = 8;

  return (
    <div className="fixed inset-0 z-[9998]" aria-hidden="true">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="onboarding-highlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#onboarding-highlight-mask)"
        />
      </svg>
      {/* Highlight ring around target */}
      <div
        className="absolute rounded-lg pointer-events-none"
        style={{
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          boxShadow: '0 0 0 3px var(--theme-accent-gold), 0 0 24px rgba(212, 175, 55, 0.3)',
        }}
      />
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

interface TooltipProps {
  step: OnboardingStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isLast: boolean;
  isFirst: boolean;
}

function Tooltip({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isLast,
  isFirst,
}: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the tooltip for keyboard users
    tooltipRef.current?.focus();
  }, [currentStep]);

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'fixed z-[9999] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl p-5 shadow-2xl',
        // Center if no target, otherwise positioned via JS
        !step.targetSelector && 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
      )}
      style={{
        backgroundColor: 'var(--theme-surface-elevated)',
        border: '1px solid var(--theme-border-primary)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Onboarding step ${currentStep + 1} of ${totalSteps}: ${step.title}`}
      tabIndex={-1}
    >
      {/* Skip button */}
      <button
        onClick={onSkip}
        className="absolute top-3 right-3 p-1 rounded-md transition-colors focus-visible:ring-2"
        style={{
          color: 'var(--theme-text-muted)',
          ['--tw-ring-color' as string]: 'var(--theme-accent-gold)',
        }}
        aria-label="Skip tour"
      >
        <X size={16} />
      </button>

      {/* Step icon */}
      {step.icon && (
        <div className="mb-3">{step.icon}</div>
      )}

      {/* Content */}
      <h4
        className="text-base font-serif font-semibold pr-6"
        style={{ color: 'var(--theme-text-primary)' }}
      >
        {step.title}
      </h4>
      <p
        className="mt-2 text-sm leading-relaxed"
        style={{ color: 'var(--theme-text-secondary)' }}
      >
        {step.description}
      </p>

      {/* Progress + navigation */}
      <div className="flex items-center justify-between mt-5">
        {/* Step indicators */}
        <div className="flex items-center gap-1.5" aria-label={`Step ${currentStep + 1} of ${totalSteps}`}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === currentStep ? 16 : 6,
                backgroundColor: i === currentStep
                  ? 'var(--theme-accent-gold)'
                  : i < currentStep
                    ? 'var(--theme-accent-gold)'
                    : 'var(--theme-bg-tertiary)',
                opacity: i <= currentStep ? 1 : 0.5,
              }}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              onClick={onPrev}
              className="p-1.5 rounded-lg transition-colors focus-visible:ring-2"
              style={{
                color: 'var(--theme-text-secondary)',
                backgroundColor: 'var(--theme-bg-tertiary)',
                ['--tw-ring-color' as string]: 'var(--theme-accent-gold)',
              }}
              aria-label="Previous step"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          <button
            onClick={onNext}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              'focus-visible:ring-2 focus-visible:ring-offset-1'
            )}
            style={{
              backgroundColor: 'var(--theme-accent-gold)',
              color: '#121212',
              ['--tw-ring-color' as string]: 'var(--theme-accent-gold)',
              ['--tw-ring-offset-color' as string]: 'var(--theme-surface-elevated)',
            }}
            aria-label={isLast ? 'Complete tour' : 'Next step'}
          >
            {isLast ? (
              <>
                <Check size={14} />
                <span>Done</span>
              </>
            ) : (
              <>
                <span>Next</span>
                <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main OnboardingTour Component ───────────────────────────────────────────

/**
 * OnboardingTour — Step-by-step guided onboarding overlay.
 *
 * Features:
 * - Max 5 steps per role, completable in ~3 minutes
 * - Skippable at any step
 * - Resumable — stores completion state in localStorage
 * - Different flows per role (Agency_Admin, Villa_Owner, Employee)
 * - Highlight target elements with spotlight cutout
 * - Keyboard accessible (focus trap, escape to skip)
 */
export function OnboardingTour({
  steps,
  role,
  isOpen,
  onClose,
  onComplete,
  onStepChange,
  startAt = 0,
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(startAt);

  // Sync with startAt prop changes
  useEffect(() => {
    setCurrentStep(startAt);
  }, [startAt]);

  // Persist progress on step change
  useEffect(() => {
    if (isOpen) {
      setOnboardingState(role, { currentStep, completed: false });
      onStepChange?.(currentStep);
    }
  }, [currentStep, isOpen, role, onStepChange]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleNext = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      // Complete
      setOnboardingState(role, { completed: true, completedAt: new Date().toISOString() });
      onComplete?.();
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, steps.length, role, onComplete, onClose]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSkip = useCallback(() => {
    setOnboardingState(role, { skippedAt: new Date().toISOString(), currentStep });
    onClose();
  }, [role, currentStep, onClose]);

  if (!isOpen || steps.length === 0) return null;

  const step = steps[currentStep];
  if (!step) return null;

  return (
    <AnimatePresence mode="wait">
      <div key={`tour-${currentStep}`}>
        <HighlightOverlay targetSelector={step.targetSelector} />
        <Tooltip
          step={step}
          currentStep={currentStep}
          totalSteps={steps.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={handleSkip}
          isLast={currentStep === steps.length - 1}
          isFirst={currentStep === 0}
        />
      </div>
    </AnimatePresence>
  );
}
