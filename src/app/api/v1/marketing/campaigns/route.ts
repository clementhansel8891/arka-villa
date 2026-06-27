/**
 * POST /api/v1/marketing/campaigns — Create a new marketing campaign.
 * GET  /api/v1/marketing/campaigns — List marketing campaigns.
 *
 * POST creates a campaign and sets up tracking with UTM parameters.
 * GET lists campaigns with optional platform/status filtering.
 *
 * POST body:
 *   - name: string (required)
 *   - platform: 'meta' | 'google' | 'direct' (required)
 *   - status: 'active' | 'paused' | 'completed' | 'draft' (optional, default: 'draft')
 *   - budget: number (required, non-negative)
 *   - currency: string (optional, default: 'USD')
 *   - startDate: YYYY-MM-DD (required)
 *   - endDate: YYYY-MM-DD (required)
 *   - utmSource: string (optional)
 *   - utmMedium: string (optional)
 *   - utmCampaign: string (optional)
 *
 * GET query parameters:
 *   - platform: 'meta' | 'google' | 'direct' (optional)
 *   - status: 'active' | 'paused' | 'completed' | 'draft' (optional)
 *   - limit: number (optional, default: 50)
 *   - offset: number (optional, default: 0)
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 7.2, 7.6
 */

import { type NextRequest } from 'next/server';
import {
  createCampaign,
  getCampaigns,
  MarketingError,
} from '@/modules/marketing';
import type { CampaignPlatform, CampaignStatus } from '@/modules/marketing';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const campaign = await createCampaign(tenantId, {
      name: body.name,
      platform: body.platform,
      status: body.status,
      budget: body.budget,
      currency: body.currency,
      startDate: body.startDate,
      endDate: body.endDate,
      utmSource: body.utmSource,
      utmMedium: body.utmMedium,
      utmCampaign: body.utmCampaign,
    });

    return Response.json({ campaign }, { status: 201 });
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
    const platform = searchParams.get('platform') as CampaignPlatform | null;
    const status = searchParams.get('status') as CampaignStatus | null;
    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : undefined;
    const offset = searchParams.get('offset')
      ? parseInt(searchParams.get('offset')!, 10)
      : undefined;

    const result = await getCampaigns(tenantId, {
      platform: platform ?? undefined,
      status: status ?? undefined,
      limit,
      offset,
    });

    return Response.json({
      campaigns: result.campaigns,
      total: result.total,
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
