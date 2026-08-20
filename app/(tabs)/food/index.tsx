import Feather from "@react-native-vector-icons/feather/static";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { searchNearbyRestaurants } from "@/api/user";
import LoadingIndicator from "@/components/LoadingIndicator";
import StoreCard from "@/components/StoreCard";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";

import HDivider from "@/components/HDivider";
import RefreshButton from "@/components/RefreshButton";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTrack } from "@/hooks/use-events";
import { useUserStore } from "@/store/userStore";
import { UserProfile } from "@/types/user-types";

import { usePathname } from "expo-router";

const DISTANCE_OPTIONS = [20, 30, 50] as const;

const RestaurantScreen = () => {
  const theme = useColorScheme();
  const { user } = useUserStore();
  const { track } = useTrack();
  const pathName = usePathname();
  const isDark = theme === "dark";

  const [userLocation, setCurrentUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedKm, setSelectedKm] = useState<number>(20);

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: [
      "restaurants",
      searchQuery,
      selectedKm,
      userLocation?.latitude,
      userLocation?.longitude,
    ],
    queryFn: () =>
      searchNearbyRestaurants(searchQuery, {
        lat: userLocation?.latitude,
        lng: userLocation?.longitude,
        maxDistanceKm: selectedKm,
      }),
    enabled: !!user?.id && !!userLocation,
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Get user's location
  useEffect(() => {
    const getUserLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const location = await Location.getCurrentPositionAsync({});

      if (location) {
        setCurrentUserLocation({
          latitude: location?.coords.latitude,
          longitude: location?.coords.longitude,
        });
      }
    };

    getUserLocation();
  }, []);

  // Simple debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput.length === 0 || searchInput.length >= 3) {
        setSearchQuery(searchInput);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    track("restaurants_screen_viewed", {
      user_type: user?.user_metadata.user_type!,
      screen: pathName,
    });
  }, [track, user, pathName]);

  const renderHeader = React.useMemo(
    () => (
      <>
        <View className="px-4 py-2">
          <AppTextInput
            placeholder="Search for food or restaurants..."
            value={searchInput}
            borderRadius="rounded-full"
            height={45}
            onChangeText={setSearchInput}
            icon={<Feather name="search" size={20} color="gray" />}
          />
        </View>
        <View className="flex-row gap-2 px-4 pb-2">
          {DISTANCE_OPTIONS.map((km) => {
            const active = selectedKm === km;
            return (
              <TouchableOpacity
                key={km}
                onPress={() => setSelectedKm(km)}
                className={`px-4 py-1.5 rounded-full border ${
                  active
                    ? "bg-button-primary border-button-primary"
                    : isDark
                      ? "border-gray-600"
                      : "border-gray-300"
                }`}
              >
                <Text
                  className={`text-sm font-poppins-medium ${
                    active
                      ? "text-white"
                      : isDark
                        ? "text-gray-300"
                        : "text-gray-600"
                  }`}
                >
                  {km}km
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <HDivider />
      </>
    ),
    [searchInput, selectedKm, isDark],
  );

  if (!userLocation || (isFetching && !data)) {
    return <LoadingIndicator />;
  }

  if (error) {
    return (
      <RefreshButton label="Error loading restaurants" onPress={refetch} />
    );
  }

  return (
    <View className="flex-1 bg-background">
      <HDivider />

      {isFetching && data && (
        <View className="absolute top-0 left-0 right-0 z-10">
          <LoadingIndicator />
        </View>
      )}

      <FlashList
        data={data?.vendors || []}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptySearch searchQuery={searchQuery} km={selectedKm} />
        }
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        refreshing={isFetching}
        onRefresh={handleRefresh}
        renderItem={({ item }: { item: UserProfile }) => (
          <StoreCard item={item} pathName="/store/[storeId]" />
        )}
        contentContainerStyle={{
          paddingBottom: 10,
        }}
      />
    </View>
  );
};

export default RestaurantScreen;

const EmptySearch = ({
  searchQuery,
  km,
}: {
  searchQuery?: string;
  km: number;
}) => {
  return (
    <View className="flex-1 justify-center items-center p-4">
      <Text className="text-lg text-primary text-center">
        {searchQuery
          ? `No results for "${searchQuery}"`
          : "No restaurants found nearby"}
      </Text>
      <Text className="text-sm text-muted text-center mt-2">
        {searchQuery
          ? "Try a different search term"
          : `We couldn't find any restaurants within ${km}km of your location`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
  modalCategoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  modalCategoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
});
