import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { getDeliveryOrderByTxRef, updateDeliveryStatus } from "@/api/delivery";
import { getNearbyRiders } from "@/api/user";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import RefreshButton from "@/components/RefreshButton";
import Rider from "@/components/Rider";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import {
  HEADER_BG_DARK,
  HEADER_BG_LIGHT,
  INPUT_BG_DARK,
  INPUT_BG_LIGHT,
} from "@/constants/theme";
import { useOrderStore } from "@/store/orderStore";
import { useRiderStore } from "@/store/rider-store";
import { useUserStore } from "@/store/userStore";
import { RiderResponse } from "@/types/user-types";
import { getDeliveryButtonConfig } from "@/utils/deliveryButtonConfig";
import { supabase } from "@/utils/supabase";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import * as Sentry from "@sentry/react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
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
  const [isLayoutComplete, setIsLayoutComplete] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { showError, showSuccess, showInfo } = useToast();
  const { txRef, paymentStatus } = useLocalSearchParams<{
    txRef: string;
    paymentStatus: "successful" | "cancelled" | "PAID";
  }>();

  const theme = useColorScheme();

  const HANDLE_INDICATOR_STYLE =
    theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK;
  const HANDLE_STYLE = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const BG_COLOR = theme === "dark" ? INPUT_BG_DARK : INPUT_BG_LIGHT;

  const queryClient = useQueryClient();

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const listRef = useRef<FlatList>(null);
  const ITEM_HEIGHT = 138;

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  // Poll for order existence
  const { data: order, isLoading: isCheckingOrder } = useQuery({
    queryKey: ["check-order", txRef],
    queryFn: async () => {
      if (!txRef) return;
      const order = await getDeliveryOrderByTxRef(txRef);
      return order;
    },
    enabled:
      !!txRef && (paymentStatus === "successful" || paymentStatus === "PAID"),
    refetchInterval: (query) => {
      if (query.state.data) return false;
      return 1000;
    },
    refetchIntervalInBackground: true,
  });

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

      if (!order && isCheckingOrder) {
        showInfo("Processing", "Please wait while we confirm your order...");
        return;
      }

      if (!order && !isCheckingOrder) {
        showError("Error", "Order not found. Please contact support.");
        return;
      }

      setSelectedRider(rider);
      bottomSheetRef.current?.snapToIndex(0);
    },
    [txRef, paymentStatus, order, isCheckingOrder],
  );

  const handleScrollToHide = useCallback(() => {
    const { newRiderCount, clearNewRiders } = useRiderStore.getState();
    if (newRiderCount > 0) {
      clearNewRiders();
    }
  }, []);

  const transactionRef = txRef ? txRef : order?.tx_ref;

  const assignRiderMutation = useMutation({
    mutationFn: () =>
      updateDeliveryStatus(
        transactionRef!,
        "ASSIGNED",
        selectedRider?.id!,
        undefined,
      ),
    onError: (error) => {
      showError("Error", error.message || "An unexpected error occurred!");
      refetch();
    },
    onSuccess: async () => {
      showSuccess("Success", "Rider assigned successfully!");
      refetch();
      await queryClient.invalidateQueries({
        queryKey: ["delivery-orders", user?.id],
      });
      // Navigate to tracking or home
      router.replace("/(tabs)/delivery/(top-tabs)");
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

  useEffect(() => {
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email });
      Sentry.setTag("user_type", user.user_metadata.user_type);
    }
  }, [user]);

  // ============ FETCH RIDERS ============
  const {
    data: riders,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["riders", user?.id],
    queryFn: async () => getNearbyRiders(),
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

  if (isLoading) {
    return <LoadingIndicator />;
  }

  if (error) {
    return <RefreshButton onPress={refetch} label="Error loading riders" />;
  }

  console.log(riders);
  return (
    <View className="bg-background flex-1 p-2 gap-2">
      {!order && isCheckingOrder && (
        <View className="bg-background flex-1 items-center justify-center gap-2">
          <ActivityIndicator size="large" color="white" />
          <Text className="text-primary font-poppins-medium text-sm">
            Processing your order...
          </Text>
        </View>
      )}
      <HDivider />

      <FlatList
        ref={listRef}
        data={riders?.riders || []}
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
        snapPoints={[400, "55%"]}
        index={-1}
        enablePanDownToClose={true}
        handleIndicatorStyle={{ backgroundColor: HANDLE_INDICATOR_STYLE }}
        handleStyle={{ backgroundColor: BG_COLOR, borderRadius: 100 }}
        backgroundStyle={{
          backgroundColor: BG_COLOR,
          shadowColor: "orange",
        }}
        onChange={(index: number) => setIsSheetOpen(index >= 0)}
      >
        <BottomSheetView style={{ flex: 1 }} className="bg-input">
          {selectedRider && (
            <>
              <View className="p-4 items-center flex-1 bg-input">
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

              <View className="flex-row my-4 justify-between items-center">
                <View className="items-center flex-1">
                  <Text className="text-md font-poppins-bold text-primary">
                    {selectedRider?.total_deliveries || 0}
                  </Text>
                  <Text className="font-poppins-light text-muted text-sm">
                    Trips
                  </Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-md font-poppins-bold text-primary">
                    {selectedRider?.reviews.stats.average_rating}
                  </Text>
                  <Text className="font-poppins-light text-muted text-sm">
                    Rating
                  </Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-md font-poppins-bold text-primary">
                    {selectedRider?.bike_number?.toUpperCase()}
                  </Text>
                  <Text className="font-poppins-light text-muted text-sm">
                    Bike Number
                  </Text>
                </View>
              </View>

              <View className="bg-input mb-3 items-center w-[80%] mx-auto">
                <AppButton
                  width={"70%"}
                  borderRadius={50}
                  backgroundColor={
                    getDeliveryButtonConfig("PENDING", "SENDER")?.primary
                      ?.color || "orange"
                  }
                  text={
                    getDeliveryButtonConfig("PENDING", "SENDER")?.primary
                      ?.text || "Book Rider"
                  }
                  variant="fill"
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
