import { fetchUserOrders } from "@/api/order";
import ErrorBoundary from "@/components/ErrorBoundary";
import FoodLaundryOrderCard from "@/components/food-laundry-order-card";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import StatCard from "@/components/StatCard";
import { useUserStore } from "@/store/userStore";
import { UnifiedOrderResponse } from "@/types/order-types";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useMemo } from "react";
import { useColorScheme, View } from "react-native";

const UserOrders = () => {
  const { user } = useUserStore();
  const theme = useColorScheme();

  const {
    data: orders,
    isLoading,
    refetch,
    isFetching,
    isPending,
  } = useQuery({
    queryKey: ["user-orders", user?.id],
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
        data?.filter(
          (order) =>
            order.order_status === "PENDING" ||
            order.order_status === "PREPARING",
        ).length || 0,
      pickedUp:
        data?.filter((order) => order.order_status === "IN_TRANSIT").length ||
        0,
      completed:
        data?.filter((order) => order.order_status === "COMPLETED").length || 0,
      delivered:
        data?.filter((order) => order.order_status === "DELIVERED").length || 0,
      packageOrders: data?.length || 0,
    }),
    [data],
  );

  const statItems = useMemo(() => {
    return [
      {
        id: "total",
        icon: <FontAwesome5 name="coins" color="gray" size={24} />,
        label: "Total Orders",
        value: data?.length || 0,
      },
      {
        id: "pickedUp",
        icon: <FontAwesome name="handshake-o" color="blue" size={24} />,
        label: "Picked Up",
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
  }, [data?.length, stats.completed, stats.pickedUp, stats.delivered]);

  const renderItem = useCallback(
    ({ item }: { item: UnifiedOrderResponse }) => (
      <FoodLaundryOrderCard order={item} />
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

  if (isLoading || isPending) return <LoadingIndicator />;

  return (
    <ErrorBoundary>
      <View className="bg-background flex-1 px-2">
        <FlashList
          data={data}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          refreshing={isFetching}
          onRefresh={refetch}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ErrorBoundary>
  );
};

export default UserOrders;
