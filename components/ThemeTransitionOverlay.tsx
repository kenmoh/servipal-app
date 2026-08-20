import {
  mapThemeToNativeWind,
  registerThemeTransition,
} from "@/hooks/theme-toggle";
import * as Sentry from "@sentry/react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useEffect, useRef } from "react";
import { ColorSchemeName, Dimensions } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const MAX_RADIUS = Math.sqrt(width ** 2 + height ** 2);

function clampOrigin(value: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function ThemeTransitionOverlay() {
  const { setColorScheme } = useColorScheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const originX = useSharedValue(width / 2);
  const originY = useSharedValue(height / 2);
  const overlayColor = useSharedValue("#000000");
  const transitionGenerationRef = useRef(0);

  const finalizeTransition = useCallback(
    (generation: number, nextTheme: ColorSchemeName, applyState: () => void) => {
      if (generation !== transitionGenerationRef.current) {
        return;
      }

      // Write to shared values BEFORE triggering any React state updates.
      // In React 19, state updates (applyState / setColorScheme) can cause a
      // synchronous re-render; writing to a Reanimated shared value afterward
      // trips the "writing to value during render" guard in Reanimated v4.
      opacity.value = withDelay(
        250,
        withTiming(
          0,
          {
            duration: 400,
            easing: Easing.out(Easing.quad),
          },
          (finished) => {
            if (finished) {
              scale.value = 0;
            }
          },
        ),
      );

      applyState();
      try {
        setColorScheme(mapThemeToNativeWind(nextTheme));
      } catch (e) {
        Sentry.captureException(e, { tags: { action: "nativewind_setColorScheme" } });
      }
    },
    [setColorScheme],
  );

  useEffect(() => {
    registerThemeTransition((x, y, nextTheme, applyState) => {
      const ox = clampOrigin(x, width / 2);
      const oy = clampOrigin(y, height / 2);
      const generation = ++transitionGenerationRef.current;

      originX.value = ox;
      originY.value = oy;
      overlayColor.value = nextTheme === "dark" ? "#18191c" : "#ffffff";

      opacity.value = 1;
      scale.value = 0;

      scale.value = withTiming(
        1,
        {
          duration: 850,
          easing: Easing.bezier(0.45, 0, 0.55, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(finalizeTransition)(generation, nextTheme, applyState);
          }
        },
      );
    });

    return () => {
      registerThemeTransition(null);
    };
  }, [finalizeTransition]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      left: originX.value - MAX_RADIUS,
      top: originY.value - MAX_RADIUS,
      backgroundColor: overlayColor.value,
      transform: [{ scale: scale.value }],
    };
  }, [MAX_RADIUS]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: MAX_RADIUS * 2,
          height: MAX_RADIUS * 2,
          borderRadius: MAX_RADIUS,
          zIndex: 99999,
        },
        animatedStyle,
      ]}
    />
  );
}
