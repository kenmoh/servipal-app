import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type ToggleSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  loadingColor?: string;
};

export default function ToggleSwitch({
  value,
  onValueChange,
  label,
  description,
  icon,
  disabled = false,
  loading = false,
  loadingColor = "#eee",
}: ToggleSwitchProps) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-3 flex-1 mr-3">
        {icon}
        <View className="flex-1">
          <Text className="text-muted font-poppins-medium">{label}</Text>
          {description && (
            <Text className="text-xs text-gray-400 font-poppins mt-0.5">
              {description}
            </Text>
          )}
        </View>
      </View>
      <View className="flex-row items-center gap-1">
        {loading && <ActivityIndicator color={loadingColor} size="small" />}
        <Pressable
          onPress={() => onValueChange(!value)}
          disabled={disabled}
          className={`w-14 h-8 rounded-full p-1 flex-row items-center ${
            value ? "bg-button-primary" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <View
            className={`w-6 h-6 rounded-full bg-white shadow-sm ${
              value ? "ml-auto" : "mr-auto"
            }`}
          />
        </Pressable>
      </View>
    </View>
  );
}
