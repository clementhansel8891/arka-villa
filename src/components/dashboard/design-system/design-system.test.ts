import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOnboardingState,
  setOnboardingState,
  resetOnboardingState,
  defaultSteps,
  type OnboardingRole,
  type OnboardingState,
} from './OnboardingTour';

// ─── Mock localStorage for Node environment ──────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Ensure `window` is defined so the storage helpers don't bail out
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', { value: globalThis });
}

// ─── Onboarding State Management Tests ───────────────────────────────────────

describe('OnboardingTour state management', () => {
  const roles: OnboardingRole[] = ['Agency_Admin', 'Villa_Owner', 'Employee'];

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns null when no state is stored for a role', () => {
    const state = getOnboardingState('Agency_Admin');
    expect(state).toBeNull();
  });

  it('persists and retrieves onboarding state', () => {
    setOnboardingState('Agency_Admin', { currentStep: 2, completed: false });
    const state = getOnboardingState('Agency_Admin');
    expect(state).not.toBeNull();
    expect(state!.currentStep).toBe(2);
    expect(state!.completed).toBe(false);
    expect(state!.role).toBe('Agency_Admin');
  });

  it('marks onboarding as completed', () => {
    const completedAt = new Date().toISOString();
    setOnboardingState('Villa_Owner', {
      completed: true,
      currentStep: 4,
      completedAt,
    });
    const state = getOnboardingState('Villa_Owner');
    expect(state!.completed).toBe(true);
    expect(state!.completedAt).toBe(completedAt);
  });

  it('resets onboarding state for a role', () => {
    setOnboardingState('Employee', { currentStep: 3, completed: false });
    resetOnboardingState('Employee');
    const state = getOnboardingState('Employee');
    expect(state).toBeNull();
  });

  it('maintains separate state per role', () => {
    setOnboardingState('Agency_Admin', { currentStep: 1 });
    setOnboardingState('Villa_Owner', { currentStep: 3 });
    setOnboardingState('Employee', { currentStep: 0 });

    expect(getOnboardingState('Agency_Admin')!.currentStep).toBe(1);
    expect(getOnboardingState('Villa_Owner')!.currentStep).toBe(3);
    expect(getOnboardingState('Employee')!.currentStep).toBe(0);
  });

  it('updates partial state without losing existing fields', () => {
    setOnboardingState('Agency_Admin', { currentStep: 0, completed: false });
    setOnboardingState('Agency_Admin', { currentStep: 2 });
    const state = getOnboardingState('Agency_Admin');
    expect(state!.currentStep).toBe(2);
    expect(state!.completed).toBe(false);
  });
});

// ─── Default Steps Structure Tests ───────────────────────────────────────────

describe('OnboardingTour default steps', () => {
  const roles: OnboardingRole[] = ['Agency_Admin', 'Villa_Owner', 'Employee'];

  it('provides steps for all three roles', () => {
    for (const role of roles) {
      expect(defaultSteps[role]).toBeDefined();
      expect(defaultSteps[role].length).toBeGreaterThan(0);
    }
  });

  it('limits steps to max 5 per role (completable in ~3 minutes)', () => {
    for (const role of roles) {
      expect(defaultSteps[role].length).toBeLessThanOrEqual(5);
    }
  });

  it('ensures each step has a unique id within its role', () => {
    for (const role of roles) {
      const ids = defaultSteps[role].map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });

  it('ensures each step has required title and description', () => {
    for (const role of roles) {
      for (const step of defaultSteps[role]) {
        expect(step.title).toBeTruthy();
        expect(step.description).toBeTruthy();
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('has a completion step as the last step for each role', () => {
    for (const role of roles) {
      const lastStep = defaultSteps[role][defaultSteps[role].length - 1];
      expect(lastStep.id).toBe('complete');
    }
  });
});

// ─── Design System Component Export Tests ────────────────────────────────────

describe('Dashboard design system barrel exports', () => {
  it('exports StatCard component', async () => {
    const module = await import('./index');
    expect(module.StatCard).toBeDefined();
  });

  it('exports DataTable component', async () => {
    const module = await import('./index');
    expect(module.DataTable).toBeDefined();
  });

  it('exports loading state components', async () => {
    const module = await import('./index');
    expect(module.Skeleton).toBeDefined();
    expect(module.Spinner).toBeDefined();
    expect(module.PulseDots).toBeDefined();
    expect(module.CardSkeleton).toBeDefined();
    expect(module.TableSkeleton).toBeDefined();
    expect(module.PageLoading).toBeDefined();
  });

  it('exports ChartWrapper and related components', async () => {
    const module = await import('./index');
    expect(module.ChartWrapper).toBeDefined();
    expect(module.ChartLegend).toBeDefined();
    expect(module.PeriodSelector).toBeDefined();
  });

  it('exports EmptyState and ErrorState components', async () => {
    const module = await import('./index');
    expect(module.EmptyState).toBeDefined();
    expect(module.ErrorState).toBeDefined();
  });

  it('exports OnboardingTour and helpers', async () => {
    const module = await import('./index');
    expect(module.OnboardingTour).toBeDefined();
    expect(module.defaultSteps).toBeDefined();
    expect(module.getOnboardingState).toBeDefined();
    expect(module.setOnboardingState).toBeDefined();
    expect(module.resetOnboardingState).toBeDefined();
  });
});
