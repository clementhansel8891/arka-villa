'use client';

/**
 * Villa Theme Provider — client component for per-villa theming context.
 *
 * Provides the villa's custom color theme to all child components.
 * Supports custom color themes (primary, secondary, accent) and logo.
 *
 * Requirements: 8.6
 */

import { createContext, useContext } from 'react';
import type { VillaTheme } from '@/modules/villa-sites/types';

interface VillaThemeContextValue {
  theme: VillaTheme;
}

const VillaThemeContext = createContext<VillaThemeContextValue>({
  theme: {
    primaryColor: '#1A1A1A',
    secondaryColor: '#2C2C2C',
    accentColor: '#D4AF37',
    logoUrl: null,
  },
});

export function VillaThemeProvider({
  theme,
  children,
}: {
  theme: VillaTheme;
  children: React.ReactNode;
}) {
  return (
    <VillaThemeContext.Provider value={{ theme }}>
      {children}
    </VillaThemeContext.Provider>
  );
}

export function useVillaTheme() {
  return useContext(VillaThemeContext);
}
