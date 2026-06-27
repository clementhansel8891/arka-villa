/**
 * Villa Sites service — business logic for villa website content management.
 *
 * Handles content CRUD, theme management, SEO metadata,
 * publish workflow with validation, and media constraints.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

import {
  getContentSections,
  upsertContentSection,
  getTheme,
  upsertTheme,
  getSeoMetadata,
  upsertSeoMetadata,
  getPublishStatus,
  setPublishStatus,
  countTotalPhotos,
  getDescriptionLength,
} from './repository';
import type {
  VillaSiteContent,
  VillaContentRecord,
  VillaTheme,
  SeoMetadata,
  UpdateVillaContentRequest,
  UpdateSectionInput,
  PublicationValidationResult,
  MediaItem,
  VillaContentSection,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of photos per villa (Requirement 8.2) */
export const MAX_PHOTOS_PER_VILLA = 50;

/** Maximum file size per photo in bytes (10 MB) */
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum description length (Requirement 8.2) */
export const MAX_DESCRIPTION_LENGTH = 5000;

/** Maximum amenity items (Requirement 8.2) */
export const MAX_AMENITY_ITEMS = 100;

/** Maximum SEO title length (Requirement 8.5) */
export const MAX_SEO_TITLE_LENGTH = 60;

/** Maximum SEO description length (Requirement 8.5) */
export const MAX_SEO_DESCRIPTION_LENGTH = 160;

/** Minimum description length for publication (Requirement 8.8) */
export const MIN_DESCRIPTION_FOR_PUBLISH = 100;

/** Minimum photos for publication (Requirement 8.8) */
export const MIN_PHOTOS_FOR_PUBLISH = 1;

/** Accepted media formats (Requirement 8.2) */
export const ACCEPTED_MEDIA_FORMATS = ['jpeg', 'png', 'webp'] as const;

/** Valid content section types */
export const VALID_SECTIONS: VillaContentSection[] = [
  'hero',
  'about',
  'amenities',
  'gallery',
  'location',
  'policies',
  'seo',
];

// ─── Error Classes ────────────────────────────────────────────────────────────

export class VillaSiteError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_ERROR'
      | 'NOT_FOUND'
      | 'PUBLISH_VALIDATION_FAILED'
      | 'UNAUTHORIZED'
      | 'INTERNAL_ERROR',
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'VillaSiteError';
  }
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Validate a hex color string (e.g., #2C3E50).
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Validate media items within a section update.
 * Requirements: 8.2 (photos max 50, 10MB each, JPEG/PNG/WebP)
 */
function validateMedia(media: MediaItem[], existingTotalPhotos: number): string[] {
  const errors: string[] = [];

  const newTotal = existingTotalPhotos + media.length;
  if (newTotal > MAX_PHOTOS_PER_VILLA) {
    errors.push(
      `Total photos would exceed limit of ${MAX_PHOTOS_PER_VILLA} (current: ${existingTotalPhotos}, adding: ${media.length})`
    );
  }

  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    if (item.sizeBytes > MAX_PHOTO_SIZE_BYTES) {
      errors.push(
        `Media item ${i + 1} exceeds maximum size of 10MB (${Math.round(item.sizeBytes / 1024 / 1024)}MB)`
      );
    }
    if (!ACCEPTED_MEDIA_FORMATS.includes(item.format)) {
      errors.push(
        `Media item ${i + 1} has unsupported format '${item.format}'. Accepted: ${ACCEPTED_MEDIA_FORMATS.join(', ')}`
      );
    }
  }

  return errors;
}

/**
 * Validate SEO metadata field lengths.
 * Requirements: 8.5
 */
function validateSeo(seo: Partial<SeoMetadata>): string[] {
  const errors: string[] = [];

  if (seo.title !== undefined && seo.title.length > MAX_SEO_TITLE_LENGTH) {
    errors.push(
      `SEO title exceeds maximum of ${MAX_SEO_TITLE_LENGTH} characters (got ${seo.title.length})`
    );
  }

  if (seo.description !== undefined && seo.description.length > MAX_SEO_DESCRIPTION_LENGTH) {
    errors.push(
      `SEO description exceeds maximum of ${MAX_SEO_DESCRIPTION_LENGTH} characters (got ${seo.description.length})`
    );
  }

  return errors;
}

/**
 * Validate theme color values.
 * Requirements: 8.6
 */
function validateTheme(theme: Partial<VillaTheme>): string[] {
  const errors: string[] = [];

  if (theme.primaryColor !== undefined && !isValidHexColor(theme.primaryColor)) {
    errors.push(`primaryColor must be a valid hex color (e.g., #2C3E50)`);
  }
  if (theme.secondaryColor !== undefined && !isValidHexColor(theme.secondaryColor)) {
    errors.push(`secondaryColor must be a valid hex color (e.g., #8B7355)`);
  }
  if (theme.accentColor !== undefined && !isValidHexColor(theme.accentColor)) {
    errors.push(`accentColor must be a valid hex color (e.g., #D4AF37)`);
  }

  return errors;
}

/**
 * Validate content section input.
 * Requirements: 8.2
 */
function validateSectionInput(input: UpdateSectionInput): string[] {
  const errors: string[] = [];

  if (!VALID_SECTIONS.includes(input.section)) {
    errors.push(
      `Invalid section '${input.section}'. Valid sections: ${VALID_SECTIONS.join(', ')}`
    );
  }

  if (input.content !== undefined && input.content.length > MAX_DESCRIPTION_LENGTH) {
    errors.push(
      `Content exceeds maximum of ${MAX_DESCRIPTION_LENGTH} characters (got ${input.content.length})`
    );
  }

  return errors;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Get the full villa site content including all sections, theme, SEO, and publish status.
 *
 * Requirements: 8.1, 8.2, 8.5, 8.6
 */
export async function getVillaSiteContent(
  tenantId: string,
  villaId: string
): Promise<VillaSiteContent> {
  const [sections, theme, seo, publishStatus] = await Promise.all([
    getContentSections(tenantId),
    getTheme(tenantId),
    getSeoMetadata(tenantId),
    getPublishStatus(tenantId),
  ]);

  return {
    villaId,
    tenantId,
    sections,
    theme,
    seo,
    isPublished: publishStatus.isPublished,
    publishedAt: publishStatus.publishedAt,
  };
}

/**
 * Update villa site content (sections, theme, SEO, or publish).
 * Only Agency_Admin can perform updates.
 *
 * Requirements: 8.2, 8.5, 8.6, 8.8
 */
export async function updateVillaSiteContent(
  tenantId: string,
  villaId: string,
  request: UpdateVillaContentRequest,
  actorRole: string
): Promise<VillaSiteContent> {
  // Authorization: Only Agency_Admin can update content
  if (actorRole !== 'Agency_Admin') {
    throw new VillaSiteError(
      'Only Agency_Admin can update villa website content',
      'UNAUTHORIZED',
      403
    );
  }

  // Validate and apply section updates
  if (request.sections && request.sections.length > 0) {
    const existingPhotos = await countTotalPhotos(tenantId);

    for (const sectionInput of request.sections) {
      // Validate section input
      const sectionErrors = validateSectionInput(sectionInput);
      if (sectionErrors.length > 0) {
        throw new VillaSiteError(
          `Section validation failed: ${sectionErrors.join('; ')}`,
          'VALIDATION_ERROR',
          400
        );
      }

      // Validate media if provided
      if (sectionInput.media && sectionInput.media.length > 0) {
        const mediaErrors = validateMedia(sectionInput.media, existingPhotos);
        if (mediaErrors.length > 0) {
          throw new VillaSiteError(
            `Media validation failed: ${mediaErrors.join('; ')}`,
            'VALIDATION_ERROR',
            400
          );
        }
      }

      await upsertContentSection(tenantId, sectionInput);
    }
  }

  // Validate and apply theme updates
  if (request.theme) {
    const themeErrors = validateTheme(request.theme);
    if (themeErrors.length > 0) {
      throw new VillaSiteError(
        `Theme validation failed: ${themeErrors.join('; ')}`,
        'VALIDATION_ERROR',
        400
      );
    }
    await upsertTheme(tenantId, request.theme);
  }

  // Validate and apply SEO updates
  if (request.seo) {
    const seoErrors = validateSeo(request.seo);
    if (seoErrors.length > 0) {
      throw new VillaSiteError(
        `SEO validation failed: ${seoErrors.join('; ')}`,
        'VALIDATION_ERROR',
        400
      );
    }
    await upsertSeoMetadata(tenantId, request.seo);
  }

  // Handle publish workflow
  if (request.publish === true) {
    const validation = await validatePublication(tenantId);
    if (!validation.valid) {
      throw new VillaSiteError(
        `Publication requirements not met: ${validation.errors.join('; ')}`,
        'PUBLISH_VALIDATION_FAILED',
        400
      );
    }
    await setPublishStatus(tenantId, true);
  } else if (request.publish === false) {
    await setPublishStatus(tenantId, false);
  }

  // Return updated content
  return getVillaSiteContent(tenantId, villaId);
}

/**
 * Validate that a villa meets publication requirements.
 *
 * Requirements: 8.8
 * - At least 1 photo
 * - Description of at least 100 characters
 * - Configured nightly rate (checked via rate_plans table)
 */
export async function validatePublication(
  tenantId: string
): Promise<PublicationValidationResult> {
  const errors: string[] = [];

  // Check minimum photos
  const photoCount = await countTotalPhotos(tenantId);
  if (photoCount < MIN_PHOTOS_FOR_PUBLISH) {
    errors.push(
      `At least ${MIN_PHOTOS_FOR_PUBLISH} photo is required (currently ${photoCount})`
    );
  }

  // Check minimum description length
  const descriptionLength = await getDescriptionLength(tenantId);
  if (descriptionLength < MIN_DESCRIPTION_FOR_PUBLISH) {
    errors.push(
      `Description must be at least ${MIN_DESCRIPTION_FOR_PUBLISH} characters (currently ${descriptionLength})`
    );
  }

  // Check configured nightly rate (via rate_plans table)
  const hasNightlyRate = await checkNightlyRateConfigured(tenantId);
  if (!hasNightlyRate) {
    errors.push('A nightly rate must be configured before publication');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a nightly rate is configured for the villa.
 * Looks for any active rate plan in the tenant's rate_plans table.
 */
async function checkNightlyRateConfigured(tenantId: string): Promise<boolean> {
  try {
    const { tenantQuery } = await import('@/lib/db/tenant-query');
    const result = await tenantQuery<{ count: string }>(
      tenantId,
      `SELECT COUNT(*) AS count FROM rate_plans WHERE is_active = TRUE`
    );
    return parseInt(result.rows[0].count, 10) > 0;
  } catch {
    // If the table doesn't exist or query fails, treat as no rate configured
    return false;
  }
}

/**
 * Get all content sections for a villa.
 */
export async function getVillaContentSections(
  tenantId: string
): Promise<VillaContentRecord[]> {
  return getContentSections(tenantId);
}

/**
 * Get the theme for a villa.
 */
export async function getVillaTheme(tenantId: string): Promise<VillaTheme> {
  return getTheme(tenantId);
}

/**
 * Get the SEO metadata for a villa.
 */
export async function getVillaSeoMetadata(tenantId: string): Promise<SeoMetadata> {
  return getSeoMetadata(tenantId);
}
