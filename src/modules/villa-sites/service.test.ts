/**
 * Unit tests for the villa-sites service.
 *
 * Tests validation logic for SEO metadata, themes, content sections,
 * media constraints, and publication requirements.
 *
 * Requirements: 8.2, 8.5, 8.6, 8.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MediaItem, UpdateSectionInput, VillaContentSection } from './types';

// ─── We test the pure validation functions by importing the service
//     and mocking the repository layer ────────────────────────────────────────

vi.mock('@/lib/db/tenant-query', () => ({
  tenantQuery: vi.fn(),
}));

vi.mock('./repository', () => ({
  getContentSections: vi.fn().mockResolvedValue([]),
  upsertContentSection: vi.fn().mockResolvedValue({
    id: 'test-id',
    section: 'about',
    title: 'About',
    content: 'Test content',
    media: [],
    sortOrder: 0,
    isPublished: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  }),
  getTheme: vi.fn().mockResolvedValue({
    primaryColor: '#2C3E50',
    secondaryColor: '#8B7355',
    accentColor: '#D4AF37',
    logoUrl: null,
  }),
  upsertTheme: vi.fn().mockResolvedValue({
    primaryColor: '#2C3E50',
    secondaryColor: '#8B7355',
    accentColor: '#D4AF37',
    logoUrl: null,
  }),
  getSeoMetadata: vi.fn().mockResolvedValue({
    title: '',
    description: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: null,
  }),
  upsertSeoMetadata: vi.fn().mockResolvedValue({
    title: 'Test',
    description: 'Test description',
    ogTitle: 'Test',
    ogDescription: 'Test description',
    ogImage: null,
  }),
  getPublishStatus: vi.fn().mockResolvedValue({
    isPublished: false,
    publishedAt: null,
  }),
  setPublishStatus: vi.fn().mockResolvedValue({
    isPublished: true,
    publishedAt: '2025-01-01T00:00:00Z',
  }),
  countTotalPhotos: vi.fn().mockResolvedValue(0),
  getDescriptionLength: vi.fn().mockResolvedValue(0),
}));

import {
  getVillaSiteContent,
  updateVillaSiteContent,
  validatePublication,
  VillaSiteError,
  MAX_PHOTOS_PER_VILLA,
  MAX_PHOTO_SIZE_BYTES,
  MAX_DESCRIPTION_LENGTH,
  MAX_SEO_TITLE_LENGTH,
  MAX_SEO_DESCRIPTION_LENGTH,
  MIN_DESCRIPTION_FOR_PUBLISH,
  MIN_PHOTOS_FOR_PUBLISH,
  ACCEPTED_MEDIA_FORMATS,
  VALID_SECTIONS,
} from './service';
import * as repository from './repository';

const TENANT_ID = 'test-tenant-001';
const VILLA_ID = 'villa-001';

// ─── getVillaSiteContent ──────────────────────────────────────────────────────

describe('getVillaSiteContent', () => {
  it('returns aggregated content with all sections, theme, seo, and publish status', async () => {
    const result = await getVillaSiteContent(TENANT_ID, VILLA_ID);

    expect(result.villaId).toBe(VILLA_ID);
    expect(result.tenantId).toBe(TENANT_ID);
    expect(result.sections).toEqual([]);
    expect(result.theme).toEqual({
      primaryColor: '#2C3E50',
      secondaryColor: '#8B7355',
      accentColor: '#D4AF37',
      logoUrl: null,
    });
    expect(result.seo).toEqual({
      title: '',
      description: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: null,
    });
    expect(result.isPublished).toBe(false);
    expect(result.publishedAt).toBeNull();
  });
});

// ─── updateVillaSiteContent — Authorization ───────────────────────────────────

describe('updateVillaSiteContent — Authorization', () => {
  it('rejects non-Agency_Admin users', async () => {
    await expect(
      updateVillaSiteContent(TENANT_ID, VILLA_ID, { publish: true }, 'Villa_Owner')
    ).rejects.toThrow(VillaSiteError);

    await expect(
      updateVillaSiteContent(TENANT_ID, VILLA_ID, { publish: true }, 'Villa_Owner')
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 403 });
  });

  it('allows Agency_Admin to make updates', async () => {
    vi.mocked(repository.countTotalPhotos).mockResolvedValueOnce(5);
    vi.mocked(repository.getDescriptionLength).mockResolvedValueOnce(200);

    const result = await updateVillaSiteContent(
      TENANT_ID,
      VILLA_ID,
      { theme: { primaryColor: '#FF0000' } },
      'Agency_Admin'
    );

    expect(result.tenantId).toBe(TENANT_ID);
  });
});

// ─── updateVillaSiteContent — Theme Validation ────────────────────────────────

describe('updateVillaSiteContent — Theme Validation', () => {
  it('rejects invalid hex colors', async () => {
    await expect(
      updateVillaSiteContent(
        TENANT_ID,
        VILLA_ID,
        { theme: { primaryColor: 'not-a-color' } },
        'Agency_Admin'
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects hex colors without hash prefix', async () => {
    await expect(
      updateVillaSiteContent(
        TENANT_ID,
        VILLA_ID,
        { theme: { primaryColor: '2C3E50' } },
        'Agency_Admin'
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('accepts valid hex colors', async () => {
    const result = await updateVillaSiteContent(
      TENANT_ID,
      VILLA_ID,
      { theme: { primaryColor: '#FF5733', secondaryColor: '#AABBCC', accentColor: '#112233' } },
      'Agency_Admin'
    );

    expect(result.tenantId).toBe(TENANT_ID);
  });
});

// ─── updateVillaSiteContent — SEO Validation ──────────────────────────────────

describe('updateVillaSiteContent — SEO Validation', () => {
  it('rejects SEO title exceeding 60 characters', async () => {
    const longTitle = 'A'.repeat(61);

    await expect(
      updateVillaSiteContent(
        TENANT_ID,
        VILLA_ID,
        { seo: { title: longTitle } },
        'Agency_Admin'
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects SEO description exceeding 160 characters', async () => {
    const longDesc = 'B'.repeat(161);

    await expect(
      updateVillaSiteContent(
        TENANT_ID,
        VILLA_ID,
        { seo: { description: longDesc } },
        'Agency_Admin'
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('accepts SEO title at exactly 60 characters', async () => {
    const title = 'A'.repeat(60);

    const result = await updateVillaSiteContent(
      TENANT_ID,
      VILLA_ID,
      { seo: { title } },
      'Agency_Admin'
    );

    expect(result.tenantId).toBe(TENANT_ID);
  });

  it('accepts SEO description at exactly 160 characters', async () => {
    const description = 'B'.repeat(160);

    const result = await updateVillaSiteContent(
      TENANT_ID,
      VILLA_ID,
      { seo: { description } },
      'Agency_Admin'
    );

    expect(result.tenantId).toBe(TENANT_ID);
  });
});

// ─── updateVillaSiteContent — Section Validation ──────────────────────────────

describe('updateVillaSiteContent — Section Validation', () => {
  it('rejects invalid section types', async () => {
    await expect(
      updateVillaSiteContent(
        TENANT_ID,
        VILLA_ID,
        { sections: [{ section: 'invalid_section' as VillaContentSection, title: 'Test' }] },
        'Agency_Admin'
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects content exceeding 5000 characters', async () => {
    const longContent = 'X'.repeat(5001);

    await expect(
      updateVillaSiteContent(
        TENANT_ID,
        VILLA_ID,
        { sections: [{ section: 'about', content: longContent }] },
        'Agency_Admin'
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('accepts valid section updates', async () => {
    const result = await updateVillaSiteContent(
      TENANT_ID,
      VILLA_ID,
      { sections: [{ section: 'about', title: 'About Us', content: 'A description.' }] },
      'Agency_Admin'
    );

    expect(result.tenantId).toBe(TENANT_ID);
  });
});

// ─── updateVillaSiteContent — Media Validation ────────────────────────────────

describe('updateVillaSiteContent — Media Validation', () => {
  it('rejects when total photos would exceed 50', async () => {
    vi.mocked(repository.countTotalPhotos).mockResolvedValueOnce(49);

    const media: MediaItem[] = [
      { id: '1', url: '/img/1.jpg', alt: 'Photo 1', format: 'jpeg', sizeBytes: 1000, sortOrder: 0 },
      { id: '2', url: '/img/2.jpg', alt: 'Photo 2', format: 'jpeg', sizeBytes: 1000, sortOrder: 1 },
    ];

    await expect(
      updateVillaSiteContent(
        TENANT_ID,
        VILLA_ID,
        { sections: [{ section: 'gallery', media }] },
        'Agency_Admin'
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects photos exceeding 10 MB', async () => {
    vi.mocked(repository.countTotalPhotos).mockResolvedValueOnce(0);

    const media: MediaItem[] = [
      { id: '1', url: '/img/1.jpg', alt: 'Photo 1', format: 'jpeg', sizeBytes: 11 * 1024 * 1024, sortOrder: 0 },
    ];

    await expect(
      updateVillaSiteContent(
        TENANT_ID,
        VILLA_ID,
        { sections: [{ section: 'gallery', media }] },
        'Agency_Admin'
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects unsupported media formats', async () => {
    vi.mocked(repository.countTotalPhotos).mockResolvedValueOnce(0);

    const media: MediaItem[] = [
      { id: '1', url: '/img/1.gif', alt: 'Photo 1', format: 'gif' as any, sizeBytes: 1000, sortOrder: 0 },
    ];

    await expect(
      updateVillaSiteContent(
        TENANT_ID,
        VILLA_ID,
        { sections: [{ section: 'gallery', media }] },
        'Agency_Admin'
      )
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('accepts valid media within limits', async () => {
    vi.mocked(repository.countTotalPhotos).mockResolvedValueOnce(0);

    const media: MediaItem[] = [
      { id: '1', url: '/img/1.jpg', alt: 'Photo 1', format: 'jpeg', sizeBytes: 5 * 1024 * 1024, sortOrder: 0 },
      { id: '2', url: '/img/2.png', alt: 'Photo 2', format: 'png', sizeBytes: 3 * 1024 * 1024, sortOrder: 1 },
      { id: '3', url: '/img/3.webp', alt: 'Photo 3', format: 'webp', sizeBytes: 2 * 1024 * 1024, sortOrder: 2 },
    ];

    const result = await updateVillaSiteContent(
      TENANT_ID,
      VILLA_ID,
      { sections: [{ section: 'gallery', media }] },
      'Agency_Admin'
    );

    expect(result.tenantId).toBe(TENANT_ID);
  });
});

// ─── validatePublication ──────────────────────────────────────────────────────

describe('validatePublication', () => {
  beforeEach(() => {
    vi.mocked(repository.countTotalPhotos).mockResolvedValue(0);
    vi.mocked(repository.getDescriptionLength).mockResolvedValue(0);
  });

  it('fails when no photos are present', async () => {
    vi.mocked(repository.countTotalPhotos).mockReset();
    vi.mocked(repository.getDescriptionLength).mockReset();
    vi.mocked(repository.countTotalPhotos).mockResolvedValue(0);
    vi.mocked(repository.getDescriptionLength).mockResolvedValue(200);

    const result = await validatePublication(TENANT_ID);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('photo is required'))).toBe(true);
  });

  it('fails when description is less than 100 characters', async () => {
    vi.mocked(repository.countTotalPhotos).mockReset();
    vi.mocked(repository.getDescriptionLength).mockReset();
    vi.mocked(repository.countTotalPhotos).mockResolvedValue(5);
    vi.mocked(repository.getDescriptionLength).mockResolvedValue(50);

    const result = await validatePublication(TENANT_ID);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Description must be at least'))).toBe(true);
  });

  it('fails when no nightly rate is configured', async () => {
    vi.mocked(repository.countTotalPhotos).mockReset();
    vi.mocked(repository.getDescriptionLength).mockReset();
    vi.mocked(repository.countTotalPhotos).mockResolvedValue(5);
    vi.mocked(repository.getDescriptionLength).mockResolvedValue(200);

    const result = await validatePublication(TENANT_ID);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('nightly rate must be configured'))).toBe(true);
  });

  it('returns all errors together when multiple requirements fail', async () => {
    vi.mocked(repository.countTotalPhotos).mockReset();
    vi.mocked(repository.getDescriptionLength).mockReset();
    vi.mocked(repository.countTotalPhotos).mockResolvedValue(0);
    vi.mocked(repository.getDescriptionLength).mockResolvedValue(10);

    const result = await validatePublication(TENANT_ID);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Constants Verification ───────────────────────────────────────────────────

describe('Module constants', () => {
  it('has correct limits per requirements', () => {
    expect(MAX_PHOTOS_PER_VILLA).toBe(50);
    expect(MAX_PHOTO_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_DESCRIPTION_LENGTH).toBe(5000);
    expect(MAX_SEO_TITLE_LENGTH).toBe(60);
    expect(MAX_SEO_DESCRIPTION_LENGTH).toBe(160);
    expect(MIN_DESCRIPTION_FOR_PUBLISH).toBe(100);
    expect(MIN_PHOTOS_FOR_PUBLISH).toBe(1);
  });

  it('accepts only jpeg, png, webp formats', () => {
    expect(ACCEPTED_MEDIA_FORMATS).toEqual(['jpeg', 'png', 'webp']);
  });

  it('defines all required content sections', () => {
    expect(VALID_SECTIONS).toContain('hero');
    expect(VALID_SECTIONS).toContain('about');
    expect(VALID_SECTIONS).toContain('amenities');
    expect(VALID_SECTIONS).toContain('gallery');
    expect(VALID_SECTIONS).toContain('location');
    expect(VALID_SECTIONS).toContain('policies');
    expect(VALID_SECTIONS).toContain('seo');
  });
});
