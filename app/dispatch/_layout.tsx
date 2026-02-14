import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { Stack } from "expo-router";
import React from "react";
import { useColorScheme, View } from "react-native";

const DispatchLayout = () => {
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
        <Stack.Screen name="index" options={{ title: "Riders" }} />
        <Stack.Screen
          name="add-rider"
          options={{
            title: "Add Rider",
          }}
        />
      </Stack>
    </View>
  );
};

export default DispatchLayout;
