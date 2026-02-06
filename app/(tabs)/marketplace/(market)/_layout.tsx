import LoadingIndicator from "@/components/LoadingIndicator";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { withLayoutContext } from "expo-router";
import { Dimensions, StyleSheet, useColorScheme, View } from "react-native";

const MarketPlaceTabs = withLayoutContext(
  createMaterialTopTabNavigator().Navigator,
);

const DeliveryLayout = () => {
  const theme = useColorScheme();
  return (
    <View className="flex-1 bg-background">
      <MarketPlaceTabs
        initialRouteName="index"
        initialLayout={{
          width: Dimensions.get("window").width,
        }}
        screenOptions={{
          lazy: true,
          lazyPreloadDistance: 0,
          lazyPlaceholder: () => <LoadingIndicator />,
          tabBarLabelStyle: {
            fontSize: 12,
            textAlign: "center",
            textTransform: "capitalize",
            fontFamily: "Poppins-Bold",
          },

          swipeEnabled: false,
          tabBarActiveTintColor: theme === "dark" ? "#fff" : "#000",
          tabBarInactiveTintColor: theme === "dark" ? "#aaa" : "#555",
          tabBarAndroidRipple: { borderless: false },
          tabBarPressOpacity: 0,
          tabBarIndicatorStyle: {
            backgroundColor: "orange",
            height: 3,
          },
          tabBarStyle: {
            backgroundColor:
              theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
            borderBottomColor:
              theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
            borderBottomWidth: StyleSheet.hairlineWidth,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}
      >
        <MarketPlaceTabs.Screen
          name="index"
          options={{
            tabBarLabel: "Marketplace",
          }}
        />
        <MarketPlaceTabs.Screen
          name="orders"
          options={{
            tabBarLabel: "Orders",
          }}
        />
        <MarketPlaceTabs.Screen
          name="items"
          options={{
            tabBarLabel: "Items",
          }}
        />
      </MarketPlaceTabs>
    </View>
  );
};

export default DeliveryLayout;
