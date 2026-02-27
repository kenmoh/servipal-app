import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";

type ThemeTransitionCallback = (
  x: number,
  y: number,
  next: ColorSchemeName,
) => void;
const THEME_KEY = "user_theme";

let transitionCallback: ThemeTransitionCallback | null = null;

export const registerThemeTransition = (cb: ThemeTransitionCallback) => {
  transitionCallback = cb;
};

export function useTheme() {
  const [theme, setTheme] = useState<ColorSchemeName>("unspecified");

  // Load persisted theme on mount
  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      if (stored) {
        applyTheme(stored as ColorSchemeName);
      }
    });
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (theme === "unspecified") {
        setTheme("unspecified");
      }
    });
    return () => sub.remove();
  }, [theme]);

  const applyTheme = (option: ColorSchemeName) => {
    setTheme(option);
    if (option === "light" || option === "dark" || option === "unspecified") {
      Appearance.setColorScheme(option);
    }
  };

  // const setThemeOption = async (option: ColorSchemeName) => {
  //   applyTheme(option);
  //   await SecureStore.setItemAsync(THEME_KEY, option);
  // };
  const setThemeOption = async (
    option: ColorSchemeName,
    touchX?: number,
    touchY?: number,
  ) => {
    if (option === theme) return;

    if (transitionCallback && touchX !== undefined && touchY !== undefined) {
      transitionCallback(touchX, touchY, option);
    } else {
      applyTheme(option);
    }

    await SecureStore.setItemAsync(THEME_KEY, option);
  };

  // Resolved actual color scheme for components that need light/dark
  const colorScheme =
    theme === "unspecified" ? (Appearance.getColorScheme() ?? "light") : theme;

  return { theme, colorScheme, setThemeOption };
}
