"use client";

import { useContext } from "react";
import { ThemeContext, ThemeContextValue } from "./ThemeProvider";

/**
 * Custom hook for consuming theme context.
 *
 * Provides:
 * - `preference`: The user's stored preference (light | dark | system)
 * - `resolvedTheme`: The currently applied theme (light | dark)
 * - `setThemePreference`: Function to update the theme preference
 *
 * Must be used within a <ThemeProvider>.
 *
 * @example
 * ```tsx
 * const { resolvedTheme, setThemePreference } = useTheme();
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
