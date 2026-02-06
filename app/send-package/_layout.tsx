import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, useColorScheme } from "react-native";

const _layout = () => {
  const theme = useColorScheme();
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: BG_COLOR,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: true,
          title: "Select Location",
          animation: "fade_from_bottom",
        }}
      />
      <Stack.Screen
        name="package-info"
        options={{ headerShown: true, title: "Package Info" }}
      />
    </Stack>
  );
};

export default _layout;

const styles = StyleSheet.create({});
