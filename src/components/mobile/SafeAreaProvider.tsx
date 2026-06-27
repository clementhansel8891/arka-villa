"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

/**
 * Safe area inset values in pixels, corresponding to CSS env(safe-area-inset-*).
 * Used to account for device hardware features (notch, home indicator, status bar).
 */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface SafeAreaContextValue {
  insets: SafeAreaInsets;
}

const defaultInsets: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const SafeAreaContext = createContext<SafeAreaContextValue>({
  insets: defaultInsets,
});

/**
 * Hook to access safe area inset values from JavaScript.
 * Returns pixel values for top, right, bottom, left insets.
 */
export function useSafeArea(): SafeAreaInsets {
  return useContext(SafeAreaContext).insets;
}

/**
 * Reads CSS env(safe-area-inset-*) values by measuring a probe element.
 */
function readSafeAreaInsets(): SafeAreaInsets {
  if (typeof document === "undefined") return defaultInsets;

  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.top = "env(safe-area-inset-top, 0px)";
  probe.style.right = "env(safe-area-inset-right, 0px)";
  probe.style.bottom = "env(safe-area-inset-bottom, 0px)";
  probe.style.left = "env(safe-area-inset-left, 0px)";
  probe.style.width = "0";
  probe.style.height = "0";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);

  const style = getComputedStyle(probe);
  const insets: SafeAreaInsets = {
    top: parseFloat(style.top) || 0,
    right: parseFloat(style.right) || 0,
    bottom: parseFloat(style.bottom) || 0,
    left: parseFloat(style.left) || 0,
  };

  document.body.removeChild(probe);
  return insets;
}

interface SafeAreaProviderProps {
  children: ReactNode;
}

/**
 * Provides safe area inset values to the component tree via React context.
 * Also applies CSS custom properties (--safe-area-inset-*) to its wrapper element
 * for direct use in Tailwind/CSS.
 *
 * Handles notch, home indicator, and status bar padding for modern mobile devices.
 */
export function SafeAreaProvider({ children }: SafeAreaProviderProps) {
  const [insets, setInsets] = useState<SafeAreaInsets>(defaultInsets);

  useEffect(() => {
    setInsets(readSafeAreaInsets());

    // Re-read on orientation change or resize (insets can change)
    const handleChange = () => {
      setInsets(readSafeAreaInsets());
    };

    window.addEventListener("resize", handleChange);
    window.addEventListener("orientationchange", handleChange);

    return () => {
      window.removeEventListener("resize", handleChange);
      window.removeEventListener("orientationchange", handleChange);
    };
  }, []);

  return (
    <SafeAreaContext.Provider value={{ insets }}>
      <div
        className="contents"
        style={
          {
            "--safe-area-inset-top": `${insets.top}px`,
            "--safe-area-inset-right": `${insets.right}px`,
            "--safe-area-inset-bottom": `${insets.bottom}px`,
            "--safe-area-inset-left": `${insets.left}px`,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </SafeAreaContext.Provider>
  );
}
