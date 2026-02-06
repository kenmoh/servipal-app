import { getUserProducts } from "@/api/product";
import EmptyList from "@/components/EmptyList";
import FAB from "@/components/FAB";
import LoadingIndicator from "@/components/LoadingIndicator";
import ProductItemCard from "@/components/ProductItemCard";
import { useUserStore } from "@/store/userStore";
import Feather from "@expo/vector-icons/Feather";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";

const items = () => {
  const { user } = useUserStore();

  const { data, isLoading, isPending, isFetching, refetch } = useQuery({
    queryKey: ["user-products", user?.id],
    queryFn: () => getUserProducts(),

    enabled: !!user?.id,
  });

  console.log(data);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading || isPending) {
    return <LoadingIndicator />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyList
        title="No Products Found"
        description="You haven't added any products yet. Add your first product to start selling!"
        buttonTitle="Add Product"
        route="/product-detail/add-product"
      />
    );
  }
  console.log("RENDERING MARKETPLACE ITEMS");

  return (
    <View className="flex-1 bg-background">
      <View>
        <Text className="text-muted font-poppins-semibold text-lg  mx-5 my-3">
          Total Items: {data.length}
        </Text>
      </View>
      <FlashList
        data={data || []}
        keyExtractor={(item) => item?.id}
        renderItem={({ item }) => <ProductItemCard item={item} />}
        refreshing={isFetching}
        onRefresh={handleRefresh}
      />
      <FAB
        icon={<Feather name="plus" size={24} color={"white"} />}
        onPress={() => router.push("/product-detail/add-product")}
      />
    </View>
  );
};

export default items;

const styles = StyleSheet.create({});
