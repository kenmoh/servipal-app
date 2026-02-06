import FAB from "@/components/FAB";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";

import { useUserStore } from "@/store/userStore";
import AntDesign from "@expo/vector-icons/AntDesign";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { router, useLocalSearchParams, withLayoutContext } from "expo-router";
// import { Bike, Landmark, MapPin, Menu, Star } from "lucide-react-native";
import LoadingIndicator from "@/components/LoadingIndicator";
import React from "react";
import { Dimensions, StyleSheet, useColorScheme, View } from "react-native";

import StoreHeader from "@/components/StoreHeader";

const StoreTabs = withLayoutContext(createMaterialTopTabNavigator().Navigator);

const StoreTabLayout = () => {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const theme = useColorScheme();

  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  return (
    <Wrapper>
      <StoreHeader storeId={storeId!} />
      <StoreTabs
        className="bg-background border-b-border-subtle text-primary"
        initialRouteName="index"
        initialLayout={{ width: Dimensions.get("window").width }}
        screenOptions={{
          tabBarLabelStyle: {
            fontSize: 12,
            textAlign: "center",
            textTransform: "capitalize",
            fontFamily: "Poppins-Bold",
          },
          swipeEnabled: false,
          lazy: true,
          lazyPreloadDistance: 0,
          lazyPlaceholder: () => <LoadingIndicator />,
          tabBarActiveTintColor: theme === "dark" ? "white" : "black",
          tabBarAndroidRipple: { borderless: false },
          tabBarPressOpacity: 0,

          tabBarIndicatorStyle: {
            backgroundColor: "orange",
            height: 1,
          },
          tabBarStyle: {
            backgroundColor: BG_COLOR,
            borderTopColor: "orange",
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomColor: "gray",
            borderBottomWidth: StyleSheet.hairlineWidth,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <StoreTabs.Screen
          name="index"
          options={{
            tabBarLabel: "Menu",
          }}
        />
        <StoreTabs.Screen
          name="beverage"
          options={{
            tabBarLabel: "Beverages",
          }}
        />
        <StoreTabs.Screen
          name="extras"
          options={{
            tabBarLabel: "Extras",
          }}
        />
      </StoreTabs>
    </Wrapper>
  );
};

export default StoreTabLayout;

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUserStore();
  return (
    <View className="flex-1">
      {children}
      {(user?.user_metadata.user_type === "RESTAURANT_VENDOR" ||
        user?.user_metadata.user_type === "LAUNDRY_VENDOR") && (
        <View className="absolute bottom-12 right-3">
          <FAB
            icon={<AntDesign name="menu" color={"white"} />}
            onPress={() =>
              router.push({
                pathname: "/store/add-menu",
              })
            }
          />
        </View>
      )}
    </View>
  );
};
