import React from "react";
import { ActivityIndicator, Dimensions, StyleSheet, View } from "react-native";

import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUserStore } from "@/store/userStore";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";

const Tab = withLayoutContext(createMaterialTopTabNavigator().Navigator);
const TabLoadingFallback = () => (
  <View className="flex-1 items-center justify-center bg-background">
    <ActivityIndicator size="large" color="orange" />
  </View>
);

const TopTab = () => {
  const theme = useColorScheme();
  const { profile } = useUserStore();
  const showAllTabs = ![
    "LAUNDRY_VENDOR",
    "CUSTOMER",
    "RESTAURANT_VENDOR",
  ].includes(profile?.user_type!);

  return (
    <Tab
      initialRouteName="index"
      initialLayout={{
        width: Dimensions.get("window").width,
      }}
      screenOptions={{
        lazy: true,
        lazyPreloadDistance: 0,
        lazyPlaceholder: () => <TabLoadingFallback />,
        swipeEnabled: false,
        tabBarLabelStyle: {
          textAlign: "center",
          fontFamily: "Poppins-Medium",
          fontSize: showAllTabs ? 16 : 12,
          textTransform: "none",
          margin: 0,
        },
        tabBarActiveTintColor: theme === "dark" ? "#fff" : "#000",
        tabBarInactiveTintColor: theme === "dark" ? "#aaa" : "#555",
        tabBarAndroidRipple: { borderless: false },
        tabBarPressOpacity: 0,
        tabBarScrollEnabled: false,
        tabBarItemStyle: {
          paddingHorizontal: 0,
        },
        tabBarIndicatorStyle: {
          backgroundColor: "orange",
          height: 1,
        },
        tabBarStyle: {
          backgroundColor: theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
          borderBottomColor: theme === "dark" ? "#333" : "#ccc",
          borderTopColor: theme === "dark" ? "#333" : "#ccc",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderBottomWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          shadowOpacity: 0,
          paddingHorizontal: 0,
        },
      }}
    >
      <Tab.Screen
        name="index"
        options={{
          tabBarLabel: "Delivery",
        }}
      />

      <Tab.Screen
        redirect={showAllTabs}
        name="food"
        options={{
          tabBarLabel: "Food",
        }}
      />
      <Tab.Screen
        name="laundry"
        redirect={showAllTabs}
        options={{
          tabBarLabel: "Laundry",
        }}
      />
    </Tab>
  );
};

export default TopTab;

const styles = StyleSheet.create({});
