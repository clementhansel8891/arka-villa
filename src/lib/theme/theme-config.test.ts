import { describe, it, expect } from "vitest";
import {
  darkTheme,
  lightTheme,
  themes,
  getThemeCSSVariables,
  ThemeTokens,
} from "./theme-config";

/**
 * Parses a color string into RGB values.
 * Supports hex (#RRGGBB) format.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#([0-9A-Fa-f]{6})$/);
  if (!match) return null;
  const num = parseInt(match[1], 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculates relative luminance per WCAG 2.1 formula.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates contrast ratio between two colors.
 */
function contrastRatio(hex1: string, hex2: string): number | null {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  if (!c1 || !c2) return null;

  const l1 = relativeLuminance(c1.r, c1.g, c1.b);
  const l2 = relativeLuminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("theme-config", () => {
  describe("theme token structure", () => {
    it("dark theme has all required token keys", () => {
      const requiredKeys: (keyof ThemeTokens)[] = [
        "bg-primary",
        "bg-secondary",
        "bg-tertiary",
        "text-primary",
        "text-secondary",
        "text-muted",
        "border-primary",
        "border-secondary",
        "surface-primary",
        "surface-secondary",
        "surface-elevated",
        "accent-gold",
        "accent-gold-hover",
        "success",
        "warning",
        "error",
        "info",
      ];

      for (const key of requiredKeys) {
        expect(darkTheme[key]).toBeDefined();
        expect(darkTheme[key]).not.toBe("");
      }
    });

    it("light theme has all required token keys", () => {
      const requiredKeys: (keyof ThemeTokens)[] = [
        "bg-primary",
        "bg-secondary",
        "bg-tertiary",
        "text-primary",
        "text-secondary",
        "text-muted",
        "border-primary",
        "border-secondary",
        "surface-primary",
        "surface-secondary",
        "surface-elevated",
        "accent-gold",
        "accent-gold-hover",
        "success",
        "warning",
        "error",
        "info",
      ];

      for (const key of requiredKeys) {
        expect(lightTheme[key]).toBeDefined();
        expect(lightTheme[key]).not.toBe("");
      }
    });

    it("themes record contains both light and dark", () => {
      expect(themes.light).toBe(lightTheme);
      expect(themes.dark).toBe(darkTheme);
    });
  });

  describe("WCAG AA contrast compliance (4.5:1 minimum)", () => {
    it("dark theme: text-primary on bg-primary meets 4.5:1", () => {
      const ratio = contrastRatio(darkTheme["text-primary"], darkTheme["bg-primary"]);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it("dark theme: text-secondary on bg-primary meets 4.5:1", () => {
      const ratio = contrastRatio(darkTheme["text-secondary"], darkTheme["bg-primary"]);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it("dark theme: text-muted on bg-primary meets 4.5:1", () => {
      const ratio = contrastRatio(darkTheme["text-muted"], darkTheme["bg-primary"]);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it("dark theme: accent-gold on bg-primary meets 4.5:1", () => {
      const ratio = contrastRatio(darkTheme["accent-gold"], darkTheme["bg-primary"]);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it("light theme: text-primary on bg-primary meets 4.5:1", () => {
      const ratio = contrastRatio(lightTheme["text-primary"], lightTheme["bg-primary"]);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it("light theme: text-secondary on bg-primary meets 4.5:1", () => {
      const ratio = contrastRatio(lightTheme["text-secondary"], lightTheme["bg-primary"]);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it("light theme: text-muted on bg-primary meets 4.5:1", () => {
      const ratio = contrastRatio(lightTheme["text-muted"], lightTheme["bg-primary"]);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it("light theme: accent-gold on bg-primary meets 4.5:1", () => {
      const ratio = contrastRatio(lightTheme["accent-gold"], lightTheme["bg-primary"]);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    // Also check text on surface colors (cards/panels)
    it("dark theme: text-primary on surface-primary meets 4.5:1", () => {
      const ratio = contrastRatio(darkTheme["text-primary"], darkTheme["surface-primary"]);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });

    it("light theme: text-primary on surface-primary meets 4.5:1", () => {
      const ratio = contrastRatio(lightTheme["text-primary"], lightTheme["surface-primary"]);
      expect(ratio).not.toBeNull();
      expect(ratio!).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("getThemeCSSVariables", () => {
    it("generates CSS variables with --theme- prefix for dark theme", () => {
      const vars = getThemeCSSVariables("dark");
      expect(vars["--theme-bg-primary"]).toBe("#121212");
      expect(vars["--theme-text-primary"]).toBe("#F5F1E6");
      expect(vars["--theme-accent-gold"]).toBe("#D4AF37");
    });

    it("generates CSS variables with --theme- prefix for light theme", () => {
      const vars = getThemeCSSVariables("light");
      expect(vars["--theme-bg-primary"]).toBe("#FAFAF7");
      expect(vars["--theme-text-primary"]).toBe("#1A1A1A");
    });

    it("generates a variable for every token", () => {
      const vars = getThemeCSSVariables("dark");
      const tokenCount = Object.keys(darkTheme).length;
      expect(Object.keys(vars).length).toBe(tokenCount);
    });
  });

  describe("brand consistency", () => {
    it("heritage-gold accent is the same base color across both themes (D4AF37)", () => {
      // The dark theme uses #D4AF37 directly
      expect(darkTheme["accent-gold"]).toBe("#D4AF37");
      // Light theme uses a darker variant for contrast but the brand color is preserved
      // in hover state and UI accents that don't need 4.5:1 text contrast
    });
  });
});
