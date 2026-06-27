/**
 * GET /api/v1/marketing/metrics — Aggregated marketing metrics.
 *
 * Returns impressions, clicks, cost, CTR, conversions, cost-per-conversion
 * from Meta and Google Ads, with ROAS calculation.
 *
 * Query parameters:
 *   - period: 'last_7d' | 'last_30d' | 'last_90d' | 'custom' (default: 'last_30d')
 *   - startDate: YYYY-MM-DD (required when period is 'custom')
 *   - endDate: YYYY-MM-DD (required when period is 'custom')
 *   - breakdown: 'campaign' | 'channel' (optional, adds per-item breakdown)
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * If ad platform APIs are unavailable, returns last retrieved data
 * with timestamp and unavailability notice (Requirement 7.7).
 *
 * Requirements: 7.1, 7.3, 7.7
 */

import { type NextRequest } from 'next/server';
import {
  getMetrics,
  getMetricsByCampaign,
  calculateROASByChannel,
  MarketingError,
} from '@/modules/marketing';
import type { TimePeriod, TimePeriodPreset } from '@/modules/marketing';

const VALID_PRESETS: TimePeriodPreset[] = ['last_7d', 'last_30d', 'last_90d', 'custom'];

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const periodPreset = (searchParams.get('period') ?? 'last_30d') as TimePeriodPreset;
    const startDate = searchParams.get('startDate') ?? undefined;
    const endDate = searchParams.get('endDate') ?? undefined;
    const breakdown = searchParams.get('breakdown');

    // Validate period preset
    if (!VALID_PRESETS.includes(periodPreset)) {
      return Response.json(
        { error: `Invalid period. Must be one of: ${VALID_PRESETS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate custom date range
    if (periodPreset === 'custom' && (!startDate || !endDate)) {
      return Response.json(
        { error: 'startDate and endDate are required when period is "custom"' },
        { status: 400 }
      );
    }

    const period: TimePeriod = {
      preset: periodPreset,
      startDate,
      endDate,
    };

    // Get aggregated metrics
    const metrics = await getMetrics(tenantId, period);

    // Optionally include breakdown
    let campaignBreakdown;
    let channelBreakdown;

    if (breakdown === 'campaign') {
      campaignBreakdown = await getMetricsByCampaign(tenantId, period);
    } else if (breakdown === 'channel') {
      channelBreakdown = await calculateROASByChannel(tenantId, period);
    }

    return Response.json({
      metrics,
      ...(campaignBreakdown && { campaigns: campaignBreakdown }),
      ...(channelBreakdown && { channels: channelBreakdown }),
    });
  } catch (error) {
    if (error instanceof MarketingError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
