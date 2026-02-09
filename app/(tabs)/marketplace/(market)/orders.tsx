import { fetUserOrders } from "@/api/marketplace";
import EmptyList from "@/components/EmptyList";
import LoadingIndicator from "@/components/LoadingIndicator";
import ProductOrderCard from "@/components/ProductOrderCard";
import StatCard from "@/components/StatCard";

import { useUserStore } from "@/store/userStore";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";

import React, { useCallback, useMemo } from "react";
import { ScrollView, View } from "react-native";

const orders = () => {
  const { user } = useUserStore();

  const { data, isLoading, isPending, refetch, isFetching, isFetched } =
    useQuery({
      queryKey: ["products", user?.id],
      queryFn: () => fetUserOrders(user?.id as string),
      enabled: !!user?.id,
    });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, []),
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const stats = useMemo(
    () => ({
      pending:
        data?.filter((order) => order?.order_status === "pending").length || 0,

      received:
        data?.filter((order) => order.order_status === "received").length || 0,
      delivered:
        data?.filter((order) => order?.order_status === "delivered").length ||
        0,
      cancelled:
        data?.filter((order) => order?.order_status === "cancelled").length ||
        0,
    }),
    [data],
  );

  if (isFetched && data?.length === 0) {
    return (
      <EmptyList
        title="No Products Found"
        description="You haven't added any products yet. Add your first product to get started!"
        buttonTitle="Add Product"
        route="/product-detail/add-product"
      />
    );
  }
  const HeaderStatCard = () => {
    return (
      <View className="my-2 bg-background items-center justify-center h-[110px]">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 10,
            paddingVertical: 10,
            height: "100%",
          }}
        >
          <StatCard
            icon=<FontAwesome5 name="coins" color="gray" size={24} />
            label="Total Orders"
            value={data?.length || 0}
          />
          <StatCard
            icon=<FontAwesome name="handshake-o" color="blue" size={24} />
            label="Completed"
            value={stats.received}
          />
          <StatCard
            icon=<MaterialCommunityIcons
              name="package"
              color="lightblue"
              size={24}
            />
            label="Pending"
            value={stats.pending}
          />
          <StatCard
            icon=<Feather name="check" color="green" size={24} />
            label="Cancelled"
            value={stats.cancelled}
          />
        </ScrollView>
      </View>
    );
  };

  if (isLoading || isPending || isFetching) {
    return <LoadingIndicator />;
  }

  return (
    <View className="flex-1 bg-background">
      <FlashList
        data={data}
        renderItem={({ item }) => <ProductOrderCard data={item} />}
        keyExtractor={(item) => item.id}
        refreshing={isFetching}
        onRefresh={handleRefresh}
        ListHeaderComponent={<HeaderStatCard />}
      />
    </View>
  );
};

export default orders;
