import React from "react";

import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUserStore } from "@/store/userStore";
import { NativeTabs } from "expo-router/build/native-tabs";

export default function TabLayout() {
  const theme = useColorScheme();
  const { user } = useUserStore();
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const TINT_COLOR = theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK;
  const ALLOWED_USER = ["CUSTOMER", "LAUNDRY_VENDOR", "RESTAURANT_VENDOR"];
  const isAllowed = ALLOWED_USER.includes(user?.user_metadata?.user_type!);
  const hideForRider = user?.user_metadata.user_type === "RIDER";
  return (
    <NativeTabs
      backgroundColor={BG_COLOR}
      indicatorColor={"rgba(255, 140, 50, 0.12)"}
      rippleColor={"rgba(255, 140, 50, 0.25)"}
      labelVisibilityMode="labeled"
    >
      <NativeTabs.Trigger name="delivery">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="food" hidden={!isAllowed}>
        <NativeTabs.Trigger.Label>Food</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="fork.knife" md="restaurant" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="laundry" hidden={!isAllowed}>
        <NativeTabs.Trigger.Label>Laundry</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="washer"
          selectedColor={"washer.fill"}
          md="local_laundry_service"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="marketplace" hidden={hideForRider}>
        <NativeTabs.Trigger.Label>Marketplace</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="storefront" md="store" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile/index">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
    // <Tabs
    //   screenOptions={{
    //     headerShown: false,
    //     tabBarButton: HapticTab,
    //     tabBarActiveTintColor: "orange",

    //     tabBarStyle: {
    //       backgroundColor: theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
    //       borderTopColor: theme === "dark" ? "#333" : "#ccc",
    //     },
    //   }}
    // >
    //   <Tabs.Screen
    //     name="delivery"
    //     options={{
    //       title: "Home",
    //       tabBarIcon: ({ color }) => (
    //         <MaterialIcons size={24} name="home" color={color} />
    //       ),
    //     }}
    //   />
    //   <Tabs.Screen
    //     name="food"
    //     options={{
    //       title: "Restaurants",
    //       tabBarIcon: ({ color }) => (
    //         <MaterialIcons size={24} name="restaurant" color={color} />
    //       ),
    //       href: isAllowed ? "/(tabs)/food" : null,
    //     }}
    //   />
    //   <Tabs.Screen
    //     name="laundry"
    //     options={{
    //       title: "Laundry",
    //       href: isAllowed ? "/(tabs)/laundry" : null,
    //       tabBarIcon: ({ color }) => (
    //         <MaterialCommunityIcons
    //           size={24}
    //           name="washing-machine"
    //           color={color}
    //         />
    //       ),
    //     }}
    //   />
    //   <Tabs.Screen
    //     name="marketplace"
    //     options={{
    //       title: "Marketplace",
    //       tabBarIcon: ({ color }) => (
    //         <MaterialIcons size={24} name="store" color={color} />
    //       ),
    //     }}
    //   />
    //   <Tabs.Screen
    //     name="profile/index"
    //     options={{
    //       title: "Profile",
    //       tabBarIcon: ({ color }) => (
    //         <MaterialIcons size={24} name="person" color={color} />
    //       ),
    //     }}
    //   />
    // </Tabs>
  );
}
