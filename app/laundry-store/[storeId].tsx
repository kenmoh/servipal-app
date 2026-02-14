import { fetchVendorLaundryItems } from "@/api/laundry";
import CartInfoBtn from "@/components/CartInfoBtn";
import EmptyList from "@/components/EmptyList";
import FAB from "@/components/FAB";
import LaundryCard from "@/components/LaundryCard";
import LoadingIndicator from "@/components/LoadingIndicator";
import StoreHeader from "@/components/StoreHeader";
import { useCartStore } from "@/store/cartStore";
import { useUserStore } from "@/store/userStore";
import { LaundryItemResponse } from "@/types/item-types";
import { AntDesign } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import { View } from "react-native";

const LaundryStore = () => {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { user } = useUserStore();
  const { cart, addItem, totalCost, removeItem } = useCartStore();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["laundryItems", storeId],
    queryFn: () => fetchVendorLaundryItems(storeId!),
    enabled: !!storeId,
  });

  const handleAddToCart = useCallback(
    (item: LaundryItemResponse) => {
      const isChecked = cart.order_items.some(
        (cartItem) => cartItem.item_id === item.id,
      );

      if (isChecked) {
        removeItem(item.id);
        const next = new Set(checkedItems);
        next.delete(item.id);
        setCheckedItems(next);
      } else {
        addItem(storeId!, item.id, 1, {
          name: item.name,
          price: item.price,
          image: item.images[0] || "",
          laundry_type: item.laundry_type,
        });

        const next = new Set(checkedItems);
        next.add(item.id);
        setCheckedItems(next);
      }
    },
    [cart.order_items, addItem, removeItem, checkedItems],
  );

  const renderItem = ({ item }: { item: LaundryItemResponse }) => (
    <LaundryCard item={item} onPress={handleAddToCart} />
  );

  if (isFetching && !data) return <LoadingIndicator />;

  return (
    <View className="flex-1 bg-background">
      <FlashList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<StoreHeader storeId={storeId!} />}
        ListEmptyComponent={
          <EmptyList
            title="No Services"
            description="This laundry store hasn't added any services yet."
          />
        }
        onRefresh={refetch}
        refreshing={isFetching}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {user?.user_metadata.user_type === "LAUNDRY_VENDOR" &&
        user?.id === storeId && (
          <View className="absolute bottom-12 right-3">
            <FAB
              icon={<AntDesign name="plus" color={"white"} size={24} />}
              onPress={() => router.push("/laundry-store/add-item")}
            />
          </View>
        )}

      {totalCost > 0 && (
        <CartInfoBtn
          orderType="LAUNDRY"
          totalItem={cart.order_items.length}
          onPress={() => router.push("/cart")}
        />
      )}
    </View>
  );
};

export default LaundryStore;
