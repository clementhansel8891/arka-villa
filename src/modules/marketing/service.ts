/**
 * Marketing service — business logic for campaign tracking, metrics
 * aggregation, ROAS calculation, attribution, and budget alerts.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import type {
  MarketingCampaign,
  CreateCampaignRequest,
  CampaignPlatform,
  CampaignStatus,
  TimePeriod,
  AggregatedMetrics,
  CampaignMetrics,
  ROASResult,
  BudgetThreshold,
  Attribution,
  VillaComparisonEntry,
  CampaignRow,
  MetricAggregateRow,
  CampaignMetricRow,
} from './types';
import {
  insertCampaign,
  listCampaigns,
  getCampaignById,
  getAggregatedMetrics,
  getMetricsPerCampaign,
  getMetricsPerPlatform,
  getLastMetricDate,
  getBudgetThreshold,
  getCurrentMonthSpend,
  findAttributableCampaign,
  insertAttribution,
  getAttributions,
} from './repository';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_PLATFORMS: CampaignPlatform[] = ['meta', 'google', 'direct'];
const VALID_STATUSES: CampaignStatus[] = ['active', 'paused', 'completed', 'draft'];
const ATTRIBUTION_WINDOW_DAYS = 30;

// ─── Campaign Management ──────────────────────────────────────────────────────

/**
 * Creates a new marketing campaign.
 *
 * Validates all required fields and records the campaign for tracking.
 * UTM parameters enable 30-day last-click attribution.
 *
 * @param tenantId - The tenant/villa ID
 * @param request - Campaign creation data
 * @returns Created campaign
 */
export async function createCampaign(
  tenantId: string,
  request: CreateCampaignRequest
): Promise<MarketingCampaign> {
  // Validate required fields
  if (!request.name || request.name.trim().length === 0) {
    throw new MarketingError('Campaign name is required', 'MISSING_NAME', 400);
  }

  if (!VALID_PLATFORMS.includes(request.platform)) {
    throw new MarketingError(
      `Invalid platform: ${request.platform}. Must be one of: ${VALID_PLATFORMS.join(', ')}`,
      'INVALID_PLATFORM',
      400
    );
  }

  const status = request.status ?? 'draft';
  if (!VALID_STATUSES.includes(status)) {
    throw new MarketingError(
      `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`,
      'INVALID_STATUS',
      400
    );
  }

  if (typeof request.budget !== 'number' || request.budget < 0) {
    throw new MarketingError(
      'Budget must be a non-negative number',
      'INVALID_BUDGET',
      400
    );
  }

  if (!request.startDate || !request.endDate) {
    throw new MarketingError(
      'Start date and end date are required',
      'MISSING_DATES',
      400
    );
  }

  if (request.startDate > request.endDate) {
    throw new MarketingError(
      'Start date must be before or equal to end date',
      'INVALID_DATE_RANGE',
      400
    );
  }

  const row = await insertCampaign(tenantId, {
    name: request.name.trim(),
    platform: request.platform,
    status,
    budget: request.budget,
    currency: request.currency ?? 'USD',
    startDate: request.startDate,
    endDate: request.endDate,
    utmSource: request.utmSource ?? null,
    utmMedium: request.utmMedium ?? null,
    utmCampaign: request.utmCampaign ?? null,
  });

  return mapRowToCampaign(row);
}

/**
 * Lists campaigns for a tenant with optional filtering.
 */
export async function getCampaigns(
  tenantId: string,
  filters?: {
    platform?: CampaignPlatform;
    status?: CampaignStatus;
    limit?: number;
    offset?: number;
  }
): Promise<{ campaigns: MarketingCampaign[]; total: number }> {
  const result = await listCampaigns(tenantId, filters);
  return {
    campaigns: result.rows.map(mapRowToCampaign),
    total: result.total,
  };
}

// ─── Metrics Aggregation ──────────────────────────────────────────────────────

/**
 * Gets aggregated marketing metrics for a time period.
 *
 * Aggregates impressions, clicks, cost, CTR, conversions, and
 * cost-per-conversion from Meta and Google Ads data.
 *
 * If API data is unavailable, returns last retrieved data with
 * timestamp and unavailability notice (Requirement 7.7).
 *
 * @param tenantId - The tenant/villa ID
 * @param period - Time period selection
 * @returns Aggregated metrics with freshness information
 */
export async function getMetrics(
  tenantId: string,
  period: TimePeriod
): Promise<AggregatedMetrics> {
  const { startDate, endDate } = resolvePeriodDates(period);

  const aggregate = await getAggregatedMetrics(tenantId, startDate, endDate);
  const lastMetricDate = await getLastMetricDate(tenantId);

  // Determine data freshness — stale if last metric is older than 2 hours
  const isStale = checkDataStaleness(lastMetricDate);

  if (!aggregate) {
    return buildEmptyMetrics(startDate, endDate, lastMetricDate, isStale);
  }

  const impressions = parseInt(aggregate.total_impressions, 10);
  const clicks = parseInt(aggregate.total_clicks, 10);
  const cost = parseFloat(aggregate.total_cost);
  const conversions = parseInt(aggregate.total_conversions, 10);
  const revenue = parseFloat(aggregate.total_revenue);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const costPerConversion = conversions > 0 ? cost / conversions : null;
  const roas = cost > 0 ? revenue / cost : undefined;

  return {
    impressions,
    clicks,
    cost: roundToTwo(cost),
    ctr: roundToTwo(ctr),
    conversions,
    costPerConversion: costPerConversion !== null ? roundToTwo(costPerConversion) : null,
    revenue: roundToTwo(revenue),
    roas: roas !== undefined ? roundToTwo(roas) : undefined,
    period: { startDate, endDate },
    lastUpdatedAt: lastMetricDate,
    dataUnavailable: isStale,
    unavailableNotice: isStale
      ? `Data last retrieved at ${lastMetricDate ?? 'never'}. Connection to ad platform APIs is currently unavailable.`
      : undefined,
  };
}

/**
 * Gets metrics broken down per campaign.
 */
export async function getMetricsByCampaign(
  tenantId: string,
  period: TimePeriod
): Promise<CampaignMetrics[]> {
  const { startDate, endDate } = resolvePeriodDates(period);
  const rows = await getMetricsPerCampaign(tenantId, startDate, endDate);
  return rows.map(mapCampaignMetricRow);
}

// ─── ROAS Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates Return on Ad Spend.
 *
 * ROAS = total booking revenue / total ad spend
 * Returns undefined when spend = 0.
 *
 * Supports breakdown by villa, channel (platform), or campaign
 * for selectable time periods (last 7d, 30d, 90d, custom).
 *
 * @param tenantId - The tenant/villa ID
 * @param period - Time period selection
 * @returns ROAS result for the specified period
 */
export async function calculateROAS(
  tenantId: string,
  period: TimePeriod
): Promise<ROASResult> {
  const { startDate, endDate } = resolvePeriodDates(period);
  const aggregate = await getAggregatedMetrics(tenantId, startDate, endDate);

  if (!aggregate) {
    return { roas: undefined, revenue: 0, spend: 0, period: { startDate, endDate } };
  }

  const revenue = parseFloat(aggregate.total_revenue);
  const spend = parseFloat(aggregate.total_cost);
  const roas = spend > 0 ? roundToTwo(revenue / spend) : undefined;

  return { roas, revenue: roundToTwo(revenue), spend: roundToTwo(spend), period: { startDate, endDate } };
}

/**
 * Calculates ROAS per channel (platform) for a tenant.
 */
export async function calculateROASByChannel(
  tenantId: string,
  period: TimePeriod
): Promise<Array<{ channel: CampaignPlatform; roas: ROASResult }>> {
  const { startDate, endDate } = resolvePeriodDates(period);
  const rows = await getMetricsPerPlatform(tenantId, startDate, endDate);

  return rows.map((row) => {
    const revenue = parseFloat(row.total_revenue);
    const spend = parseFloat(row.total_cost);
    const roas = spend > 0 ? roundToTwo(revenue / spend) : undefined;
    return {
      channel: row.platform,
      roas: { roas, revenue: roundToTwo(revenue), spend: roundToTwo(spend), period: { startDate, endDate } },
    };
  });
}

/**
 * Calculates ROAS per campaign for a tenant.
 */
export async function calculateROASByCampaign(
  tenantId: string,
  period: TimePeriod
): Promise<Array<{ campaignId: string; campaignName: string; roas: ROASResult }>> {
  const { startDate, endDate } = resolvePeriodDates(period);
  const rows = await getMetricsPerCampaign(tenantId, startDate, endDate);

  return rows.map((row) => {
    const revenue = parseFloat(row.total_revenue);
    const spend = parseFloat(row.total_cost);
    const roas = spend > 0 ? roundToTwo(revenue / spend) : undefined;
    return {
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      roas: { roas, revenue: roundToTwo(revenue), spend: roundToTwo(spend), period: { startDate, endDate } },
    };
  });
}

// ─── Budget Threshold Alerts ──────────────────────────────────────────────────

/**
 * Checks if the current month's ad spend exceeds the configured budget threshold.
 *
 * When threshold is exceeded, an in-app notification and email alert
 * are triggered within 60 minutes (Requirement 7.4).
 *
 * @param tenantId - The tenant/villa ID
 * @returns Budget threshold status, or null if no threshold configured
 */
export async function checkBudgetThreshold(
  tenantId: string
): Promise<BudgetThreshold | null> {
  const config = await getBudgetThreshold(tenantId);
  if (!config) {
    return null;
  }

  const currentSpend = await getCurrentMonthSpend(tenantId);
  const exceeded = currentSpend >= config.threshold;

  return {
    villaId: tenantId,
    threshold: config.threshold,
    currency: config.currency,
    currentSpend: roundToTwo(currentSpend),
    exceeded,
    exceededAt: exceeded ? new Date().toISOString() : null,
    alertSentAt: null, // Will be set by notification agent
  };
}

// ─── 30-Day Last-Click Attribution ────────────────────────────────────────────

/**
 * Attributes a booking to a campaign using UTM parameters.
 *
 * Applies 30-day last-click attribution: the booking is attributed
 * to the most recent campaign interaction within 30 days of
 * the booking confirmation date (Requirement 7.6).
 *
 * @param tenantId - The tenant/villa ID
 * @param bookingId - The booking being attributed
 * @param utmSource - UTM source parameter from the booking
 * @param utmMedium - UTM medium parameter
 * @param utmCampaign - UTM campaign parameter
 * @param bookingDate - Date the booking was confirmed (YYYY-MM-DD)
 * @returns Attribution result, or null if no matching campaign found within window
 */
export async function attributeBooking(
  tenantId: string,
  bookingId: string,
  utmSource: string,
  utmMedium: string,
  utmCampaign: string,
  bookingDate: string
): Promise<Attribution | null> {
  if (!utmSource || !utmMedium || !utmCampaign) {
    return null; // Cannot attribute without UTM parameters
  }

  const match = await findAttributableCampaign(
    tenantId,
    utmSource,
    utmMedium,
    utmCampaign,
    bookingDate
  );

  if (!match) {
    return null; // No matching campaign within 30-day window
  }

  const clickDate = match.clickDate;
  const daysDifference = calculateDaysBetween(clickDate, bookingDate);

  if (daysDifference > ATTRIBUTION_WINDOW_DAYS) {
    return null; // Outside 30-day attribution window
  }

  // Record the attribution
  await insertAttribution(tenantId, {
    bookingId,
    campaignId: match.campaignId,
    utmSource,
    utmMedium,
    utmCampaign,
    clickDate,
    bookingDate,
  });

  return {
    bookingId,
    campaignId: match.campaignId,
    utmSource,
    utmMedium,
    utmCampaign,
    clickDate,
    bookingDate,
    daysToConversion: daysDifference,
  };
}

// ─── Comparison Views ─────────────────────────────────────────────────────────

/**
 * Generates a comparison view of metrics across multiple villas.
 *
 * Supports up to 50 villas displayed in tabular/chart format
 * on a single screen (Requirement 7.5).
 *
 * @param villaIds - Array of tenant/villa IDs to compare (max 50)
 * @param period - Time period selection
 * @returns Array of villa comparison entries
 */
export async function getVillaComparison(
  villaIds: string[],
  period: TimePeriod
): Promise<VillaComparisonEntry[]> {
  if (villaIds.length > 50) {
    throw new MarketingError(
      'Comparison view supports a maximum of 50 villas',
      'TOO_MANY_VILLAS',
      400
    );
  }

  const { startDate, endDate } = resolvePeriodDates(period);
  const entries: VillaComparisonEntry[] = [];

  for (const villaId of villaIds) {
    const aggregate = await getAggregatedMetrics(villaId, startDate, endDate);

    if (aggregate) {
      const impressions = parseInt(aggregate.total_impressions, 10);
      const clicks = parseInt(aggregate.total_clicks, 10);
      const cost = parseFloat(aggregate.total_cost);
      const conversions = parseInt(aggregate.total_conversions, 10);
      const revenue = parseFloat(aggregate.total_revenue);
      const roas = cost > 0 ? roundToTwo(revenue / cost) : undefined;

      entries.push({
        villaId,
        villaName: villaId, // Name resolution would be done at API layer
        impressions,
        clicks,
        cost: roundToTwo(cost),
        conversions,
        roas,
      });
    } else {
      entries.push({
        villaId,
        villaName: villaId,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        roas: undefined,
      });
    }
  }

  return entries;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves a TimePeriod to concrete start/end dates.
 */
export function resolvePeriodDates(period: TimePeriod): {
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  switch (period.preset) {
    case 'last_7d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return { startDate: start.toISOString().split('T')[0], endDate };
    }
    case 'last_30d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return { startDate: start.toISOString().split('T')[0], endDate };
    }
    case 'last_90d': {
      const start = new Date(today);
      start.setDate(start.getDate() - 90);
      return { startDate: start.toISOString().split('T')[0], endDate };
    }
    case 'custom': {
      if (!period.startDate || !period.endDate) {
        throw new MarketingError(
          'Custom period requires startDate and endDate',
          'MISSING_CUSTOM_DATES',
          400
        );
      }
      return { startDate: period.startDate, endDate: period.endDate };
    }
    default:
      throw new MarketingError(
        `Invalid period preset: ${period.preset}`,
        'INVALID_PERIOD',
        400
      );
  }
}

function mapRowToCampaign(row: CampaignRow): MarketingCampaign {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform,
    status: row.status,
    budget: parseFloat(row.budget),
    currency: row.currency,
    startDate: row.start_date,
    endDate: row.end_date,
    utmSource: row.utm_source,
    utmMedium: row.utm_medium,
    utmCampaign: row.utm_campaign,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCampaignMetricRow(row: CampaignMetricRow): CampaignMetrics {
  const impressions = parseInt(row.total_impressions, 10);
  const clicks = parseInt(row.total_clicks, 10);
  const cost = parseFloat(row.total_cost);
  const conversions = parseInt(row.total_conversions, 10);
  const revenue = parseFloat(row.total_revenue);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const costPerConversion = conversions > 0 ? cost / conversions : null;
  const roas = cost > 0 ? revenue / cost : undefined;

  return {
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    platform: row.platform,
    impressions,
    clicks,
    cost: roundToTwo(cost),
    ctr: roundToTwo(ctr),
    conversions,
    costPerConversion: costPerConversion !== null ? roundToTwo(costPerConversion) : null,
    revenue: roundToTwo(revenue),
    roas: roas !== undefined ? roundToTwo(roas) : undefined,
  };
}

function buildEmptyMetrics(
  startDate: string,
  endDate: string,
  lastMetricDate: string | null,
  isStale: boolean
): AggregatedMetrics {
  return {
    impressions: 0,
    clicks: 0,
    cost: 0,
    ctr: 0,
    conversions: 0,
    costPerConversion: null,
    revenue: 0,
    roas: undefined,
    period: { startDate, endDate },
    lastUpdatedAt: lastMetricDate,
    dataUnavailable: isStale,
    unavailableNotice: isStale
      ? `Data last retrieved at ${lastMetricDate ?? 'never'}. Connection to ad platform APIs is currently unavailable.`
      : undefined,
  };
}

/**
 * Checks if the data is stale (older than 2 hours).
 * Used to trigger the unavailability notice (Requirement 7.7).
 */
function checkDataStaleness(lastMetricDate: string | null): boolean {
  if (!lastMetricDate) {
    return true; // No data at all is considered stale
  }

  const lastDate = new Date(lastMetricDate);
  const now = new Date();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  return now.getTime() - lastDate.getTime() > twoHoursMs;
}

function calculateDaysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diffMs = Math.abs(b.getTime() - a.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class MarketingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'MarketingError';
  }
}
