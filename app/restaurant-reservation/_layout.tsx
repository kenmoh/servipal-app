import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function ReservationLayout() {
  const theme = useColorScheme();

  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: {
          fontFamily: "poppins-semibold",
          fontSize: 18,
        },
        headerTintColor: theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK,
        headerStyle: {
          backgroundColor: BG_COLOR,
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Reservations",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Reservation Settings",
        }}
      />
      <Stack.Screen
        name="rules"
        options={{
          title: "Custom Rules",
        }}
      />
    </Stack>
  );
}
