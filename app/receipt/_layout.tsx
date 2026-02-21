import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { Stack } from "expo-router";
import React from "react";
import { useColorScheme } from "react-native";

const ReceiptLayout = () => {
  const theme = useColorScheme();
  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
        },
      }}
    >
      <Stack.Screen
        name="cancel-sheet"
        options={{
          headerShown: false,
          presentation: "formSheet",
          sheetAllowedDetents: [0.75],
          sheetCornerRadius: 25,
          sheetGrabberVisible: true,
          sheetInitialDetentIndex: 0,
        }}
      />
      <Stack.Screen
        name="laundry-receipt"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Receipt",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor:
              theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
          },
        }}
      />
    </Stack>
  );
};

export default ReceiptLayout;
