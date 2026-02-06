import React from "react";
import { Text, useColorScheme, View } from "react-native";

const StatCard = React.memo(
  ({
    icon,
    label,
    value,
  }: {
    icon: React.ReactNode;
    label: string;
    value: number;
  }) => {
    const theme = useColorScheme();
    return (
      <View className="bg-input items-center justify-evenly py-2 mb-6 h-[90] w-[100] rounded-lg border border-collapse-transparent border-border-subtle border-rounded-lg">
        {icon}
        <View className="items-center">
          <Text
            style={{
              fontSize: 20,
              fontWeight: "500",
              color: theme === "dark" ? "#ddd" : "#000",
            }}
          >
            {value}
          </Text>
          <Text
            style={{ fontSize: 12, color: theme === "dark" ? "#888" : "#555" }}
          >
            {label}
          </Text>
        </View>
      </View>
    );
  },
);
StatCard.displayName = "StatCard";

export default StatCard;
