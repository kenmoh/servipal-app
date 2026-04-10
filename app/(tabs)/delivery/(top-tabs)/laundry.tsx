import { fetchUserOrders } from "@/api/order";
import EmptyList from "@/components/EmptyList";
import ErrorBoundary from "@/components/ErrorBoundary";
import FoodLaundryOrderCard from "@/components/food-laundry-order-card";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import StatCard from "@/components/StatCard";
import { useUserStore } from "@/store/userStore";
import { UnifiedOrderResponse } from "@/types/order-types";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "expo-router";

import React, { useCallback, useEffect, useMemo } from "react";
import { View } from "react-native";
import { useTrack } from "@/hooks/use-events";

const LaundryOrdersScreen = () => {
  const { user } = useUserStore();
  const { track } = useTrack();
  const pathName = usePathname();

  const {
    data: orders,
    isLoading,
    refetch,
    isFetching,
    isPending,
  } = useQuery({
    queryKey: ["laundry-orders", user?.id],
    queryFn: () => fetchUserOrders(user?.id!, "LAUNDRY"),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const data = useMemo(() => {
    return orders || [];
  }, [orders]);

  const stats = useMemo(
    () => ({
      pending:
        orders?.orders?.filter(
          (order) =>
            order.order_status === "PENDING" ||
            order.order_status === "PREPARING",
        ).length || 0,
      pickedUp:
        orders?.orders?.filter((order) => order.order_status === "IN_TRANSIT")
          .length || 0,
      completed:
        orders?.orders?.filter((order) => order.order_status === "COMPLETED")
          .length || 0,
      delivered:
        orders?.orders?.filter((order) => order.order_status === "DELIVERED")
          .length || 0,
      packageOrders: orders?.orders?.length || 0,
    }),
    [orders?.orders],
  );

  const statItems = useMemo(() => {
    return [
      {
        id: "total",
        icon: <FontAwesome5 name="coins" color="gray" size={24} />,
        label: "Total Orders",
        value: orders?.orders?.length || 0,
      },
      {
        id: "pickedUp",
        icon: (
          <MaterialCommunityIcons
            name="washing-machine"
            color="blue"
            size={24}
          />
        ),
        label: "Washing",
        value: stats.pickedUp,
      },
      {
        id: "delivered",
        icon: (
          <MaterialCommunityIcons name="package" color="lightblue" size={24} />
        ),
        label: "Delivered",
        value: stats.delivered,
      },
      {
        id: "completed",
        icon: <Feather name="check" color="green" size={24} />,
        label: "Completed",
        value: stats.completed,
      },
    ];
  }, [
    orders?.orders?.length,
    stats.completed,
    stats.pickedUp,
    stats.delivered,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: UnifiedOrderResponse }) => (
      <FoodLaundryOrderCard order={item} orderType="LAUNDRY" />
    ),
    [],
  );

  const keyExtractor = useCallback(
    (item: UnifiedOrderResponse) => item?.id!,
    [],
  );

  const ITEM_HEIGHT = 200;

  const renderHeader = useCallback(
    () => (
      <View className="bg-background">
        <View className="mt-2 bg-background items-center justify-center h-[110px]">
          <FlashList
            data={statItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <StatCard
                icon={item.icon}
                label={item.label}
                value={item.value}
              />
            )}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 10,
              paddingVertical: 10,
            }}
          />
        </View>
        <HDivider width="100%" />
        <View className="mb-2" />
      </View>
    ),
    [statItems],
  );

  useEffect(() => {
    track("laundry_tab_viewed", {
      user_type: user?.user_metadata.user_type!,
      screen: pathName,
    });
  }, [track, user, pathName]);

  if (isLoading || isPending) return <LoadingIndicator />;

  return (
    <ErrorBoundary>
      <View className="bg-background flex-1 px-2">
        <FlashList
          data={orders?.orders || []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={() => (
            <EmptyList
              title="No laundry orders yet"
              description="Find trusted laundry services near you and get your clothes cleaned with ease"
            />
          )}
          refreshing={isFetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ErrorBoundary>
  );
};

export default LaundryOrdersScreen;
