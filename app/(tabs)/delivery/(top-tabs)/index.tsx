import { getUserDeliveryOrders } from "@/api/delivery";
import DeliveryCard from "@/components/DeliveryCard";
import EmptyList from "@/components/EmptyList";
import ErrorBoundary from "@/components/ErrorBoundary";
import FAB from "@/components/FAB";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import StatCard from "@/components/StatCard";
import { useVerifiedNavigation } from "@/hooks/use-verification";
import { useUserStore } from "@/store/userStore";
import { DeliveryOrder } from "@/types/delivey-types";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery } from "@tanstack/react-query";

import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, View } from "react-native";

const DeliveryScreen = () => {
  const { user } = useUserStore();
  const { navigateTo } = useVerifiedNavigation();
  const {
    data: allData,
    isLoading,
    refetch,
    isFetching,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["delivery-orders", user?.id],
    queryFn: ({ pageParam = 0 }) =>
      getUserDeliveryOrders({ offset: pageParam as number }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.has_more) {
        return lastPage.pagination.page_offset + lastPage.pagination.page_size;
      }
      return undefined;
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 3,
  });

  const data = useMemo(() => {
    return allData?.pages.flatMap((page) => page.orders) || [];
  }, [allData]);

  const stats = useMemo(
    () => ({
      pending:
        data?.filter(
          (order) =>
            order.delivery_status === "PENDING" ||
            order.delivery_status === "PAID_NEEDS_RIDER",
        ).length || 0,
      pickedUp:
        data?.filter((order) => order.delivery_status === "PICKED_UP").length ||
        0,
      completed:
        data?.filter((order) => order.delivery_status === "COMPLETED").length ||
        0,
      delivered:
        data?.filter((order) => order.delivery_status === "DELIVERED").length ||
        0,
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
    ({ item }: { item: DeliveryOrder }) => <DeliveryCard order={item} />,
    [],
  );

  const keyExtractor = useCallback((item: DeliveryOrder) => item?.id!, []);

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
          refreshing={isFetching && !isFetchingNextPage}
          onRefresh={refetch}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          ListEmptyComponent={()=><EmptyList 
  title="No deliveries yet" 
  description="Send packages quickly and safely to anywhere with our reliable dispatch service. Press the + button below to get started."
/>
}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() =>
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#aaa" />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
        />
        {["CUSTOMER", "RESTAURANT_VENDOR", "LAUNDRY_VENDOR"].includes(
          user?.user_metadata?.user_type!,
        ) && <FAB onPress={() => navigateTo("/send-package")} />}
      </View>
    </ErrorBoundary>
  );
};

export default DeliveryScreen;
