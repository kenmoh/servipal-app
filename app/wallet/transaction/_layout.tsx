import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { Stack } from "expo-router";
import React from "react";
import { useColorScheme, View } from "react-native";

const TransactionLayout = () => {
  const theme = useColorScheme();
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  return (
    <View className="flex-1 bg-background">
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: BG_COLOR,
          },

          headerShadowVisible: false,

          headerTintColor: theme === "dark" ? "white" : "black",
        }}
      >
        <Stack.Screen name="[id]" options={{ title: "Transaction Details" }} />
      </Stack>
    </View>
  );
};

export default TransactionLayout;
