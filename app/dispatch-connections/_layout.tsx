import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";

const DispatchConnectionsLayout = () => {
  const theme = useColorScheme();
  return (
    <View className="flex-1 bg-background">
      <Stack
        screenOptions={{
          headerTitleStyle: {
            color: theme === "dark" ? "#fff" : "#000",
          },
          headerTintColor: theme === "dark" ? "#fff" : "#000",
          headerStyle: {
            backgroundColor:
              theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
          },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "Delivery Partners" }}
        />
      </Stack>
    </View>
  );
};

export default DispatchConnectionsLayout;
