// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Design System — Barrel Export
//
// Shared component library for all dashboard interfaces
// (Agency_Dashboard, Owner_Portal, Employee_Dashboard).
//
// Design principles:
//   ✓ Consistent 4px grid spacing
//   ✓ Heritage gold accent (#D4AF37) throughout
//   ✓ Dark theme default with light theme via CSS variables
//   ✓ WCAG AA contrast ratios (4.5:1 min for text)
//   ✓ Focus indicators for keyboard navigation
//   ✓ Mobile-responsive: all components adapt from 320px+
//   ✓ Organic easing curves for animations
// ─────────────────────────────────────────────────────────────────────────────

// StatCard — Metric display card with icon, value, and trend
export { StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

// DataTable — Sortable, filterable data table
export { DataTable } from './DataTable';
export type {
  DataTableProps,
  DataTableColumn,
  DataTableSort,
  SortDirection,
} from './DataTable';

// LoadingState — Skeleton loaders, spinners, and loading placeholders
export {
  Skeleton,
  Spinner,
  PulseDots,
  CardSkeleton,
  TableSkeleton,
  PageLoading,
} from './LoadingState';
export type {
  SkeletonProps,
  SpinnerProps,
  PulseDotsProps,
  CardSkeletonProps,
  TableSkeletonProps,
  PageLoadingProps,
} from './LoadingState';

// ChartWrapper — Responsive chart container with header and legend
export { ChartWrapper, ChartLegend, PeriodSelector } from './ChartWrapper';
export type {
  ChartWrapperProps,
  ChartLegendItem,
  ChartLegendProps,
  ChartPeriod,
  PeriodSelectorProps,
} from './ChartWrapper';

// EmptyState — No-data illustrations and error states
export { EmptyState, ErrorState } from './EmptyState';
export type {
  EmptyStateProps,
  EmptyStateVariant,
  ErrorStateProps,
} from './EmptyState';

// OnboardingTour — Step-by-step guided onboarding flow
export {
  OnboardingTour,
  defaultSteps,
  getOnboardingState,
  setOnboardingState,
  resetOnboardingState,
} from './OnboardingTour';
export type {
  OnboardingTourProps,
  OnboardingStep,
  OnboardingRole,
  OnboardingState,
} from './OnboardingTour';
