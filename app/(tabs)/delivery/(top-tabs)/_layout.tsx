import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  useColorScheme,
  View,
} from "react-native";

import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
// import { useUserStore } from "@/store/userStore";
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
          // fontSize: 12,
          textAlign: "center",
          textTransform: "capitalize",
          fontFamily: "Poppins-Medium",
        },
        tabBarActiveTintColor: theme === "dark" ? "#fff" : "#000",
        tabBarInactiveTintColor: theme === "dark" ? "#aaa" : "#555",
        tabBarAndroidRipple: { borderless: false },
        tabBarPressOpacity: 0,
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
        // redirect={
        //   userType === "DISPATCH" ||
        //   userType === "RIDER" ||
        //   userType === "LAUNDRY_VENDOR"
        // }
        name="food"
        options={{
          tabBarLabel: "Food",
        }}
      />
      <Tab.Screen
        // redirect={
        //   userType === "DISPATCH" ||
        //   userType === "RIDER" ||
        //   userType === "RESTAURANT_VENDOR"
        // }
        name="laundry"
        options={{
          tabBarLabel: "Laundry",
        }}
      />
    </Tab>
  );
};

export default TopTab;

const styles = StyleSheet.create({});
