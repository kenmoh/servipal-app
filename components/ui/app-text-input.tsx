import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useRef, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type DimensionValue,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

interface AppTextInputProps extends Omit<TextInputProps, "style"> {
  /**
   * Optional label displayed above the input
   */
  label?: string;
  /**
   * Input container height (default: 56)
   */
  height?: number | string;
  /**
   * Input container width (default: '100%')
   */
  width?: DimensionValue;
  /**
   * Background color class or value (default: 'bg-input')
   */
  backgroundColor?: string;
  /**
   * Label text color class or value (default: 'text-muted')
   */
  labelColor?: string;
  /**
   * Text color class or value (default: 'text-foreground')
   */
  textColor?: string;
  /**
   * Placeholder text color (default: '#9CA3AF' - gray-400)
   */
  placeholderColor?: string;
  /**
   * Border radius (default: 'rounded-xl')
   */
  borderRadius?: string;
  /**
   * Focus border color (default: '#FF8C00' - orange)
   */
  focusBorderColor?: string;
  /**
   * Disabled state
   */
  disabled?: boolean;
  /**
   * Optional custom container styles
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Optional custom text styles
   */
  textStyle?: StyleProp<TextStyle>;
  /**
   * Optional error message
   */
  errorMessage?: string;
  /**
   * Optional icon to display on the left
   */
  icon?: React.ReactNode;
}

export function AppTextInput({
  label,
  height = 56,
  width = "100%",
  backgroundColor = "bg-input",
  labelColor = "text-muted",
  textColor = "text-primary",
  placeholderColor = "#9CA3AF",
  borderRadius = "rounded-xl",
  focusBorderColor = "#FF8C00",
  disabled,
  style,
  textStyle,
  multiline,
  className,
  secureTextEntry,
  errorMessage,
  icon,
  onFocus,
  onBlur,
  ...props
}: AppTextInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isPassword = secureTextEntry === true;

  const handleContainerPress = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View
      className={className || ""}
      style={{ width: width, alignSelf: "center" }}
    >
      {label && (
        <Text
          className={`text-sm font-poppins-medium mb-1.5 ml-1 ${labelColor}`}
        >
          {label}
        </Text>
      )}
      <Pressable
        onPress={handleContainerPress}
        className={`flex-row items-center px-4 ${backgroundColor} ${borderRadius} ${
          disabled ? "opacity-50" : ""
        }`}
        style={[
          {
            height: multiline
              ? undefined
              : typeof height === "number"
                ? height
                : undefined,
            minHeight:
              multiline && typeof height === "number" ? height : undefined,
            width: "100%",
            borderWidth: isFocused ? 1 : 0,
            borderColor: isFocused ? focusBorderColor : "transparent",
          },
          style,
        ]}
      >
        {icon && <View className="mr-2">{icon}</View>}
        <TextInput
          ref={inputRef}
          editable={!disabled}
          placeholderTextColor={placeholderColor}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          className={`flex-1 font-poppins-regular text-base ${textColor} ${
            multiline ? "py-3" : ""
          }`}
          style={[textStyle, { height: "100%" }]}
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color={placeholderColor}
            />
          </Pressable>
        )}
      </Pressable>
      {errorMessage && (
        <Text className="text-red-500/80 text-sm mt-1 ml-1 font-poppins-light">
          {errorMessage}
        </Text>
      )}
    </View>
  );
}
