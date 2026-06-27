/**
 * GET /api/v1/showcase/villas
 *
 * Public endpoint — no authentication required.
 * Returns all active villas for the Agency Showcase portfolio.
 * Includes: name, slug, description (max 200 chars), photo, location,
 * guest capacity, price per night, amenities, and aggregate review score.
 *
 * Automatically includes new villas within 24 hours of registration
 * (they are available immediately once active in the tenants table).
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { publicQuery } from '@/lib/db/tenant-query';

interface ShowcaseVillaRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  photo: string;
  location: string;
  guest_capacity: number;
  price_per_night: number;
  amenities: string[];
  review_score: number | null;
  review_count: number;
}

export async function GET() {
  try {
    // Query active tenants joined with their showcase data.
    // Falls back to reasonable defaults when per-tenant showcase data isn't configured yet.
    // New villas appear automatically (within 24 hours = immediately for active tenants).
    const result = await publicQuery<ShowcaseVillaRow>(
      `SELECT 
        t.id,
        t.slug,
        t.name,
        COALESCE(vs.description, '') AS description,
        COALESCE(vs.photo, '') AS photo,
        COALESCE(vs.location, 'Bali') AS location,
        COALESCE(vs.guest_capacity, 2) AS guest_capacity,
        COALESCE(vs.price_per_night, 0) AS price_per_night,
        COALESCE(vs.amenities, ARRAY[]::text[]) AS amenities,
        vs.review_score,
        COALESCE(vs.review_count, 0) AS review_count
      FROM tenants t
      LEFT JOIN villa_showcase vs ON vs.tenant_id = t.id
      WHERE t.status = 'active'
      ORDER BY t.created_at DESC`
    );

    const villas = result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description.slice(0, 200),
      photo: row.photo,
      location: row.location,
      guestCapacity: row.guest_capacity,
      pricePerNight: row.price_per_night,
      amenities: row.amenities,
      reviewScore: row.review_score,
      reviewCount: row.review_count,
    }));

    return Response.json({ villas }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[Showcase API] Failed to fetch villas:', error);
    return Response.json(
      { error: 'Failed to load villas', villas: [] },
      { status: 500 }
    );
  }
}
