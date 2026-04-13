import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";

const StoreDetailLayout = () => {
  const theme = useColorScheme();
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: theme === "dark" ? "white" : "black",
        headerStyle: {
          backgroundColor: BG_COLOR,
        },
        contentStyle: {
          backgroundColor: BG_COLOR,
        },
      }}
    >
      <Stack.Screen
        name="[storeId]/(store-tabs)"
        options={{
          animation: "simple_push",
          headerShown: false,
          headerStyle: {
            backgroundColor: "transparent",
          },
        }}
      />
      <Stack.Screen
        name="add-menu"
        options={{
          title: "Add Menu",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="[storeId]/create-reservation"
        options={{
          title: "Book a Table",
          animation: "slide_from_bottom",
          headerShown: true,
        }}
      />
    </Stack>
  );
};

export default StoreDetailLayout;

const styles = StyleSheet.create({});
