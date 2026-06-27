"use client";

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  ThemePreference,
  ResolvedTheme,
  themes,
} from "./theme-config";

export interface ThemeContextValue {
  /** The user's preference: light, dark, or system */
  preference: ThemePreference;
  /** The currently resolved (applied) theme */
  resolvedTheme: ResolvedTheme;
  /** Update the theme preference */
  setThemePreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "arka-theme-preference";

/**
 * Resolves a theme preference to an actual theme.
 * For "system", uses the OS prefers-color-scheme media query.
 */
function resolveTheme(preference: ThemePreference, systemPreference: ResolvedTheme): ResolvedTheme {
  if (preference === "system") {
    return systemPreference;
  }
  return preference;
}

/**
 * Detects the OS color scheme preference.
 */
function getSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * Applies theme CSS custom properties to the <html> element.
 */
function applyThemeToDOM(resolved: ResolvedTheme) {
  const root = document.documentElement;
  const tokens = themes[resolved];

  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(`--theme-${key}`, value);
  }

  // Set data attribute for potential CSS selectors
  root.setAttribute("data-theme", resolved);

  // Set color-scheme for native elements (scrollbars, inputs, etc.)
  root.style.setProperty("color-scheme", resolved);
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Initial preference (e.g., from server-side user data) */
  initialPreference?: ThemePreference;
}

export function ThemeProvider({ children, initialPreference }: ThemeProviderProps) {
  const [preference, setPreference] = useState<ThemePreference>(
    initialPreference ?? "dark"
  );
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>("dark");
  const [mounted, setMounted] = useState(false);

  const resolvedTheme = resolveTheme(preference, systemPreference);

  // Load preference from localStorage on mount (if no initialPreference provided)
  useEffect(() => {
    const systemPref = getSystemPreference();
    setSystemPreference(systemPref);

    if (!initialPreference) {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      if (stored && (stored === "light" || stored === "dark" || stored === "system")) {
        setPreference(stored);
      }
    }

    setMounted(true);
  }, [initialPreference]);

  // Listen for OS color scheme changes (for "system" mode)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");

    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? "light" : "dark");
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Apply theme whenever resolved theme changes
  useEffect(() => {
    if (mounted) {
      applyThemeToDOM(resolvedTheme);
    }
  }, [resolvedTheme, mounted]);

  // Set theme preference and persist
  const setThemePreference = useCallback(
    (newPreference: ThemePreference) => {
      setPreference(newPreference);
      localStorage.setItem(STORAGE_KEY, newPreference);

      // Persist to API (fire and forget)
      fetch("/api/v1/user/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme_preference: newPreference }),
      }).catch(() => {
        // Silently fail — localStorage is the primary store for the UI
      });
    },
    []
  );

  return (
    <ThemeContext.Provider
      value={{
        preference,
        resolvedTheme,
        setThemePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
