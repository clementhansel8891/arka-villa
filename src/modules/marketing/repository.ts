/**
 * Marketing repository — tenant-scoped database queries.
 *
 * All marketing data lives within the tenant's schema.
 * Tables: marketing_campaigns, marketing_metrics
 *
 * Requirements: 7.1, 7.2, 7.3, 7.5, 7.6
 */

import { tenantQuery } from '@/lib/db';
import type {
  CampaignRow,
  MetricAggregateRow,
  CampaignMetricRow,
  CampaignPlatform,
  CampaignStatus,
  AttributionRow,
} from './types';

// ─── Campaign Queries ─────────────────────────────────────────────────────────

/**
 * Inserts a new marketing campaign into the tenant's schema.
 */
export async function insertCampaign(
  tenantId: string,
  data: {
    name: string;
    platform: CampaignPlatform;
    status: CampaignStatus;
    budget: number;
    currency: string;
    startDate: string;
    endDate: string;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
  }
): Promise<CampaignRow> {
  const result = await tenantQuery<CampaignRow>(
    tenantId,
    `INSERT INTO marketing_campaigns
       (name, platform, status, budget, currency, start_date, end_date, utm_source, utm_medium, utm_campaign)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.name,
      data.platform,
      data.status,
      data.budget,
      data.currency,
      data.startDate,
      data.endDate,
      data.utmSource,
      data.utmMedium,
      data.utmCampaign,
    ]
  );
  return result.rows[0];
}

/**
 * Lists all campaigns for a tenant with optional filters.
 */
export async function listCampaigns(
  tenantId: string,
  filters?: {
    platform?: CampaignPlatform;
    status?: CampaignStatus;
    limit?: number;
    offset?: number;
  }
): Promise<{ rows: CampaignRow[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.platform) {
    conditions.push(`platform = $${paramIndex++}`);
    params.push(filters.platform);
  }
  if (filters?.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const countResult = await tenantQuery<{ count: string }>(
    tenantId,
    `SELECT COUNT(*) as count FROM marketing_campaigns ${where}`,
    params
  );

  const dataResult = await tenantQuery<CampaignRow>(
    tenantId,
    `SELECT * FROM marketing_campaigns ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Gets a single campaign by ID.
 */
export async function getCampaignById(
  tenantId: string,
  campaignId: string
): Promise<CampaignRow | null> {
  const result = await tenantQuery<CampaignRow>(
    tenantId,
    `SELECT * FROM marketing_campaigns WHERE id = $1`,
    [campaignId]
  );
  return result.rows[0] ?? null;
}

// ─── Metrics Queries ──────────────────────────────────────────────────────────

/**
 * Gets aggregated metrics across all campaigns for a date range.
 * Used for the main metrics dashboard view.
 */
export async function getAggregatedMetrics(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<MetricAggregateRow | null> {
  const result = await tenantQuery<MetricAggregateRow>(
    tenantId,
    `SELECT
       COALESCE(SUM(impressions), 0) as total_impressions,
       COALESCE(SUM(clicks), 0) as total_clicks,
       COALESCE(SUM(cost), 0) as total_cost,
       COALESCE(SUM(conversions), 0) as total_conversions,
       COALESCE(SUM(revenue), 0) as total_revenue
     FROM marketing_metrics
     WHERE date >= $1 AND date <= $2`,
    [startDate, endDate]
  );
  return result.rows[0] ?? null;
}

/**
 * Gets metrics aggregated per campaign for a date range.
 * Used for per-campaign performance breakdown.
 */
export async function getMetricsPerCampaign(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<CampaignMetricRow[]> {
  const result = await tenantQuery<CampaignMetricRow>(
    tenantId,
    `SELECT
       m.campaign_id,
       c.name as campaign_name,
       c.platform,
       COALESCE(SUM(m.impressions), 0) as total_impressions,
       COALESCE(SUM(m.clicks), 0) as total_clicks,
       COALESCE(SUM(m.cost), 0) as total_cost,
       COALESCE(SUM(m.conversions), 0) as total_conversions,
       COALESCE(SUM(m.revenue), 0) as total_revenue
     FROM marketing_metrics m
     JOIN marketing_campaigns c ON c.id = m.campaign_id
     WHERE m.date >= $1 AND m.date <= $2
     GROUP BY m.campaign_id, c.name, c.platform
     ORDER BY total_cost DESC`,
    [startDate, endDate]
  );
  return result.rows;
}

/**
 * Gets metrics aggregated per platform (meta/google/direct) for a date range.
 */
export async function getMetricsPerPlatform(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Array<MetricAggregateRow & { platform: CampaignPlatform }>> {
  const result = await tenantQuery<MetricAggregateRow & { platform: CampaignPlatform }>(
    tenantId,
    `SELECT
       c.platform,
       COALESCE(SUM(m.impressions), 0) as total_impressions,
       COALESCE(SUM(m.clicks), 0) as total_clicks,
       COALESCE(SUM(m.cost), 0) as total_cost,
       COALESCE(SUM(m.conversions), 0) as total_conversions,
       COALESCE(SUM(m.revenue), 0) as total_revenue
     FROM marketing_metrics m
     JOIN marketing_campaigns c ON c.id = m.campaign_id
     WHERE m.date >= $1 AND m.date <= $2
     GROUP BY c.platform
     ORDER BY total_cost DESC`,
    [startDate, endDate]
  );
  return result.rows;
}

/**
 * Gets the most recent metric date for freshness tracking.
 * Used to determine last successful data retrieval.
 */
export async function getLastMetricDate(
  tenantId: string
): Promise<string | null> {
  const result = await tenantQuery<{ last_date: string }>(
    tenantId,
    `SELECT MAX(date) as last_date FROM marketing_metrics`,
    []
  );
  return result.rows[0]?.last_date ?? null;
}

/**
 * Inserts or updates a metric record for a campaign on a specific date.
 * Used when syncing data from Meta/Google Ads APIs.
 */
export async function upsertMetric(
  tenantId: string,
  data: {
    campaignId: string;
    date: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    revenue: number;
  }
): Promise<void> {
  await tenantQuery(
    tenantId,
    `INSERT INTO marketing_metrics
       (campaign_id, date, impressions, clicks, cost, conversions, revenue)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (campaign_id, date) DO UPDATE SET
       impressions = EXCLUDED.impressions,
       clicks = EXCLUDED.clicks,
       cost = EXCLUDED.cost,
       conversions = EXCLUDED.conversions,
       revenue = EXCLUDED.revenue`,
    [
      data.campaignId,
      data.date,
      data.impressions,
      data.clicks,
      data.cost,
      data.conversions,
      data.revenue,
    ]
  );
}

// ─── Budget Threshold Queries ─────────────────────────────────────────────────

/**
 * Gets the budget threshold setting for this tenant.
 */
export async function getBudgetThreshold(
  tenantId: string
): Promise<{ threshold: number; currency: string } | null> {
  const result = await tenantQuery<{ value: string; currency: string }>(
    tenantId,
    `SELECT value, currency FROM villa_settings
     WHERE key = 'marketing_budget_threshold' LIMIT 1`,
    []
  );
  if (result.rows.length === 0) {
    return null;
  }
  return {
    threshold: parseFloat(result.rows[0].value),
    currency: result.rows[0].currency ?? 'USD',
  };
}

/**
 * Gets total ad spend for the current month for threshold checks.
 */
export async function getCurrentMonthSpend(
  tenantId: string
): Promise<number> {
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const endOfMonth = now.toISOString().split('T')[0];

  const result = await tenantQuery<{ total_spend: string }>(
    tenantId,
    `SELECT COALESCE(SUM(cost), 0) as total_spend
     FROM marketing_metrics
     WHERE date >= $1 AND date <= $2`,
    [startOfMonth, endOfMonth]
  );
  return parseFloat(result.rows[0].total_spend);
}

// ─── Attribution Queries ──────────────────────────────────────────────────────

/**
 * Records a booking attribution to a campaign using UTM parameters.
 * 30-day last-click attribution window.
 */
export async function insertAttribution(
  tenantId: string,
  data: {
    bookingId: string;
    campaignId: string;
    utmSource: string;
    utmMedium: string;
    utmCampaign: string;
    clickDate: string;
    bookingDate: string;
  }
): Promise<void> {
  await tenantQuery(
    tenantId,
    `INSERT INTO marketing_attributions
       (booking_id, campaign_id, utm_source, utm_medium, utm_campaign, click_date, booking_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (booking_id) DO UPDATE SET
       campaign_id = EXCLUDED.campaign_id,
       utm_source = EXCLUDED.utm_source,
       utm_medium = EXCLUDED.utm_medium,
       utm_campaign = EXCLUDED.utm_campaign,
       click_date = EXCLUDED.click_date`,
    [
      data.bookingId,
      data.campaignId,
      data.utmSource,
      data.utmMedium,
      data.utmCampaign,
      data.clickDate,
      data.bookingDate,
    ]
  );
}

/**
 * Finds the most recent campaign click within 30 days of a booking
 * for last-click attribution.
 */
export async function findAttributableCampaign(
  tenantId: string,
  utmSource: string,
  utmMedium: string,
  utmCampaign: string,
  bookingDate: string
): Promise<{ campaignId: string; clickDate: string } | null> {
  const result = await tenantQuery<{ id: string; last_click: string }>(
    tenantId,
    `SELECT c.id, $4::date as last_click
     FROM marketing_campaigns c
     WHERE c.utm_source = $1
       AND c.utm_medium = $2
       AND c.utm_campaign = $3
       AND c.start_date <= $4::date
       AND c.end_date >= ($4::date - INTERVAL '30 days')
     ORDER BY c.start_date DESC
     LIMIT 1`,
    [utmSource, utmMedium, utmCampaign, bookingDate]
  );

  if (result.rows.length === 0) {
    return null;
  }
  return {
    campaignId: result.rows[0].id,
    clickDate: result.rows[0].last_click,
  };
}

/**
 * Gets attribution records for a date range.
 */
export async function getAttributions(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<AttributionRow[]> {
  const result = await tenantQuery<AttributionRow>(
    tenantId,
    `SELECT * FROM marketing_attributions
     WHERE booking_date >= $1 AND booking_date <= $2
     ORDER BY booking_date DESC`,
    [startDate, endDate]
  );
  return result.rows;
}
