import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColorScheme } from "react-native";

export default function TabLayout() {
  const theme = useColorScheme();
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
        }}
      />
      <Tabs.Screen
        name="laundry"
        options={{
          title: "Laundry",
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
