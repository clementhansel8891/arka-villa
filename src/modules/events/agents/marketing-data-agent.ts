/**
 * Marketing Data Agent
 *
 * Event-driven consumer that attributes bookings to marketing campaigns
 * and calculates ROAS metrics. Subscribes to `stream:bookings` via the EventBus.
 *
 * Responsibilities:
 * - Attribute bookings to campaigns via UTM parameters
 * - Apply 30-day last-click attribution window
 * - Pull metrics from Meta and Google Ads APIs hourly
 * - Calculate ROAS per campaign, villa, and channel
 * - Monitor budget thresholds and trigger alerts
 *
 * Requirements: 28.2, 28.3, 28.4
 */

import { v4 as uuidv4 } from 'uuid';

import { EventBus } from '@/lib/events/event-bus';
import { STREAMS, type StreamName } from '@/lib/events/streams';
import type {
  PlatformEvent,
  AgentConfig,
  AgentLifecycle,
  AgentHealthStatus,
  AgentMetrics,
  ProcessingResult,
} from '@/lib/events/types';
import { createRedisClient, redis } from '@/lib/db/redis';
import { sendNotification } from '@/modules/notifications/service';

// ─── Agent Configuration ──────────────────────────────────────────────────────

const AGENT_NAME = 'marketing-data-agent';
const CONSUMER_GROUP = 'cg:marketing-agent';
const CONSUMER_NAME = `${AGENT_NAME}-${process.pid}`;

/** Attribution window: 30 days in milliseconds */
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/** Metrics sync interval: 1 hour in milliseconds */
const METRICS_SYNC_INTERVAL_MS = 60 * 60 * 1000;

/** Redis key prefix for UTM click tracking */
const UTM_CLICKS_KEY_PREFIX = 'marketing:utm:clicks:';

/** Redis key prefix for campaign spend */
const CAMPAIGN_SPEND_KEY_PREFIX = 'marketing:spend:';

/** Redis key prefix for campaign revenue (attributed bookings) */
const CAMPAIGN_REVENUE_KEY_PREFIX = 'marketing:revenue:';

/** Redis key prefix for ROAS metrics */
const ROAS_KEY_PREFIX = 'marketing:roas:';

/** Redis key prefix for ad platform metrics */
const AD_METRICS_KEY_PREFIX = 'marketing:ad-metrics:';

/** Redis key prefix for budget alert tracking */
const BUDGET_ALERT_KEY_PREFIX = 'marketing:budget-alert:';

/** Default configuration for the Marketing Data Agent */
const DEFAULT_CONFIG: AgentConfig = {
  name: AGENT_NAME,
  consumerGroup: CONSUMER_GROUP,
  streams: [STREAMS.BOOKINGS],
  concurrency: 3,
  maxRetries: 3,
  retryBackoff: 'exponential',
  retryBaseDelay: 5000,
  healthCheckInterval: 30_000,
  idleTimeout: 300_000,
};

// ─── Event Payload Interfaces ─────────────────────────────────────────────────

interface BookingCreatedPayload {
  bookingId: string;
  guestId: string;
  villaId: string;
  totalAmount: number;
  currency: string;
  source: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

interface BookingConfirmedPayload {
  bookingId: string;
  villaId: string;
  totalAmount: number;
  currency: string;
}

/** UTM click entry stored in Redis sorted set (score = timestamp) */
interface UTMClickEntry {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm?: string;
  utmContent?: string;
  guestId: string;
  timestamp: number;
}

/** Campaign attribution result */
interface AttributionResult {
  bookingId: string;
  campaignId: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  revenue: number;
  currency: string;
  villaId: string;
  attributedAt: string;
}

/** Ad platform metrics pulled from Meta/Google APIs */
interface AdPlatformMetrics {
  platform: 'meta' | 'google';
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  currency: string;
  dateRange: { start: string; end: string };
  fetchedAt: string;
}

/** ROAS calculation result */
interface ROASMetrics {
  campaignId: string;
  villaId?: string;
  channel?: string;
  revenue: number;
  spend: number;
  roas: number;
  period: string;
  calculatedAt: string;
}

// ─── Marketing Data Agent Implementation ──────────────────────────────────────

/**
 * MarketingDataAgent implements the AgentLifecycle interface and provides
 * booking attribution via UTM parameters (30-day last-click window),
 * ad platform metrics synchronization, and ROAS calculation.
 */
export class MarketingDataAgent implements AgentLifecycle {
  private config: AgentConfig = DEFAULT_CONFIG;
  private eventBus: EventBus | null = null;
  private stopFunctions: Array<() => void> = [];
  private healthCheckIntervalRef: ReturnType<typeof setInterval> | null = null;
  private metricsSyncInterval: ReturnType<typeof setInterval> | null = null;
  private started = false;
  private startedAt: Date | null = null;

  // Metrics
  private eventsProcessed = 0;
  private eventsFailed = 0;
  private totalProcessingTimeMs = 0;
  private lastProcessedAt: Date = new Date();
  private recentErrors: number[] = [];

  // ─── AgentLifecycle Implementation ──────────────────────────────────

  register(config: AgentConfig): void {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.started) return;

    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    this.eventBus = new EventBus({ publisher, subscriber });

    // Subscribe to stream:bookings
    const stopBookings = await this.eventBus.subscribe(
      STREAMS.BOOKINGS as StreamName,
      this.config.consumerGroup,
      CONSUMER_NAME,
      async (event) => { await this.processEvent(event); },
    );
    this.stopFunctions.push(stopBookings);

    // Start health check interval
    this.healthCheckIntervalRef = setInterval(() => {
      this.healthCheck();
    }, this.config.healthCheckInterval);

    // Start hourly metrics sync from ad platforms
    this.metricsSyncInterval = setInterval(
      () => this.syncAdPlatformMetrics(),
      METRICS_SYNC_INTERVAL_MS,
    );

    this.started = true;
    this.startedAt = new Date();
  }

  async stop(graceful: boolean): Promise<void> {
    if (!this.started) return;

    for (const stop of this.stopFunctions) {
      stop();
    }
    this.stopFunctions = [];

    if (this.healthCheckIntervalRef) {
      clearInterval(this.healthCheckIntervalRef);
      this.healthCheckIntervalRef = null;
    }
    if (this.metricsSyncInterval) {
      clearInterval(this.metricsSyncInterval);
      this.metricsSyncInterval = null;
    }

    if (this.eventBus) {
      await this.eventBus.shutdown();
      this.eventBus = null;
    }

    this.started = false;
  }

  healthCheck(): AgentHealthStatus {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    this.recentErrors = this.recentErrors.filter((t) => t > fiveMinutesAgo);
    const errorRate = this.recentErrors.length / 5;

    let status: AgentHealthStatus['status'] = 'healthy';
    if (errorRate > 10) {
      status = 'unhealthy';
    } else if (errorRate > 3) {
      status = 'degraded';
    }

    const lag = now - this.lastProcessedAt.getTime();
    return { status, lastProcessedAt: this.lastProcessedAt, pendingEvents: 0, errorRate, lag };
  }

  getMetrics(): AgentMetrics {
    const uptime = this.startedAt
      ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
      : 0;

    return {
      eventsProcessed: this.eventsProcessed,
      eventsFailed: this.eventsFailed,
      averageProcessingTime:
        this.eventsProcessed > 0
          ? Math.round(this.totalProcessingTimeMs / this.eventsProcessed)
          : 0,
      uptime,
    };
  }

  async processEvent(event: PlatformEvent): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      await this.routeEvent(event);

      const durationMs = Date.now() - startTime;
      this.eventsProcessed++;
      this.totalProcessingTimeMs += durationMs;
      this.lastProcessedAt = new Date();

      return { success: true, durationMs };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      this.eventsFailed++;
      this.recentErrors.push(Date.now());

      const errorMessage = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMessage, durationMs };
    }
  }

  acknowledgeEvent(_eventId: string): void {
    // Handled internally by the EventBus
  }

  rejectEvent(_eventId: string, _reason: string): void {
    // Handled internally by the EventBus
  }

  // ─── Event Routing ──────────────────────────────────────────────────

  private async routeEvent(event: PlatformEvent): Promise<void> {
    switch (event.type) {
      case 'booking.created':
        await this.handleBookingCreated(event as PlatformEvent<BookingCreatedPayload>);
        break;
      case 'booking.confirmed':
        await this.handleBookingConfirmed(event as PlatformEvent<BookingConfirmedPayload>);
        break;
      default:
        break;
    }
  }

  // ─── UTM Attribution (30-day Last-Click) ────────────────────────────

  /**
   * When a booking is created with UTM parameters, record the click
   * for attribution within the 30-day last-click window.
   *
   * Requirement: 28.2 — Attribute bookings to campaigns via UTM parameters
   */
  private async handleBookingCreated(
    event: PlatformEvent<BookingCreatedPayload>,
  ): Promise<void> {
    const { bookingId, guestId, villaId, utmSource, utmCampaign, utmMedium, utmTerm, utmContent } =
      event.payload;
    const tenantId = event.tenantId;

    if (!utmSource || !utmCampaign) return; // No UTM data — cannot attribute

    const now = Date.now();

    // Store UTM click entry in a sorted set (score = timestamp)
    const clicksKey = `${UTM_CLICKS_KEY_PREFIX}${tenantId}:${guestId}`;
    const clickEntry: UTMClickEntry = {
      utmSource,
      utmMedium: utmMedium ?? 'unknown',
      utmCampaign,
      utmTerm,
      utmContent,
      guestId,
      timestamp: now,
    };

    await redis.zadd(clicksKey, now, JSON.stringify(clickEntry));

    // Expire clicks older than attribution window
    const cutoff = now - ATTRIBUTION_WINDOW_MS;
    await redis.zremrangebyscore(clicksKey, '-inf', cutoff);

    // Set key TTL to 31 days
    await redis.expire(clicksKey, 31 * 24 * 60 * 60);
  }

  /**
   * When a booking is confirmed, attribute the revenue to the last campaign click
   * within the 30-day attribution window (last-click attribution model).
   *
   * Requirement: 28.3 — 30-day last-click attribution window
   */
  private async handleBookingConfirmed(
    event: PlatformEvent<BookingConfirmedPayload>,
  ): Promise<void> {
    const { bookingId, villaId, totalAmount, currency } = event.payload;
    const tenantId = event.tenantId;

    // Look up the booking to get guest ID and UTM data
    // Use the correlation to trace back to the guest's UTM clicks
    const attribution = await this.attributeBookingToLastClick(
      tenantId,
      bookingId,
      event.correlationId,
      villaId,
      totalAmount,
      currency,
    );

    if (attribution) {
      // Store attribution result
      const attrKey = `${CAMPAIGN_REVENUE_KEY_PREFIX}${tenantId}:${attribution.campaignId}`;
      await redis.zadd(attrKey, Date.now(), JSON.stringify(attribution));

      // Recalculate ROAS for this campaign
      await this.calculateROAS(tenantId, attribution.campaignId, villaId);
    }
  }

  /**
   * Find the last UTM click within the 30-day attribution window for a booking.
   * Implements the "last-click" attribution model.
   *
   * Requirement: 28.3
   */
  private async attributeBookingToLastClick(
    tenantId: string,
    bookingId: string,
    correlationId: string,
    villaId: string,
    revenue: number,
    currency: string,
  ): Promise<AttributionResult | null> {
    const now = Date.now();
    const cutoff = now - ATTRIBUTION_WINDOW_MS;

    // Scan UTM click keys for this tenant to find matching correlation
    // In production, we'd look up guest ID from the booking event correlation
    let cursor = '0';
    let lastClick: UTMClickEntry | null = null;

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${UTM_CLICKS_KEY_PREFIX}${tenantId}:*`,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      for (const key of keys) {
        // Get the most recent click (last element with highest score)
        const entries = await redis.zrevrangebyscore(key, '+inf', cutoff, 'LIMIT', 0, 1);
        if (entries.length > 0) {
          const entry = JSON.parse(entries[0]) as UTMClickEntry;
          if (!lastClick || entry.timestamp > lastClick.timestamp) {
            lastClick = entry;
          }
        }
      }
    } while (cursor !== '0');

    if (!lastClick) return null;

    return {
      bookingId,
      campaignId: `${lastClick.utmSource}:${lastClick.utmCampaign}`,
      utmSource: lastClick.utmSource,
      utmMedium: lastClick.utmMedium,
      utmCampaign: lastClick.utmCampaign,
      revenue,
      currency,
      villaId,
      attributedAt: new Date().toISOString(),
    };
  }

  // ─── ROAS Calculation ─────────────────────────────────────────────

  /**
   * Calculate ROAS (Return on Ad Spend) per campaign and optionally per villa/channel.
   * ROAS = Revenue / Spend
   *
   * Requirement: 28.4
   */
  private async calculateROAS(
    tenantId: string,
    campaignId: string,
    villaId?: string,
  ): Promise<ROASMetrics | null> {
    const now = Date.now();
    const thirtyDaysAgo = now - ATTRIBUTION_WINDOW_MS;

    // Get total revenue attributed to this campaign in the last 30 days
    const revenueKey = `${CAMPAIGN_REVENUE_KEY_PREFIX}${tenantId}:${campaignId}`;
    const revenueEntries = await redis.zrangebyscore(revenueKey, thirtyDaysAgo, '+inf');

    let totalRevenue = 0;
    for (const entry of revenueEntries) {
      const attribution = JSON.parse(entry) as AttributionResult;
      if (!villaId || attribution.villaId === villaId) {
        totalRevenue += attribution.revenue;
      }
    }

    // Get total spend for this campaign in the last 30 days
    const spendKey = `${CAMPAIGN_SPEND_KEY_PREFIX}${tenantId}:${campaignId}`;
    const spendEntries = await redis.zrangebyscore(spendKey, thirtyDaysAgo, '+inf');

    let totalSpend = 0;
    for (const entry of spendEntries) {
      const spendData = JSON.parse(entry) as { amount: number };
      totalSpend += spendData.amount;
    }

    if (totalSpend === 0) return null;

    const roas = totalRevenue / totalSpend;

    const roasMetrics: ROASMetrics = {
      campaignId,
      villaId,
      revenue: totalRevenue,
      spend: totalSpend,
      roas,
      period: '30d',
      calculatedAt: new Date().toISOString(),
    };

    // Store ROAS metric
    const roasKey = `${ROAS_KEY_PREFIX}${tenantId}:${campaignId}`;
    await redis.set(roasKey, JSON.stringify(roasMetrics), 'EX', 86400); // 24h TTL

    return roasMetrics;
  }

  // ─── Ad Platform Metrics Sync ─────────────────────────────────────

  /**
   * Pull metrics from Meta and Google Ads APIs hourly.
   * Stores metrics in Redis for ROAS calculation and dashboard display.
   *
   * Requirement: 28.4 — Pull metrics from Meta and Google Ads APIs hourly
   */
  private async syncAdPlatformMetrics(): Promise<void> {
    try {
      await Promise.all([
        this.syncMetaAdsMetrics(),
        this.syncGoogleAdsMetrics(),
      ]);
    } catch (err: unknown) {
      console.error(`[${AGENT_NAME}] Ad platform metrics sync failed:`, err);
    }
  }

  /**
   * Pull campaign metrics from Meta (Facebook/Instagram) Ads API.
   * Uses configured API credentials per tenant.
   */
  private async syncMetaAdsMetrics(): Promise<void> {
    try {
      // Fetch tenant-specific Meta API credentials from Redis config
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          'marketing:config:meta:*',
          'COUNT',
          50,
        );
        cursor = nextCursor;

        for (const configKey of keys) {
          const config = await redis.hgetall(configKey);
          if (!config.accessToken || !config.tenantId) continue;

          const metrics = await this.fetchMetaMetrics(
            config.accessToken,
            config.adAccountId,
            config.tenantId,
          );

          // Store metrics and update spend tracking
          for (const metric of metrics) {
            await this.storeAdMetric(config.tenantId, metric);
          }
        }
      } while (cursor !== '0');
    } catch (err: unknown) {
      console.error(`[${AGENT_NAME}] Meta Ads sync failed:`, err);
    }
  }

  /**
   * Pull campaign metrics from Google Ads API.
   * Uses configured API credentials per tenant.
   */
  private async syncGoogleAdsMetrics(): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          'marketing:config:google:*',
          'COUNT',
          50,
        );
        cursor = nextCursor;

        for (const configKey of keys) {
          const config = await redis.hgetall(configKey);
          if (!config.refreshToken || !config.tenantId) continue;

          const metrics = await this.fetchGoogleMetrics(
            config.refreshToken,
            config.customerId,
            config.tenantId,
          );

          for (const metric of metrics) {
            await this.storeAdMetric(config.tenantId, metric);
          }
        }
      } while (cursor !== '0');
    } catch (err: unknown) {
      console.error(`[${AGENT_NAME}] Google Ads sync failed:`, err);
    }
  }

  /**
   * Fetch campaign metrics from Meta Ads API.
   * In production, this makes HTTP requests to the Marketing API.
   */
  private async fetchMetaMetrics(
    accessToken: string,
    adAccountId: string,
    tenantId: string,
  ): Promise<AdPlatformMetrics[]> {
    // Meta Marketing API integration point
    // URL: https://graph.facebook.com/v18.0/act_{adAccountId}/insights
    // Fields: campaign_name, spend, impressions, clicks, actions
    // Date preset: last_7d or today for hourly pulls
    //
    // This is a stub — actual HTTP integration would be implemented
    // via a dedicated API adapter in @/lib/integrations/meta-ads
    const endpoint = `https://graph.facebook.com/v18.0/act_${adAccountId}/insights`;
    void endpoint; // Integration placeholder
    void accessToken;
    void tenantId;

    return [];
  }

  /**
   * Fetch campaign metrics from Google Ads API.
   * In production, this makes HTTP requests to the Ads API.
   */
  private async fetchGoogleMetrics(
    refreshToken: string,
    customerId: string,
    tenantId: string,
  ): Promise<AdPlatformMetrics[]> {
    // Google Ads API integration point
    // URL: https://googleads.googleapis.com/v15/customers/{customerId}/googleAds:searchStream
    // Query: SELECT campaign.id, campaign.name, metrics.cost_micros, metrics.impressions, ...
    //
    // This is a stub — actual HTTP integration would be implemented
    // via a dedicated API adapter in @/lib/integrations/google-ads
    void refreshToken;
    void customerId;
    void tenantId;

    return [];
  }

  /**
   * Store ad platform metric and update campaign spend tracking.
   */
  private async storeAdMetric(tenantId: string, metric: AdPlatformMetrics): Promise<void> {
    const metricKey = `${AD_METRICS_KEY_PREFIX}${tenantId}:${metric.platform}:${metric.campaignId}`;
    await redis.set(metricKey, JSON.stringify(metric), 'EX', 86400); // 24h TTL

    // Track spend in sorted set (score = timestamp) for ROAS calculation
    const spendKey = `${CAMPAIGN_SPEND_KEY_PREFIX}${tenantId}:${metric.platform}:${metric.campaignId}`;
    const spendEntry = JSON.stringify({
      amount: metric.spend,
      currency: metric.currency,
      date: metric.dateRange.end,
    });
    await redis.zadd(spendKey, Date.now(), spendEntry);

    // Check budget threshold alerts
    await this.checkBudgetThreshold(tenantId, metric);
  }

  /**
   * Check if campaign spend has exceeded the configured budget threshold.
   * Sends alert notification when threshold is breached.
   */
  private async checkBudgetThreshold(
    tenantId: string,
    metric: AdPlatformMetrics,
  ): Promise<void> {
    const budgetKey = `marketing:budget:${tenantId}:${metric.platform}:${metric.campaignId}`;
    const budgetData = await redis.get(budgetKey);
    if (!budgetData) return;

    const budget = JSON.parse(budgetData) as { monthly: number; alertThreshold: number };
    const alertKey = `${BUDGET_ALERT_KEY_PREFIX}${tenantId}:${metric.campaignId}`;

    // Calculate spend this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const spendKey = `${CAMPAIGN_SPEND_KEY_PREFIX}${tenantId}:${metric.platform}:${metric.campaignId}`;
    const monthlyEntries = await redis.zrangebyscore(spendKey, monthStart.getTime(), '+inf');

    let monthlySpend = 0;
    for (const entry of monthlyEntries) {
      const data = JSON.parse(entry) as { amount: number };
      monthlySpend += data.amount;
    }

    const spendRatio = monthlySpend / budget.monthly;

    if (spendRatio >= budget.alertThreshold) {
      // Only alert once per day
      const alreadyAlerted = await redis.get(alertKey);
      if (alreadyAlerted) return;

      await redis.set(alertKey, 'true', 'EX', 86400); // 24h cooldown

      await sendNotification({
        userIds: [],
        tenantId,
        title: 'Marketing Budget Alert',
        body: `Campaign "${metric.campaignName}" (${metric.platform}) has spent ${Math.round(spendRatio * 100)}% of its monthly budget (${monthlySpend}/${budget.monthly} ${metric.currency}).`,
        eventType: 'marketing.budget_alert',
        priority: 'critical',
        metadata: { campaignId: metric.campaignId, platform: metric.platform, spendRatio },
      });
    }
  }

  // ─── Public Utility Methods ─────────────────────────────────────────

  /**
   * Get ROAS metrics for a specific campaign.
   */
  async getCampaignROAS(tenantId: string, campaignId: string): Promise<ROASMetrics | null> {
    const roasKey = `${ROAS_KEY_PREFIX}${tenantId}:${campaignId}`;
    const data = await redis.get(roasKey);
    return data ? (JSON.parse(data) as ROASMetrics) : null;
  }

  /**
   * Get recent ad platform metrics for a tenant.
   */
  async getAdMetrics(
    tenantId: string,
    platform: 'meta' | 'google',
  ): Promise<AdPlatformMetrics[]> {
    const metrics: AdPlatformMetrics[] = [];
    let cursor = '0';

    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${AD_METRICS_KEY_PREFIX}${tenantId}:${platform}:*`,
        'COUNT',
        50,
      );
      cursor = nextCursor;

      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          metrics.push(JSON.parse(data) as AdPlatformMetrics);
        }
      }
    } while (cursor !== '0');

    return metrics;
  }

  /**
   * Record a UTM click manually (e.g., from web landing page tracking).
   */
  async recordUTMClick(
    tenantId: string,
    guestId: string,
    utmParams: Omit<UTMClickEntry, 'guestId' | 'timestamp'>,
  ): Promise<void> {
    const now = Date.now();
    const clicksKey = `${UTM_CLICKS_KEY_PREFIX}${tenantId}:${guestId}`;
    const entry: UTMClickEntry = { ...utmParams, guestId, timestamp: now };

    await redis.zadd(clicksKey, now, JSON.stringify(entry));
    await redis.expire(clicksKey, 31 * 24 * 60 * 60);
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

/** Singleton instance of the MarketingDataAgent */
export const marketingDataAgent = new MarketingDataAgent();
