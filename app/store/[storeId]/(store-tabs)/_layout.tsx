import FAB from "@/components/FAB";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";

import { useUserStore } from "@/store/userStore";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { router, withLayoutContext } from "expo-router";
// import { Bike, Landmark, MapPin, Menu, Star } from "lucide-react-native";
import LoadingIndicator from "@/components/LoadingIndicator";
import Fontisto from "@expo/vector-icons/Fontisto";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useGlobalSearchParams } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

import { fetchProfile } from "@/api/user";
import BackButton from "@/components/BackButton";
import { UserProfile } from "@/types/user-types";
import { useQuery } from "@tanstack/react-query";

const StoreTabs = withLayoutContext(createMaterialTopTabNavigator().Navigator);

const StoreHeader = () => {
  const { storeId } = useGlobalSearchParams<{ storeId: string }>();
  const { profile: currentUserProfile } = useUserStore();

  const isOwnStore = storeId === currentUserProfile?.id;

  const { data: vendorProfile, isLoading } = useQuery({
    queryKey: ["vendorProfile", storeId],
    queryFn: () => fetchProfile(storeId!),
    enabled: !!storeId && !isOwnStore,
  });

  const displayProfile = isOwnStore
    ? currentUserProfile
    : (vendorProfile as UserProfile);

  console.log("🏪 [StoreHeader] id:", storeId, "isOwnStore:", isOwnStore);

  if (isLoading && !displayProfile) return <LoadingIndicator />;

  if (!displayProfile) {
    return (
      <View className="p-10 items-center justify-center">
        <Text className="text-primary font-poppins">Store not found</Text>
      </View>
    );
  }

  return (
    <View className="bg-background">
      <View className="bg-background">
        <Image
          source={{ uri: displayProfile?.backdrop_image_url! }}
          style={{
            height: 150,
            width: "100%",
            objectFit: "cover",
          }}
        />

        <BackButton />

        <View className="bg-background p-4">
          <View className="absolute top-[-35px] left-[20px]">
            <Image
              source={{ uri: displayProfile?.profile_image_url! }}
              style={{
                height: 65,
                width: 65,
                borderRadius: 10,
                objectFit: "cover",
              }}
            />
          </View>

          <View className="mt-3">
            <View className="flex-row gap-2 items-center mt-4">
              <FontAwesome6 name="landmark" color="gray" size={12} />
              <Text className="text-primary text-sm font-poppins-semibold uppercase">
                {displayProfile?.business_name}
              </Text>
            </View>
            <View className="flex-row items-center gap-2 mt-2">
              <Feather name="map-pin" color="gray" size={12} />
              <Text className="font-poppins text-primary text-sm flex-shrink">
                {displayProfile?.business_address}
              </Text>
            </View>
            <View className="flex-row justify-between mt-2">
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/review/[id]",
                    params: { id: storeId },
                  })
                }
                activeOpacity={0.7}
                className="flex-row items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full"
              >
                <View className="flex-row items-center gap-1.5 pr-2 border-r border-gray-300 dark:border-gray-600">
                  <Ionicons name="star" size={14} color="#FFB800" />
                  <Text className="text-primary font-poppins-bold text-sm">
                    {Number(displayProfile?.average_rating).toFixed(1)}
                  </Text>
                </View>
                <Text className="text-secondary font-poppins text-xs ml-2">
                  {displayProfile?.review_count || 0} reviews
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={12}
                  color="gray"
                  className="ml-1"
                />
              </TouchableOpacity>

              {displayProfile?.can_pickup_and_dropoff && (
                <Fontisto name="motorcycle" color={"orange"} size={20} />
              )}

              <View className="flex-row gap-2 items-baseline">
                <AntDesign name="clock-circle" color="gray" />
                <Text className="text-gray-500  font-poppins text-sm">
                  {displayProfile?.opening_hour || "N/A"} -{" "}
                  {displayProfile?.closing_hour || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const StoreTabLayout = () => {
  const theme = useColorScheme();

  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  return (
    <Wrapper>
      <StoreHeader />
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
            height: 3,
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
