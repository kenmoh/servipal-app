import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, useColorScheme, View } from "react-native";

const StoreDetailLayout = () => {
  const theme = useColorScheme();
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  return (
    <View className="flex-1 bg-background">
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: theme === "dark" ? "white" : "black",
          headerStyle: {
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
      </Stack>
    </View>
  );
};

export default StoreDetailLayout;

const styles = StyleSheet.create({});
