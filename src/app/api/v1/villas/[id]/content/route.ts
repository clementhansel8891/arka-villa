/**
 * GET  /api/v1/villas/:id/content — Retrieve villa website content.
 * PATCH /api/v1/villas/:id/content — Update villa website content (Agency_Admin only).
 *
 * Content includes sections (hero, about, amenities, gallery, location, policies, seo),
 * theme configuration, SEO metadata, and publication status.
 *
 * Requirements: 8.1, 8.2, 8.5, 8.6, 8.8
 */

import { NextRequest } from 'next/server';
import {
  getVillaSiteContent,
  updateVillaSiteContent,
  VillaSiteError,
} from '@/modules/villa-sites';
import type { UpdateVillaContentRequest } from '@/modules/villa-sites';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: RouteParams) {
  try {
    const { id } = await ctx.params;

    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const content = await getVillaSiteContent(tenantId, id);

    return Response.json({ content });
  } catch (error) {
    if (error instanceof VillaSiteError) {
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

export async function PATCH(request: NextRequest, ctx: RouteParams) {
  try {
    const { id } = await ctx.params;

    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const actorRole = request.headers.get('x-user-role') ?? '';

    const body = (await request.json()) as UpdateVillaContentRequest;

    // Validate that at least one field is being updated
    const hasUpdate =
      (body.sections && body.sections.length > 0) ||
      body.theme !== undefined ||
      body.seo !== undefined ||
      body.publish !== undefined;

    if (!hasUpdate) {
      return Response.json(
        { error: 'At least one field must be provided (sections, theme, seo, or publish)' },
        { status: 400 }
      );
    }

    const content = await updateVillaSiteContent(tenantId, id, body, actorRole);

    return Response.json({ content });
  } catch (error) {
    if (error instanceof VillaSiteError) {
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
