import Feather from "@expo/vector-icons/Feather";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";

import { searchNearbyLaundry } from "@/api/user";
import LoadingIndicator from "@/components/LoadingIndicator";
import StoreCard from "@/components/StoreCard";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";

import HDivider from "@/components/HDivider";
import RefreshButton from "@/components/RefreshButton";
import { useUserStore } from "@/store/userStore";
import { UserProfile } from "@/types/user-types";

const LaundryScreen = () => {
  const theme = useColorScheme();
  const { user } = useUserStore();

  const [userLocation, setCurrentUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["laundry", searchQuery],
    queryFn: () => searchNearbyLaundry(searchQuery),
    enabled: !!user?.id,
  });

  console.log("data", data);

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
      setSearchQuery(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  if (!userLocation || isFetching) {
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

      <FlashList
        data={data?.vendors || []}
        ListHeaderComponent={() => (
          <>
            <View className="px-4 py-2">
              <AppTextInput
                placeholder="Search for laundry service providers..."
                value={searchInput}
                borderRadius="rounded-full"
                height={45}
                onChangeText={setSearchInput}
                icon={<Feather name="search" size={20} color="gray" />}
              />
            </View>
            <HDivider />
          </>
        )}
        ListEmptyComponent={<EmptySearch searchQuery={searchQuery} />}
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

export default LaundryScreen;

const EmptySearch = ({ searchQuery }: { searchQuery?: string }) => {
  return (
    <View className="flex-1 justify-center items-center p-4">
      <Text className="text-lg text-primary text-center">
        {searchQuery
          ? `No results for "${searchQuery}"`
          : "No laundry service providers found nearby"}
      </Text>
      <Text className="text-sm text-muted text-center mt-2">
        {searchQuery
          ? "Try a different search term"
          : "We couldn't find any laundry service providers within 35km of your location"}
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
