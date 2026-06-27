/**
 * Villa Sites repository — tenant-scoped database queries.
 *
 * All queries use the tenant-scoped connection helper to ensure
 * data isolation between tenants. Operates on the villa_content,
 * villa_theme, villa_seo, and villa_publish_status tables.
 *
 * Requirements: 8.1, 8.2, 8.5, 8.6, 8.8
 */

import { tenantQuery } from '@/lib/db/tenant-query';
import type {
  VillaContentRecord,
  VillaContentRow,
  VillaContentSection,
  VillaTheme,
  VillaThemeRow,
  SeoMetadata,
  VillaSeoRow,
  VillaPublishStatusRow,
  MediaItem,
  UpdateSectionInput,
} from './types';

// ─── Row → Domain Mappers ─────────────────────────────────────────────────────

function mapContentRow(row: VillaContentRow): VillaContentRecord {
  let media: MediaItem[] = [];
  try {
    const parsed = typeof row.media === 'string' ? JSON.parse(row.media) : row.media;
    media = Array.isArray(parsed) ? parsed : [];
  } catch {
    media = [];
  }

  return {
    id: row.id,
    section: row.section,
    title: row.title,
    content: row.content,
    media,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapThemeRow(row: VillaThemeRow): VillaTheme {
  return {
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    logoUrl: row.logo_url,
  };
}

function mapSeoRow(row: VillaSeoRow): SeoMetadata {
  return {
    title: row.title,
    description: row.description,
    ogTitle: row.og_title,
    ogDescription: row.og_description,
    ogImage: row.og_image,
  };
}

// ─── Content Section Queries ──────────────────────────────────────────────────

/**
 * Get all content sections for a villa.
 */
export async function getContentSections(
  tenantId: string
): Promise<VillaContentRecord[]> {
  const result = await tenantQuery<VillaContentRow>(
    tenantId,
    `SELECT id, section, title, content, media, sort_order, is_published, created_at, updated_at
     FROM villa_content
     ORDER BY sort_order ASC`
  );
  return result.rows.map(mapContentRow);
}

/**
 * Get a single content section by type.
 */
export async function getContentSection(
  tenantId: string,
  section: VillaContentSection
): Promise<VillaContentRecord | null> {
  const result = await tenantQuery<VillaContentRow>(
    tenantId,
    `SELECT id, section, title, content, media, sort_order, is_published, created_at, updated_at
     FROM villa_content
     WHERE section = $1
     LIMIT 1`,
    [section]
  );
  return result.rows.length > 0 ? mapContentRow(result.rows[0]) : null;
}

/**
 * Upsert a content section (insert or update if exists).
 */
export async function upsertContentSection(
  tenantId: string,
  input: UpdateSectionInput
): Promise<VillaContentRecord> {
  const mediaJson = input.media ? JSON.stringify(input.media) : '[]';

  const result = await tenantQuery<VillaContentRow>(
    tenantId,
    `INSERT INTO villa_content (section, title, content, media, sort_order, is_published)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (section) DO UPDATE SET
       title = COALESCE($2, villa_content.title),
       content = COALESCE($3, villa_content.content),
       media = CASE WHEN $4::jsonb IS NOT NULL THEN $4::jsonb ELSE villa_content.media END,
       sort_order = COALESCE($5, villa_content.sort_order),
       is_published = COALESCE($6, villa_content.is_published),
       updated_at = NOW()
     RETURNING id, section, title, content, media, sort_order, is_published, created_at, updated_at`,
    [
      input.section,
      input.title ?? '',
      input.content ?? '',
      mediaJson,
      input.sortOrder ?? 0,
      input.isPublished ?? false,
    ]
  );

  return mapContentRow(result.rows[0]);
}

// ─── Theme Queries ────────────────────────────────────────────────────────────

/**
 * Get villa theme configuration.
 */
export async function getTheme(tenantId: string): Promise<VillaTheme> {
  const result = await tenantQuery<VillaThemeRow>(
    tenantId,
    `SELECT id, primary_color, secondary_color, accent_color, logo_url
     FROM villa_theme
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    // Return defaults
    return {
      primaryColor: '#2C3E50',
      secondaryColor: '#8B7355',
      accentColor: '#D4AF37',
      logoUrl: null,
    };
  }

  return mapThemeRow(result.rows[0]);
}

/**
 * Upsert villa theme configuration.
 */
export async function upsertTheme(
  tenantId: string,
  theme: Partial<VillaTheme>
): Promise<VillaTheme> {
  const current = await getTheme(tenantId);

  const primaryColor = theme.primaryColor ?? current.primaryColor;
  const secondaryColor = theme.secondaryColor ?? current.secondaryColor;
  const accentColor = theme.accentColor ?? current.accentColor;
  const logoUrl = theme.logoUrl !== undefined ? theme.logoUrl : current.logoUrl;

  const result = await tenantQuery<VillaThemeRow>(
    tenantId,
    `INSERT INTO villa_theme (id, primary_color, secondary_color, accent_color, logo_url)
     VALUES ('default', $1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       primary_color = $1,
       secondary_color = $2,
       accent_color = $3,
       logo_url = $4,
       updated_at = NOW()
     RETURNING id, primary_color, secondary_color, accent_color, logo_url`,
    [primaryColor, secondaryColor, accentColor, logoUrl]
  );

  return mapThemeRow(result.rows[0]);
}

// ─── SEO Queries ──────────────────────────────────────────────────────────────

/**
 * Get villa SEO metadata.
 */
export async function getSeoMetadata(tenantId: string): Promise<SeoMetadata> {
  const result = await tenantQuery<VillaSeoRow>(
    tenantId,
    `SELECT id, title, description, og_title, og_description, og_image
     FROM villa_seo
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    return {
      title: '',
      description: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: null,
    };
  }

  return mapSeoRow(result.rows[0]);
}

/**
 * Upsert villa SEO metadata.
 */
export async function upsertSeoMetadata(
  tenantId: string,
  seo: Partial<SeoMetadata>
): Promise<SeoMetadata> {
  const current = await getSeoMetadata(tenantId);

  const title = seo.title ?? current.title;
  const description = seo.description ?? current.description;
  const ogTitle = seo.ogTitle ?? current.ogTitle;
  const ogDescription = seo.ogDescription ?? current.ogDescription;
  const ogImage = seo.ogImage !== undefined ? seo.ogImage : current.ogImage;

  const result = await tenantQuery<VillaSeoRow>(
    tenantId,
    `INSERT INTO villa_seo (id, title, description, og_title, og_description, og_image)
     VALUES ('default', $1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       title = $1,
       description = $2,
       og_title = $3,
       og_description = $4,
       og_image = $5,
       updated_at = NOW()
     RETURNING id, title, description, og_title, og_description, og_image`,
    [title, description, ogTitle, ogDescription, ogImage]
  );

  return mapSeoRow(result.rows[0]);
}

// ─── Publish Status Queries ───────────────────────────────────────────────────

/**
 * Get villa publish status.
 */
export async function getPublishStatus(
  tenantId: string
): Promise<{ isPublished: boolean; publishedAt: string | null }> {
  const result = await tenantQuery<VillaPublishStatusRow>(
    tenantId,
    `SELECT is_published, published_at
     FROM villa_publish_status
     LIMIT 1`
  );

  if (result.rows.length === 0) {
    return { isPublished: false, publishedAt: null };
  }

  return {
    isPublished: result.rows[0].is_published,
    publishedAt: result.rows[0].published_at,
  };
}

/**
 * Set villa publish status.
 */
export async function setPublishStatus(
  tenantId: string,
  isPublished: boolean
): Promise<{ isPublished: boolean; publishedAt: string | null }> {
  const publishedAt = isPublished ? new Date().toISOString() : null;

  const result = await tenantQuery<VillaPublishStatusRow>(
    tenantId,
    `INSERT INTO villa_publish_status (id, is_published, published_at)
     VALUES ('default', $1, $2)
     ON CONFLICT (id) DO UPDATE SET
       is_published = $1,
       published_at = $2,
       updated_at = NOW()
     RETURNING is_published, published_at`,
    [isPublished, publishedAt]
  );

  return {
    isPublished: result.rows[0].is_published,
    publishedAt: result.rows[0].published_at,
  };
}

/**
 * Count total photos across all content sections.
 */
export async function countTotalPhotos(tenantId: string): Promise<number> {
  const sections = await getContentSections(tenantId);
  let count = 0;
  for (const section of sections) {
    count += section.media.length;
  }
  return count;
}

/**
 * Get the about section description length (for publish validation).
 */
export async function getDescriptionLength(tenantId: string): Promise<number> {
  const aboutSection = await getContentSection(tenantId, 'about');
  return aboutSection?.content?.length ?? 0;
}

// ─── Public Villa Lookup ──────────────────────────────────────────────────────

/**
 * Villa data as assembled for public rendering.
 */
export interface VillaPublicData {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  subdomain: string;
  sections: VillaContentRecord[];
  theme: VillaTheme;
  seo: SeoMetadata;
  isPublished: boolean;
}

/**
 * Get a published villa by its URL slug for public rendering.
 *
 * Queries the public tenants table for the slug, then loads
 * the villa's content sections, theme, and SEO metadata from
 * the tenant-scoped schema.
 *
 * Requirements: 8.1, 8.3, 8.4, 8.6
 */
export async function getVillaBySlug(slug: string): Promise<VillaPublicData | null> {
  try {
    const { pool } = await import('@/lib/db/pool');
    const result = await pool.query<{
      id: string;
      name: string;
      slug: string;
      subdomain: string;
      is_active: boolean;
    }>(
      `SELECT id, name, slug, subdomain, is_active
       FROM public.tenants
       WHERE slug = $1 AND is_active = TRUE
       LIMIT 1`,
      [slug]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const tenant = result.rows[0];
    const tenantId = tenant.id;

    // Load villa content in parallel
    const [sections, theme, seo, publishStatus] = await Promise.all([
      getContentSections(tenantId),
      getTheme(tenantId),
      getSeoMetadata(tenantId),
      getPublishStatus(tenantId),
    ]);

    // Only return published villas for public rendering
    if (!publishStatus.isPublished) {
      return null;
    }

    return {
      id: tenant.id,
      tenantId,
      name: tenant.name,
      slug: tenant.slug,
      subdomain: tenant.subdomain,
      sections,
      theme,
      seo,
      isPublished: true,
    };
  } catch {
    // If database is unavailable or tables don't exist, return null gracefully
    return null;
  }
}
