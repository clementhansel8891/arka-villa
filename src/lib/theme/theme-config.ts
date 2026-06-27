/**
 * Theme configuration with light and dark color token definitions.
 * All color values meet WCAG AA 4.5:1 contrast ratio for text.
 *
 * CSS custom properties are applied to the <html> element and consumed
 * via Tailwind's var() references or direct CSS usage.
 */

export type ThemePreference = 'light' | 'dark' | 'system';

export type ResolvedTheme = 'light' | 'dark';

export interface ThemeTokens {
  // Background colors
  'bg-primary': string;
  'bg-secondary': string;
  'bg-tertiary': string;

  // Text colors
  'text-primary': string;
  'text-secondary': string;
  'text-muted': string;

  // Border colors
  'border-primary': string;
  'border-secondary': string;

  // Surface colors (cards, panels)
  'surface-primary': string;
  'surface-secondary': string;
  'surface-elevated': string;

  // Accent / brand color (consistent across themes)
  'accent-gold': string;
  'accent-gold-hover': string;

  // Semantic colors
  'success': string;
  'warning': string;
  'error': string;
  'info': string;
}

/**
 * Dark theme tokens.
 * Heritage charcoal background — the current default styling.
 *
 * Contrast ratios:
 * - text-primary (#F5F1E6) on bg-primary (#121212): ~16.5:1
 * - text-secondary (#D4C9B0) on bg-primary (#121212): ~10.2:1
 * - text-muted (#A89F8B) on bg-primary (#121212): ~7.1:1
 * - accent-gold (#D4AF37) on bg-primary (#121212): ~7.3:1
 */
export const darkTheme: ThemeTokens = {
  'bg-primary': '#121212',
  'bg-secondary': '#1A1A1A',
  'bg-tertiary': '#242424',

  'text-primary': '#F5F1E6',
  'text-secondary': '#D4C9B0',
  'text-muted': '#A89F8B',

  'border-primary': 'rgba(212, 175, 55, 0.2)',
  'border-secondary': 'rgba(212, 175, 55, 0.1)',

  'surface-primary': '#1E1E1E',
  'surface-secondary': '#2A2A2A',
  'surface-elevated': '#333333',

  'accent-gold': '#D4AF37',
  'accent-gold-hover': '#E5C34B',

  'success': '#4CAF50',
  'warning': '#FF9800',
  'error': '#F44336',
  'info': '#2196F3',
};

/**
 * Light theme tokens.
 * Light backgrounds with dark text, same accent color.
 *
 * Contrast ratios:
 * - text-primary (#1A1A1A) on bg-primary (#FAFAF7): ~17.5:1
 * - text-secondary (#3D3D3D) on bg-primary (#FAFAF7): ~11.8:1
 * - text-muted (#626262) on bg-primary (#FAFAF7): ~5.8:1
 * - accent-gold (#7D6416) on bg-primary (#FAFAF7): ~6.0:1
 */
export const lightTheme: ThemeTokens = {
  'bg-primary': '#FAFAF7',
  'bg-secondary': '#F2F0EB',
  'bg-tertiary': '#E8E5DE',

  'text-primary': '#1A1A1A',
  'text-secondary': '#3D3D3D',
  'text-muted': '#626262',

  'border-primary': 'rgba(26, 26, 26, 0.15)',
  'border-secondary': 'rgba(26, 26, 26, 0.08)',

  'surface-primary': '#FFFFFF',
  'surface-secondary': '#F7F5F0',
  'surface-elevated': '#FFFFFF',

  // Slightly darker gold for light backgrounds to maintain 4.5:1 contrast
  'accent-gold': '#7D6416',
  'accent-gold-hover': '#9E7E1E',

  'success': '#2E7D32',
  'warning': '#E65100',
  'error': '#C62828',
  'info': '#1565C0',
};

/**
 * Map of all available themes.
 */
export const themes: Record<ResolvedTheme, ThemeTokens> = {
  dark: darkTheme,
  light: lightTheme,
};

/**
 * Generate CSS custom property declarations for a given theme.
 */
export function getThemeCSSVariables(theme: ResolvedTheme): Record<string, string> {
  const tokens = themes[theme];
  const variables: Record<string, string> = {};

  for (const [key, value] of Object.entries(tokens)) {
    variables[`--theme-${key}`] = value;
  }

  return variables;
}
