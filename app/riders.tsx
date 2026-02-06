import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { assignRiderToDeliveryOrder } from "@/api/delivery";
import { getNearbyRiders, updatecurrentUserLocation } from "@/api/user";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import RefreshButton from "@/components/RefreshButton";
import Rider from "@/components/Rider";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useOrderStore } from "@/store/orderStore";
import { useRiderStore } from "@/store/rider-store";
import { useUserStore } from "@/store/userStore";
import { RiderResponse } from "@/types/user-types";
import { supabase } from "@/utils/supabase";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Sentry from "@sentry/react-native";
import { useLocalSearchParams } from "expo-router";
import {
  Alert,
  FlatList,
  Image,
  Text,
  useColorScheme,
  View,
} from "react-native";

// Helper: Calculate distance in meters (Haversine)
const getDistanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const RidersScreen = () => {
  const { user } = useUserStore();
  const { deliveryId } = useOrderStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRider, setSelectedRider] = useState<
    RiderResponse | undefined
  >();
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [locationPermission, setLocationPermission] = useState<boolean | null>(
    null,
  );
  const [isLayoutComplete, setIsLayoutComplete] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { showError, showSuccess } = useToast();
  const { txRef, paymentStatus } = useLocalSearchParams<{
    txRef: string;
    paymentStatus: "successful" | "cancelled" | "PAID";
  }>();

  const theme = useColorScheme();

  const HANDLE_INDICATOR_STYLE =
    theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK;
  const HANDLE_STYLE = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  const queryClient = useQueryClient();
  const [userLocation, setCurrentUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<FlatList>(null);
  const ITEM_HEIGHT = 138;
  const lastSentLocation = useRef<{ lat: number; lng: number } | null>(null);

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const handleRiderPress = useCallback(
    (rider: RiderResponse) => {
      const isPaid = paymentStatus === "successful" || paymentStatus === "PAID";

      if (!txRef || !isPaid) {
        Alert.alert(
          "Notice",
          "Please complete the payment process before booking a rider.",
        );
        return;
      }
      setSelectedRider(rider);
      bottomSheetRef.current?.snapToIndex(0);
    },
    [txRef, paymentStatus],
  );

  const handleScrollToHide = useCallback(() => {
    const { newRiderCount, clearNewRiders } = useRiderStore.getState();
    if (newRiderCount > 0) {
      clearNewRiders();
    }
  }, []);

  const assignRiderMutation = useMutation({
    mutationFn: () => assignRiderToDeliveryOrder(txRef, selectedRider?.id!),
    onError: (error) => {
      showError("Error", error.message || "An unexpected error occurred!");
      refetch();
    },
    onSuccess: async (data) => {
      showSuccess("Success", data?.message);
      refetch();
      await queryClient.invalidateQueries({
        queryKey: ["user-orders", user?.id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["orders", user?.id],
      });
    },
  });

  const handleBookRider = useCallback(() => {
    if (selectedRider) {
      Alert.alert(
        "Assign Rider",
        "This rider will be assigned to your order. Do you want to continue?",
        [
          { text: "Cancel", style: "default" },
          {
            text: "Assign",
            onPress: () => {
              assignRiderMutation.mutate();
              bottomSheetRef.current?.close();
            },
          },
        ],
      );
    }
  }, [selectedRider]);

  // Debounce search query
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  const handleLayoutComplete = useCallback(() => {
    setIsLayoutComplete(true);
  }, []);

  const checkLocationPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const isLocationEnabled = await Location.hasServicesEnabledAsync();

      if (status === "granted" && isLocationEnabled) {
        setLocationPermission(true);
        return { status, isLocationEnabled };
      }

      if (status !== "granted") {
        const { status: newStatus } =
          await Location.requestForegroundPermissionsAsync();
        const finalEnabled = await Location.hasServicesEnabledAsync();
        setLocationPermission(newStatus === "granted" && finalEnabled);
        return { status: newStatus, isLocationEnabled: finalEnabled };
      }

      setLocationPermission(false);
      return { status, isLocationEnabled };
    } catch (error) {
      console.error("Permission check failed:", error);
      setLocationPermission(false);
      return { status: "undetermined", isLocationEnabled: false };
    }
  }, []);

  useEffect(() => {
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email });
      Sentry.setTag("user_type", user.user_metadata.user_type);
    }
  }, [user]);

  useEffect(() => {
    checkLocationPermission();
  }, [checkLocationPermission]);

  // ============ LOCATION TRACKING ============
  useEffect(() => {
    if (
      !user ||
      !["RIDER", "CUSTOMER"].includes(user.user_metadata.user_type!)
    ) {
      console.log(
        "[Location] Skipping location updates - user type:",
        user?.user_metadata.user_type,
      );
      return;
    }

    let locationWatcher: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("[Location] Foreground permission not granted");
        return;
      }

      // Background permission for riders
      if (user.user_metadata.user_type === "RIDER") {
        const bgStatus = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus.status !== "granted") {
          console.warn(
            "[Location] Background location denied - rider updates limited to foreground",
          );
        }
      }

      const config = {
        accuracy: Location.Accuracy.High,
        timeInterval: user.user_metadata.user_type === "RIDER" ? 60000 : 300000,
        distanceInterval: user.user_metadata.user_type === "RIDER" ? 30 : 200,
        showsBackgroundLocationIndicator:
          user.user_metadata.user_type === "RIDER",
      };

      locationWatcher = await Location.watchPositionAsync(
        config,
        async (location) => {
          const lat = location.coords.latitude;
          const lng = location.coords.longitude;

          // Set the local user location state
          setCurrentUserLocation({ latitude: lat, longitude: lng });

          // Skip if location hasn't changed significantly
          if (lastSentLocation.current) {
            const distance = getDistanceMeters(
              lastSentLocation.current.lat,
              lastSentLocation.current.lng,
              lat,
              lng,
            );
            if (distance < 50) {
              return;
            }
          }

          lastSentLocation.current = { lat, lng };

          try {
            const result = await updatecurrentUserLocation({
              latitude: lat,
              longitude: lng,
            });

            console.log("[Location] Updated successfully:", result);

            // Refetch riders if customer moved
            if (user.user_metadata.user_type === "CUSTOMER") {
              queryClient.invalidateQueries({ queryKey: ["riders"] });
            }
          } catch (err) {
            console.error("[Location] Update failed:", err);
          }
        },
      );
    };

    startLocationTracking();

    return () => {
      if (locationWatcher) {
        locationWatcher.remove();
      }
    };
  }, [user?.user_metadata.user_type, user?.id, queryClient]);

  // ============ FETCH RIDERS ============
  const {
    data: riders,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["riders", user?.id],
    queryFn: async () => getNearbyRiders(user?.id!),
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });

  // ============ REALTIME RIDER UPDATES ============
  useEffect(() => {
    if (!user?.id || user?.user_metadata.user_type !== "CUSTOMER") return;

    const channel = supabase
      .channel("riders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: "user_type=eq.RIDER",
        },
        (payload) => {
          console.log("[Realtime] Rider changed:", payload.eventType);
          // Invalidate to refetch with fresh distance calculations
          queryClient.invalidateQueries({ queryKey: ["riders", user?.id] });
        },
      )
      .subscribe((status) => {
        console.log("[Realtime] Subscription status:", status);
        Sentry.setTag("connectionStatus", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.user_metadata.user_type, queryClient]);

  const renderItem = useCallback(
    ({ item }: { item: RiderResponse }) => (
      <Rider onPress={() => handleRiderPress(item)} rider={item} />
    ),
    [handleRiderPress],
  );

  const renderSeparator = useCallback(() => <HDivider />, []);

  const keyExtractor = useCallback(
    (item: RiderResponse) => item.id.toString(),
    [],
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // if (!locationPermission) {
  //   return <LocationPermission onRetry={checkLocationPermission} />;
  // }

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <RefreshButton onPress={refetch} label="Error loading riders" />;
  }
  return (
    <View className="bg-background flex-1 p-2 gap-2">
      <HDivider />

      <FlatList
        ref={listRef}
        data={riders || []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        refreshing={isFetching}
        onRefresh={handleRefresh}
        onLayout={handleLayoutComplete}
        onScroll={handleScrollToHide}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={21}
        initialNumToRender={10}
        getItemLayout={getItemLayout}
      />

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={["60%"]}
        index={-1}
        enablePanDownToClose={true}
        handleIndicatorStyle={{ backgroundColor: HANDLE_INDICATOR_STYLE }}
        handleStyle={{ backgroundColor: HANDLE_STYLE }}
        backgroundStyle={{
          backgroundColor: BG_COLOR,
          shadowColor: "orange",
        }}
        onChange={(index: number) => setIsSheetOpen(index >= 0)}
      >
        <BottomSheetView style={{ flex: 1 }} className="bg-background">
          {selectedRider && (
            <>
              <View className="p-4 items-center flex-1 bg-background">
                <View className="w-28 h-28 rounded-full overflow-hidden">
                  <Image
                    src={selectedRider?.profile_image_url}
                    className="w-28 h-28 rounded-full"
                  />
                </View>
                <Text className="text-primary font-poppins-semibold text-lg mt-1">
                  {selectedRider?.full_name}
                </Text>

                <View className="flex-row gap-1 items-center mt-1">
                  <MaterialCommunityIcons
                    name="office-building"
                    color={"gray"}
                    size={14}
                  />
                  <Text className="text-muted font-poppins text-sm text-center">
                    {selectedRider?.business_name}
                  </Text>
                </View>
                <View className="flex-row gap-1">
                  <Feather name="map-pin" color={"gray"} size={14} />
                  <Text className="text-muted font-poppins text-sm text-center">
                    {selectedRider?.business_address}
                  </Text>
                </View>
              </View>

              <HDivider />

              <View className="flex-row my-4 justify-between w-[80%] self-center">
                <View className="items-center">
                  <Text className="text-xl font-poppins-bold text-primary">
                    {selectedRider?.total_deliveries}
                  </Text>
                  <Text className="font-poppins-light text-muted text-sm">
                    Trips
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-xl font-poppins-bold text-primary">
                    {selectedRider?.average_rating}
                  </Text>
                  <Text className="font-poppins-light text-muted text-sm">
                    Rating
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-xl font-poppins-bold text-primary">
                    {selectedRider?.bike_number?.toUpperCase()}
                  </Text>
                  <Text className="font-poppins-light text-muted text-sm">
                    Bike Number
                  </Text>
                </View>
              </View>

              <View className="bg-background mb-3">
                <AppButton
                  width={"70%"}
                  borderRadius={50}
                  color="primary"
                  text="Book Rider"
                  onPress={handleBookRider}
                />
              </View>
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

export default RidersScreen;
