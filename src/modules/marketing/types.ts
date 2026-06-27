/**
 * Marketing module types.
 *
 * Covers campaign tracking, ad platform metric aggregation,
 * ROAS calculation, budget alerts, UTM attribution, and
 * cross-villa comparison views.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

// ─── Campaign Platform ────────────────────────────────────────────────────────

export type CampaignPlatform = 'meta' | 'google' | 'direct';

export type CampaignStatus = 'active' | 'paused' | 'completed' | 'draft';

// ─── Time Period Selection ────────────────────────────────────────────────────

export type TimePeriodPreset = 'last_7d' | 'last_30d' | 'last_90d' | 'custom';

export interface TimePeriod {
  preset: TimePeriodPreset;
  startDate?: string; // YYYY-MM-DD, required when preset is 'custom'
  endDate?: string;   // YYYY-MM-DD, required when preset is 'custom'
}

// ─── Campaign Core ────────────────────────────────────────────────────────────

export interface MarketingCampaign {
  id: string;
  name: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  budget: number;
  currency: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  name: string;
  platform: CampaignPlatform;
  status?: CampaignStatus;
  budget: number;
  currency?: string;
  startDate: string;
  endDate: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface MarketingMetrics {
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;           // click-through rate (clicks / impressions * 100)
  conversions: number;
  costPerConversion: number | null; // null when conversions = 0
  revenue: number;
  roas: number | undefined; // undefined when spend = 0
}

export interface CampaignMetrics extends MarketingMetrics {
  campaignId: string;
  campaignName: string;
  platform: CampaignPlatform;
}

export interface AggregatedMetrics extends MarketingMetrics {
  period: {
    startDate: string;
    endDate: string;
  };
  lastUpdatedAt: string | null;
  dataUnavailable: boolean;
  unavailableNotice?: string;
}

// ─── ROAS Calculation ─────────────────────────────────────────────────────────

export interface ROASResult {
  roas: number | undefined; // undefined when spend = 0
  revenue: number;
  spend: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface ROASByDimension {
  villa?: { villaId: string; villaName?: string; roas: ROASResult };
  channel?: { channel: CampaignPlatform; roas: ROASResult };
  campaign?: { campaignId: string; campaignName: string; roas: ROASResult };
}

// ─── Budget Alerts ────────────────────────────────────────────────────────────

export interface BudgetThreshold {
  villaId: string;
  threshold: number;
  currency: string;
  currentSpend: number;
  exceeded: boolean;
  exceededAt: string | null;
  alertSentAt: string | null;
}

// ─── Attribution ──────────────────────────────────────────────────────────────

export interface Attribution {
  bookingId: string;
  campaignId: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  clickDate: string;
  bookingDate: string;
  daysToConversion: number;
}

// ─── Comparison View ──────────────────────────────────────────────────────────

export interface VillaComparisonEntry {
  villaId: string;
  villaName: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  roas: number | undefined;
}

// ─── API Unavailability ───────────────────────────────────────────────────────

export interface DataFreshness {
  lastRetrievedAt: string | null;
  isStale: boolean;
  unavailableNotice: string | null;
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface CampaignRow {
  id: string;
  name: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  budget: string;       // numeric from PG comes as string
  currency: string;
  start_date: string;
  end_date: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetricRow {
  id: string;
  campaign_id: string;
  date: string;
  impressions: string;  // bigint from PG comes as string
  clicks: string;
  cost: string;
  conversions: string;
  revenue: string;
}

export interface MetricAggregateRow {
  total_impressions: string;
  total_clicks: string;
  total_cost: string;
  total_conversions: string;
  total_revenue: string;
}

export interface CampaignMetricRow extends MetricAggregateRow {
  campaign_id: string;
  campaign_name: string;
  platform: CampaignPlatform;
}

export interface AttributionRow {
  booking_id: string;
  campaign_id: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  click_date: string;
  booking_date: string;
}
