/**
 * Villa Sites Module
 *
 * Villa website content management, theme engine, SEO,
 * publish workflow, and per-villa rendering.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

export * from './types';
export {
  getVillaSiteContent,
  updateVillaSiteContent,
  validatePublication,
  getVillaContentSections,
  getVillaTheme,
  getVillaSeoMetadata,
  VillaSiteError,
  MAX_PHOTOS_PER_VILLA,
  MAX_PHOTO_SIZE_BYTES,
  MAX_DESCRIPTION_LENGTH,
  MAX_AMENITY_ITEMS,
  MAX_SEO_TITLE_LENGTH,
  MAX_SEO_DESCRIPTION_LENGTH,
  MIN_DESCRIPTION_FOR_PUBLISH,
  MIN_PHOTOS_FOR_PUBLISH,
  ACCEPTED_MEDIA_FORMATS,
  VALID_SECTIONS,
} from './service';
export { getVillaBySlug } from './repository';
export type { VillaPublicData } from './repository';
