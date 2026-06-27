import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { darkTheme, lightTheme, type ThemeTokens } from '../theme-config';

/**
 * WCAG AA Contrast Ratio Property Tests
 *
 * **Validates: Requirements 22.7**
 *
 * Verifies that all text/background color combinations in both light and dark
 * themes meet the WCAG 2.1 Level AA minimum contrast ratio of 4.5:1.
 */

// --- Helpers ---

/**
 * Convert a single sRGB channel value (0-255) to linear RGB.
 * Applies the sRGB transfer function inverse.
 */
function sRGBToLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * Calculate the relative luminance of an RGB color per WCAG 2.1.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const R = sRGBToLinear(r);
  const G = sRGBToLinear(g);
  const B = sRGBToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate WCAG contrast ratio between two colors.
 * Contrast ratio = (L1 + 0.05) / (L2 + 0.05) where L1 >= L2.
 */
function contrastRatio(
  fg: [number, number, number],
  bg: [number, number, number],
): number {
  const lum1 = relativeLuminance(...fg);
  const lum2 = relativeLuminance(...bg);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse a hex color string (#RRGGBB) into an [R, G, B] tuple.
 * Returns null if the value is not a valid hex color (e.g., rgba values).
 */
function parseHex(hex: string): [number, number, number] | null {
  const match = hex.match(/^#([A-Fa-f0-9]{6})$/);
  if (!match) return null;
  const r = parseInt(match[1].substring(0, 2), 16);
  const g = parseInt(match[1].substring(2, 4), 16);
  const b = parseInt(match[1].substring(4, 6), 16);
  return [r, g, b];
}

// --- Token categorization ---

const textTokenKeys: (keyof ThemeTokens)[] = [
  'text-primary',
  'text-secondary',
  'text-muted',
];

const backgroundTokenKeys: (keyof ThemeTokens)[] = [
  'bg-primary',
  'bg-secondary',
  'bg-tertiary',
  'surface-primary',
  'surface-secondary',
  'surface-elevated',
];

/**
 * Build all (text, background) pairs from a theme, filtering out
 * non-hex values (like rgba borders).
 */
function getTextBgPairs(theme: ThemeTokens): Array<{
  textKey: string;
  bgKey: string;
  textColor: [number, number, number];
  bgColor: [number, number, number];
}> {
  const pairs: Array<{
    textKey: string;
    bgKey: string;
    textColor: [number, number, number];
    bgColor: [number, number, number];
  }> = [];

  for (const textKey of textTokenKeys) {
    const textHex = parseHex(theme[textKey]);
    if (!textHex) continue;

    for (const bgKey of backgroundTokenKeys) {
      const bgHex = parseHex(theme[bgKey]);
      if (!bgHex) continue;

      pairs.push({ textKey, bgKey, textColor: textHex, bgColor: bgHex });
    }
  }

  return pairs;
}

/**
 * Build accent-gold on background pairs from a theme.
 */
function getAccentBgPairs(theme: ThemeTokens): Array<{
  bgKey: string;
  accentColor: [number, number, number];
  bgColor: [number, number, number];
}> {
  const accentHex = parseHex(theme['accent-gold']);
  if (!accentHex) return [];

  const pairs: Array<{
    bgKey: string;
    accentColor: [number, number, number];
    bgColor: [number, number, number];
  }> = [];

  for (const bgKey of backgroundTokenKeys) {
    const bgHex = parseHex(theme[bgKey]);
    if (!bgHex) continue;

    pairs.push({ bgKey, accentColor: accentHex, bgColor: bgHex });
  }

  return pairs;
}

// --- Property Tests ---

const WCAG_AA_MIN_CONTRAST = 4.5;

describe('Theme Contrast Ratio Properties', () => {
  describe('Property 1: Dark theme text/background contrast >= 4.5:1', () => {
    const darkPairs = getTextBgPairs(darkTheme);

    it('every (text, background) pair in darkTheme meets WCAG AA 4.5:1 contrast', () => {
      // Use fast-check to pick from all possible text/bg pairs
      const pairArb = fc.constantFrom(...darkPairs);

      fc.assert(
        fc.property(pairArb, (pair) => {
          const ratio = contrastRatio(pair.textColor, pair.bgColor);
          expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
        }),
        { numRuns: 200 },
      );
    });
  });

  describe('Property 2: Light theme text/background contrast >= 4.5:1', () => {
    const lightPairs = getTextBgPairs(lightTheme);

    it('every (text, background) pair in lightTheme meets WCAG AA 4.5:1 contrast', () => {
      const pairArb = fc.constantFrom(...lightPairs);

      fc.assert(
        fc.property(pairArb, (pair) => {
          const ratio = contrastRatio(pair.textColor, pair.bgColor);
          expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
        }),
        { numRuns: 200 },
      );
    });
  });

  describe('Property 3: Accent-gold on each background meets 4.5:1 in both themes', () => {
    const darkAccentPairs = getAccentBgPairs(darkTheme);
    const lightAccentPairs = getAccentBgPairs(lightTheme);

    it('accent-gold on every background in darkTheme meets WCAG AA 4.5:1 contrast', () => {
      const pairArb = fc.constantFrom(...darkAccentPairs);

      fc.assert(
        fc.property(pairArb, (pair) => {
          const ratio = contrastRatio(pair.accentColor, pair.bgColor);
          expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
        }),
        { numRuns: 100 },
      );
    });

    it('accent-gold on every background in lightTheme meets WCAG AA 4.5:1 contrast', () => {
      const pairArb = fc.constantFrom(...lightAccentPairs);

      fc.assert(
        fc.property(pairArb, (pair) => {
          const ratio = contrastRatio(pair.accentColor, pair.bgColor);
          expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
        }),
        { numRuns: 100 },
      );
    });
  });
});
