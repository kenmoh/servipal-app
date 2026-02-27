import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Stack } from "expo-router";
import React from "react";

const _layout = () => {
  const theme = useColorScheme();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Laundry",
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor:
              theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
          },
          headerTintColor: theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK,
        }}
      />
    </Stack>
  );
};

export default _layout;
