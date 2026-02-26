import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColorScheme } from "react-native";

export default function TabLayout() {
  const theme = useColorScheme();
  const { user } = useUserStore();
  const ALLOWED_USER = ["CUSTOMER", "LAUNDRY_VENDOR", "RESTAURANT_VENDOR"];
  const isAllowed = ALLOWED_USER.includes(user?.user_metadata?.user_type!);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: "orange",

        tabBarStyle: {
          backgroundColor: theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
          borderTopColor: theme === "dark" ? "#333" : "#ccc",
        },
      }}
    >
      <Tabs.Screen
        name="delivery"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: "Restaurants",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="restaurant" color={color} />
          ),
          href: isAllowed ? "/(tabs)/food" : null,
        }}
      />
      <Tabs.Screen
        name="laundry"
        options={{
          title: "Laundry",
          href: isAllowed ? "/(tabs)/laundry" : null,
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              size={24}
              name="washing-machine"
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: "Marketplace",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="store" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={24} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
