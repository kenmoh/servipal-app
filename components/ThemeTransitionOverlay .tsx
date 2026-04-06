import { registerThemeTransition } from "@/hooks/theme-toggle";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
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

export function ThemeTransitionOverlay() {
  const { setColorScheme } = useColorScheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const originX = useSharedValue(width / 2);
  const originY = useSharedValue(height / 2);
  const overlayColor = useSharedValue("#000000");

  useEffect(() => {
    registerThemeTransition((x, y, nextTheme, applyState) => {
      originX.value = x;
      originY.value = y;
      overlayColor.value = nextTheme === "dark" ? "#18191c" : "#ffffff";

      opacity.value = 1;
      scale.value = 0;
      
      // Slower, smoother animation for expansion
      scale.value = withTiming(
        1,
        { 
          duration: 850, 
          easing: Easing.bezier(0.45, 0, 0.55, 1) // Smooth ease-in-out
        },
        (finished) => {
          if (finished) {
            // Apply the actual theme state only once the screen is fully covered
            runOnJS(finalizeTheme)(nextTheme, applyState);
          }
        }
      );
    });
  }, []);

  const finalizeTheme = (nextTheme: ColorSchemeName, applyState: () => void) => {
    // 1. Update global Appearance and custom theme store state
    applyState();
    
    // 2. Sync NativeWind color scheme
    setColorScheme(nextTheme as any);
    
    // 3. Fade out the overlay smoothly
    opacity.value = withDelay(
      50, // Minimal delay to ensure theme application has started
      withTiming(
        0,
        { 
          duration: 400, 
          easing: Easing.out(Easing.quad) 
        },
        () => {
          scale.value = 0;
        }
      )
    );
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
    zIndex: 99999, // Ensure it's above everything
    pointerEvents: "none",
  }));

  return <Animated.View style={animatedStyle} />;
}
