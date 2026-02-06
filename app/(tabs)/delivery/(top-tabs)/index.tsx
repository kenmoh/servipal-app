import { getUserDeliveryOrders } from "@/api/delivery";
import DeliveryCard from "@/components/DeliveryCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import FAB from "@/components/FAB";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useUserStore } from "@/store/userStore";
import { DeliveryOrder } from "@/types/delivey-types";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { ReactNode, useCallback, useMemo } from "react";
import { Text, useColorScheme, View } from "react-native";

const UserOrders = () => {
  const { user } = useUserStore();
  const theme = useColorScheme();

  const {
    data: allData,
    isLoading,
    error,
    refetch,
    isFetching,
    isPending,
  } = useQuery({
    queryKey: ["user-orders", user?.id],
    queryFn: () => getUserDeliveryOrders(),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const data = useMemo(() => {
    return allData || [];
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

  const ITEM_HEIGHT = 200;

  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

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
                theme={theme}
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
        <FAB onPress={() => router.push("/send-package")} />
      </View>
    </ErrorBoundary>
  );
};

export default UserOrders;

const StatCard = React.memo(
  ({
    icon,
    label,
    value,
    theme,
  }: {
    icon: ReactNode;
    label: string;
    value: number;
    theme: any;
  }) => {
    return (
      <View className="bg-input mx-1 items-center justify-evenly py-2 h-[90px] w-[100px] rounded-lg border border-border-subtle">
        {icon}
        <Text
          className="text-primary"
          style={{
            fontSize: 20,
            fontWeight: "500",
          }}
        >
          {value}
        </Text>
        <Text
          style={{ fontSize: 12, color: theme === "dark" ? "#888" : "#555" }}
        >
          {label}
        </Text>
      </View>
    );
  },
);

StatCard.displayName = "StatCard";
