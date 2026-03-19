import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
  INPUT_BG_LIGHT,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
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
import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Text,
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
    paymentStatus: "successful" | "cancelled" | "PAID" | "success";
  }>();

  const theme = useColorScheme();

  const HANDLE_INDICATOR_STYLE =
    theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK;
  const HANDLE_STYLE = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const BG_COLOR = theme === "dark" ? "#181818" : INPUT_BG_LIGHT;

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
      !!txRef &&
      (paymentStatus === "successful" ||
        paymentStatus === "PAID" ||
        paymentStatus === "success"),
    refetchInterval: (query) => {
      if (query.state.data) return false;
      return 1000;
    },
    refetchIntervalInBackground: true,
  });

  const handleRiderPress = useCallback(
    (rider: RiderResponse) => {
      const isPaid =
        paymentStatus === "successful" ||
        paymentStatus === "PAID" ||
        paymentStatus === "success";

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
      bottomSheetRef.current?.snapToIndex(1);
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
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["riders", user?.id],
    queryFn: ({ pageParam = 0 }) => getNearbyRiders({ page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return (
          lastPage.pagination.page_offset / lastPage.pagination.page_size + 1
        );
      }
      return undefined;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  const ridersList = data?.pages.flatMap((page) => page.riders) || [];

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
          Sentry.addBreadcrumb({
            category: "realtime",
            message: `Rider changed: ${payload.eventType}`,
            level: "info",
          });
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
    return (
      <RefreshButton onPress={() => refetch()} label="Error loading riders" />
    );
  }

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

      <FlashList
        data={ridersList}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshing={isFetching && !isFetchingNextPage}
        onRefresh={handleRefresh}
        onLayout={handleLayoutComplete}
        onScroll={handleScrollToHide}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#aaa" />
            </View>
          ) : null
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      />

      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={["85%", "100%"]}
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
        <BottomSheetView style={{ flex: 1, backgroundColor: BG_COLOR }}>
          {selectedRider && (
            <View
              className="px-6 pt-4 flex-1 bg-slate-100 dark:bg-slate-800"
              style={{ backgroundColor: BG_COLOR }}
            >
              <View className="flex-row items-end gap-4 mb-4">
                <View className="p-1 bg-background rounded-full">
                  <Image
                    source={{ uri: selectedRider?.profile_image_url }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      borderWidth: 2,
                      borderColor: "#f97316",
                    }}
                  />
                </View>
                <View className="pb-1 flex-1">
                  <Text
                    className="text-primary font-poppins-bold text-xl"
                    numberOfLines={1}
                  >
                    {selectedRider?.full_name}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    <MaterialCommunityIcons
                      name="certificate"
                      color="#f97316"
                      size={16}
                    />
                    <Text className="text-orange-500 font-poppins-semibold text-xs">
                      Verified Rider
                    </Text>
                  </View>
                </View>
              </View>

              <View className="space-y-4 gap-4">
                {/* Business Info Section */}
                <View className="bg-slate-500/10 p-4 rounded-2xl gap-2">
                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-orange-500/20 items-center justify-center">
                      <MaterialCommunityIcons
                        name="office-building"
                        color="#f97316"
                        size={18}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-muted font-poppins-light text-[10px] uppercase tracking-wider">
                        Business
                      </Text>
                      <Text className="text-primary font-poppins-semibold text-sm">
                        {selectedRider?.business_name}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-3">
                    <View className="w-8 h-8 rounded-full bg-blue-500/20 items-center justify-center">
                      <Feather name="map-pin" color="#3b82f6" size={16} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-muted font-poppins-light text-[10px] uppercase tracking-wider">
                        Address
                      </Text>
                      <Text
                        className="text-primary font-poppins text-xs"
                        numberOfLines={1}
                      >
                        {selectedRider?.business_address}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Stats Section */}
                <View className="flex-row justify-between bg-white/5 p-2 rounded-2xl border border-slate-500/10">
                  <View className="items-center flex-1">
                    <MaterialCommunityIcons
                      name="truck-delivery-outline"
                      size={20}
                      color="#94a3b8"
                    />
                    <Text className="text-primary font-poppins-bold text-base mt-1">
                      {selectedRider?.total_deliveries || 0}
                    </Text>
                    <Text className="text-muted font-poppins-light text-[10px] uppercase">
                      Trips
                    </Text>
                  </View>

                  <View
                    style={{
                      width: 1,
                      height: 24,
                      backgroundColor: "#e2e8f0",
                      alignSelf: "center",
                    }}
                  />

                  <View className="items-center flex-1">
                    <MaterialCommunityIcons
                      name="star-outline"
                      size={20}
                      color="#94a3b8"
                    />
                    <Text className="text-primary font-poppins-bold text-base mt-1">
                      {selectedRider?.reviews?.stats?.average_rating?.toFixed(
                        1,
                      ) || "0.0"}
                    </Text>
                    <Text className="text-muted font-poppins-light text-[10px] uppercase">
                      Rating
                    </Text>
                  </View>

                  <View
                    style={{
                      width: 1,
                      height: 24,
                      backgroundColor: "#e2e8f0",
                      alignSelf: "center",
                    }}
                  />

                  <View className="items-center flex-1">
                    <MaterialCommunityIcons
                      name="bike"
                      size={20}
                      color="#94a3b8"
                    />
                    <Text className="text-primary font-poppins-bold text-base mt-1">
                      {selectedRider?.bike_number?.toUpperCase() || "N/A"}
                    </Text>
                    <Text className="text-muted font-poppins-light text-[10px] uppercase">
                      Bike
                    </Text>
                  </View>
                </View>

                {/* Action Section */}
                <View className="mt-4 mb-2 items-center">
                  <AppButton
                    width={"100%"}
                    borderRadius={50}
                    backgroundColor={
                      getDeliveryButtonConfig("PENDING", "CUSTOMER")?.primary
                        ?.backgroundColor || "bg-button-primary"
                    }
                    color={
                      getDeliveryButtonConfig("PENDING", "CUSTOMER")?.primary
                        ?.color || "orange"
                    }
                    text={
                      getDeliveryButtonConfig("PENDING", "CUSTOMER")?.primary
                        ?.text || "Book Rider"
                    }
                    variant="fill"
                    onPress={handleBookRider}
                  />
                </View>
              </View>
            </View>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

export default RidersScreen;
