import { registerThemeTransition } from "@/hooks/theme-toggle";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { Appearance, ColorSchemeName, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const { width, height } = Dimensions.get("window");
const MAX_RADIUS = Math.sqrt(width ** 2 + height ** 2);

export function ThemeTransitionOverlay() {
  const { setColorScheme } = useColorScheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const originX = useSharedValue(width / 2);
  const originY = useSharedValue(height / 2);
  const overlayColor = useSharedValue("#000000");

  useEffect(() => {
    registerThemeTransition((x, y, nextTheme) => {
      originX.value = x;
      originY.value = y;
      overlayColor.value = nextTheme === "dark" ? "#000000" : "#ffffff";

      opacity.value = 1;
      scale.value = 0;
      scale.value = withTiming(1, { duration: 500 }, (finished) => {
        if (finished) {
          scheduleOnRN(applyThemeAndReset, nextTheme);
        }
      });
    });
  }, []);

  const applyThemeAndReset = (nextTheme: ColorSchemeName) => {
    if (
      nextTheme === "light" ||
      nextTheme === "dark" ||
      nextTheme === "unspecified"
    ) {
      Appearance.setColorScheme(nextTheme);
    }
    setColorScheme(nextTheme as any);
    // Fade out overlay after theme applied
    opacity.value = withTiming(0, { duration: 150 }, () => {
      scale.value = 0;
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    width: MAX_RADIUS * 2,
    height: MAX_RADIUS * 2,
    borderRadius: MAX_RADIUS,
    backgroundColor: overlayColor.value,
    opacity: opacity.value,
    left: originX.value - MAX_RADIUS,
    top: originY.value - MAX_RADIUS,
    transform: [{ scale: scale.value }],
    zIndex: 9999,
    pointerEvents: "none",
  }));

  return <Animated.View style={animatedStyle} />;
}
