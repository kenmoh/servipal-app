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
  borderColor = "orange",
  className,
  ...pressableProps
}: AppButtonProps) {
  // Check if textColor is a NativeWind class (starts with 'text-')
  const isTextColorClass = textColor?.startsWith("text-");

  // Compute variant-specific styles
  const variantStyle = useMemo<ViewStyle>(() => {
    // If backgroundColor class is provided, don't set inline backgroundColor
    if (backgroundColor) {
      if (variant === "outline") {
        return { borderWidth, borderColor: borderColor };
      }
      return {};
    }

    switch (variant) {
      case "fill":
        return { backgroundColor: color };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderWidth,
          borderColor: color,
        };
      case "ghost":
        return { backgroundColor: "transparent" };
      default:
        return { backgroundColor: color };
    }
  }, [variant, borderWidth, color, backgroundColor]);

  // Compute text color based on variant (only if not using NativeWind class)
  const computedTextColor = useMemo(() => {
    if (isTextColorClass) return undefined;
    if (textColor) return textColor;
    return variant === "fill" ? "#FFFFFF" : color;
  }, [variant, textColor, color, isTextColorClass]);

  // Build className for Pressable
  const pressableClassName = useMemo(() => {
    const classes = ["flex-row", "items-center", "justify-center"];
    if (backgroundColor) classes.push(backgroundColor);
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
    <Pressable
      disabled={disabled}
      style={[
        {
          height,
          width,
          opacity: disabled ? 0.5 : 1,
        },
        style,
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
              paddingHorizontal: 12, // Ensure text has room
              opacity: pressed ? 0.7 : 1,
            },
            variantStyle,
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
    </Pressable>
  );
}
