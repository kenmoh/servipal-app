import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet, useColorScheme, View } from "react-native";

const _layout = () => {
  const theme = useColorScheme();
  const HEADER_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  return (
    <View className="bg-background flex-1">
      <Stack
        screenOptions={{
          headerTintColor: theme === "dark" ? "white" : "black",
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontFamily: "Poppins-Medium",
          },
          headerStyle: {
            backgroundColor: HEADER_COLOR,
          },
        }}
      >
        <Stack.Screen
          name="add-product"
          options={{
            title: "Add Product",
          }}
        />
        <Stack.Screen
          name="[orderId]"
          options={{
            headerTransparent: true,
            headerShown: false,
            headerStyle: {
              backgroundColor: "transparent",
            },

            title: "",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="productId/[productId]"
          options={{
            headerShown: false,
            title: "",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="product-reviews"
          options={{
            title: "Product Reviews",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </View>
  );
};

export default _layout;

const styles = StyleSheet.create({});
