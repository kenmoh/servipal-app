import React, { ReactNode, useMemo } from "react";
import {
  DimensionValue,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface AppButtonProps extends Omit<PressableProps, "style"> {
  /**
   * Button text content
   */
  text: string;
  /**
   * Button variant (default: 'fill')
   * - fill: Solid background color
   * - outline: Transparent background with border
   * - ghost: Transparent background without border
   */
  variant?: "fill" | "outline" | "ghost";
  /**
   * Button height (default: 45)
   */
  height?: number;
  /**
   * Button width (default: '100%')
   */
  width?: DimensionValue;
  /**
   * Button color (default: orange '#FF8C00')
   * Used as background for fill variant
   */
  color?: string;
  /**
   * Background color as NativeWind class (e.g., 'bg-primary')
   * Overrides color prop when using variant='fill'
   */
  backgroundColor?: string;
  /**
   * Text color - can be hex color or NativeWind class (e.g., 'text-primary')
   */
  textColor?: string;
  /**
   * Border radius (default: 12)
   */
  borderRadius?: number;
  /**
   * Border width for outline variant (default: 2)
   */
  borderWidth?: number;
  /**
   * Optional icon
   */
  icon?: ReactNode;
  /**
   * Optional custom container styles
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional custom text styles
   */
  textStyle?: StyleProp<TextStyle>;
  /**
   * Optional className for NativeWind styling
   */
  className?: string;
  /**
   * Optional borderColor for outline variant
   */
  borderColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AppButton({
  text,
  variant = "fill",
  height = 45,
  width = "100%",
  color = "orange",
  backgroundColor,
  textColor,
  borderRadius = 12,
  borderWidth = 2,
  icon,
  disabled,
  style,
  textStyle,
  borderColor,
  className,
  ...pressableProps
}: AppButtonProps) {
  // Check if textColor is a NativeWind class (starts with 'text-')
  const isTextColorClass = textColor?.startsWith("text-");

  // Compute text color based on variant (only if not using NativeWind class)
  const computedTextColor = useMemo(() => {
    if (isTextColorClass) return undefined;
    if (textColor) return textColor;
    return variant === "fill" ? "#FFFFFF" : color;
  }, [variant, textColor, color, isTextColorClass]);

  const actualBorderColor = borderColor || color;

  const resolveBackgroundColor = () => {
    "worklet";
    if (variant !== "fill") return "transparent";
    // Inline the class check inside the worklet for safety
    const isBgClass =
      backgroundColor?.startsWith("bg-") || backgroundColor?.includes(" ");
    if (backgroundColor && !isBgClass) return backgroundColor;
    return color;
  };

  // Reanimated shared values for animations
  const pressScale = useSharedValue(1);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(resolveBackgroundColor(), {
        duration: 300,
      }),
      borderColor: withTiming(
        variant === "outline" ? actualBorderColor : "transparent",
        { duration: 300 },
      ),
      borderWidth: variant === "outline" ? borderWidth : 0,
      transform: [{ scale: pressScale.value }],
    };
  });

  const handlePressIn = () => {
    pressScale.value = withSpring(0.96);
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1);
  };

  // Build className for Pressable
  const pressableClassName = useMemo(() => {
    const isBgClass =
      backgroundColor?.startsWith("bg-") || backgroundColor?.includes(" ");
    const classes = ["flex-row", "items-center", "justify-center"];
    if (isBgClass && backgroundColor) classes.push(backgroundColor);
    if (className) classes.push(className);
    return classes.join(" ");
  }, [backgroundColor, className]);

  // Build className for Text
  const textClassName = useMemo(() => {
    const classes = ["text-base", "font-poppins-semibold"];
    if (isTextColorClass && textColor) classes.push(textColor);
    return classes.join(" ");
  }, [isTextColorClass, textColor]);

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          height,
          width,
          borderRadius,
          opacity: disabled ? 0.5 : 1,
        },
        style,
        animatedContainerStyle,
      ]}
      {...pressableProps}
    >
      {({ pressed }) => (
        <View
          className={pressableClassName}
          style={[
            {
              flex: 1,
              borderRadius,
              gap: 8,
              paddingHorizontal: 12,
            },
          ]}
        >
          {icon}
          <Text
            className={textClassName}
            style={[
              computedTextColor ? { color: computedTextColor } : {},
              textStyle,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {text}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}
