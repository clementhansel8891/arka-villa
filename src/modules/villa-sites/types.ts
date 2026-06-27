/**
 * Villa Sites module types.
 *
 * Covers villa website content management, sections, themes,
 * SEO metadata, media management, and publish workflow.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

// ─── Content Sections ─────────────────────────────────────────────────────────

export type VillaContentSection =
  | 'hero'
  | 'about'
  | 'amenities'
  | 'gallery'
  | 'location'
  | 'policies'
  | 'seo';

// ─── Media ────────────────────────────────────────────────────────────────────

export type MediaFormat = 'jpeg' | 'png' | 'webp';

export interface MediaItem {
  id: string;
  url: string;
  alt: string;
  format: MediaFormat;
  sizeBytes: number;
  width?: number;
  height?: number;
  sortOrder: number;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export interface VillaTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
}

// ─── SEO Metadata ─────────────────────────────────────────────────────────────

export interface SeoMetadata {
  title: string; // max 60 chars
  description: string; // max 160 chars
  ogTitle: string;
  ogDescription: string;
  ogImage: string | null;
}

// ─── Content Section Record ───────────────────────────────────────────────────

export interface VillaContentRecord {
  id: string;
  section: VillaContentSection;
  title: string;
  content: string;
  media: MediaItem[];
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Aggregated Villa Site Content ────────────────────────────────────────────

export interface VillaSiteContent {
  villaId: string;
  tenantId: string;
  sections: VillaContentRecord[];
  theme: VillaTheme;
  seo: SeoMetadata;
  isPublished: boolean;
  publishedAt: string | null;
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

export interface UpdateVillaContentRequest {
  sections?: UpdateSectionInput[];
  theme?: Partial<VillaTheme>;
  seo?: Partial<SeoMetadata>;
  publish?: boolean;
}

export interface UpdateSectionInput {
  section: VillaContentSection;
  title?: string;
  content?: string;
  media?: MediaItem[];
  sortOrder?: number;
  isPublished?: boolean;
}

// ─── Publication Validation ───────────────────────────────────────────────────

export interface PublicationValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface VillaContentRow {
  id: string;
  section: VillaContentSection;
  title: string;
  content: string;
  media: string; // JSONB stored as string
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface VillaThemeRow {
  id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string | null;
}

export interface VillaSeoRow {
  id: string;
  title: string;
  description: string;
  og_title: string;
  og_description: string;
  og_image: string | null;
}

export interface VillaPublishStatusRow {
  is_published: boolean;
  published_at: string | null;
}
