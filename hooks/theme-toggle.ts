import * as SecureStore from "expo-secure-store";
import * as Sentry from "@sentry/react-native";
import { useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";

type ThemeTransitionCallback = (
  x: number,
  y: number,
  next: ColorSchemeName,
  applyState: () => void,
) => void;
const THEME_KEY = "user_theme";

let transitionCallback: ThemeTransitionCallback | null = null;
let cachedTheme: ColorSchemeName = "dark";
let themeListeners: Set<(theme: ColorSchemeName) => void> = new Set();

export const registerThemeTransition = (cb: ThemeTransitionCallback | null) => {
  transitionCallback = cb;
};

/** NativeWind / css-interop expects "system", not RN's "unspecified". */
export type NativeWindColorScheme = "light" | "dark" | "system";

export function mapThemeToNativeWind(
  theme: ColorSchemeName,
): NativeWindColorScheme {
  return (theme as NativeWindColorScheme) || "dark";
}

const notifyListeners = (newTheme: ColorSchemeName) => {
  cachedTheme = newTheme;
  themeListeners.forEach((listener) => listener(newTheme));
};

export function useTheme() {
  const [theme, setTheme] = useState<ColorSchemeName>(cachedTheme);
  const [isLoading, setIsLoading] = useState(cachedTheme === "unspecified");

  useEffect(() => {
    const listener = (newTheme: ColorSchemeName) => setTheme(newTheme);
    themeListeners.add(listener);

    // Load from storage if still unspecified
    if (cachedTheme === "unspecified") {
      SecureStore.getItemAsync(THEME_KEY).then((stored) => {
        const themeToApply = (stored as ColorSchemeName) || "dark";
        if (themeToApply !== "unspecified") {
          applyThemeState(themeToApply, true);
        } else {
          applyThemeState("dark", true);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }

    return () => {
      themeListeners.delete(listener);
    };
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      // If we are in "system" mode, we might want to update,
      // but since we are removing "system", we skip this.
    });
    return () => sub.remove();
  }, []);

  const applyThemeState = (option: ColorSchemeName, immediate = false) => {
    if (option !== "light" && option !== "dark") {
      option = "dark";
    }
    notifyListeners(option);
    if (immediate) {
      Appearance.setColorScheme(option);
    }
  };

  const setThemeOption = async (
    option: ColorSchemeName,
    touchX?: number,
    touchY?: number,
  ) => {
    if (option === theme) return;

    try {
      await SecureStore.setItemAsync(THEME_KEY, option);
    } catch (e) {
      Sentry.captureException(e, { tags: { action: "theme_persist" } });
    }

    const applyState = () => {
      applyThemeState(option, true);
    };

    const hasValidTouchCoords =
      typeof touchX === "number" &&
      typeof touchY === "number" &&
      Number.isFinite(touchX) &&
      Number.isFinite(touchY);

    if (transitionCallback && hasValidTouchCoords) {
      try {
        transitionCallback(touchX, touchY, option, applyState);
      } catch (e) {
        Sentry.captureException(e, { tags: { action: "theme_transition" } });
        applyState();
      }
    } else {
      applyState();
    }
  };

  // Resolved actual color scheme for components that need light/dark
  const colorScheme = theme || "dark";

  return { theme, colorScheme, setThemeOption, isLoading };
}
