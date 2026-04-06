import * as SecureStore from "expo-secure-store";
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
let cachedTheme: ColorSchemeName = "unspecified";
let themeListeners: Set<(theme: ColorSchemeName) => void> = new Set();

export const registerThemeTransition = (cb: ThemeTransitionCallback) => {
  transitionCallback = cb;
};

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
        const themeToApply = (stored as ColorSchemeName) || "unspecified";
        if (themeToApply !== "unspecified") {
          applyThemeState(themeToApply, true);
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
      if (cachedTheme === "unspecified") {
        setTheme("unspecified");
      }
    });
    return () => sub.remove();
  }, []);

  const applyThemeState = (option: ColorSchemeName, immediate = false) => {
    notifyListeners(option);
    if (option === "light" || option === "dark" || option === "unspecified") {
      if (immediate) {
        Appearance.setColorScheme(option);
      }
    }
  };

  const setThemeOption = async (
    option: ColorSchemeName,
    touchX?: number,
    touchY?: number,
  ) => {
    if (option === theme) return;

    // Save to storage immediately
    await SecureStore.setItemAsync(THEME_KEY, option);

    const applyState = () => {
      applyThemeState(option, true);
    };

    if (transitionCallback && touchX !== undefined && touchY !== undefined) {
      // Trigger transition animation — let the overlay decide when to call applyState
      transitionCallback(touchX, touchY, option, applyState);
    } else {
      // Fallback: apply immediately
      applyState();
    }
  };

  // Resolved actual color scheme for components that need light/dark
  const colorScheme =
    theme === "unspecified" ? (Appearance.getColorScheme() ?? "light") : theme;

  return { theme, colorScheme, setThemeOption, isLoading };
}
