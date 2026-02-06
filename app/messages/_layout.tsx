import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, useColorScheme, View } from "react-native";

const _layout = () => {
  const theme = useColorScheme();
  return (
    <View className="flex-1 bg-background">
      <Stack
        screenOptions={{
          headerTintColor: theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK,
          title: "Messages",
          animation: "slide_from_right",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor:
              theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
          },
        }}
      >
        <Stack.Screen name="id" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ title: "Messages" }} />
      </Stack>
    </View>
  );
};

export default _layout;

const styles = StyleSheet.create({});
