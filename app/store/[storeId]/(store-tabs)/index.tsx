import { fetchVendorMenuItems } from "@/api/food";
import CartInfoBtn from "@/components/CartInfoBtn";
import EmptyList from "@/components/EmptyList";
import FoodCard from "@/components/FoodCard";
import ItemCustomizationSheet from "@/components/ItemCustomizationSheet";
import { useCartStore } from "@/store/cartStore";
import { useUserStore } from "@/store/userStore";
import { RestaurantMenuItemResponse, SizeOption } from "@/types/item-types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";

interface GroupedItem {
  type: "header" | "item";
  title?: string;
  item?: RestaurantMenuItemResponse;
}

const FoodMenu = () => {
  const { storeId } = useLocalSearchParams<{ storeId: string }>();
  const { user } = useUserStore();
  const { profile } = useUserStore();
  const { cart, addItem, totalCost, removeItem } = useCartStore();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] =
    useState<RestaurantMenuItemResponse | null>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["foodMenutItems", storeId],
    queryFn: () => fetchVendorMenuItems(storeId!, "FOOD"),
    enabled: !!storeId,
  });

  const groupedData = useMemo(() => {
    if (!data) return [];

    const groups: { [key: string]: RestaurantMenuItemResponse[] } = {};

    data.forEach((item) => {
      const categoryName = (item as any).category?.name || "Other";
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(item);
    });

    const flattened: GroupedItem[] = [];
    Object.keys(groups).forEach((category) => {
      flattened.push({ type: "header", title: category });
      groups[category].forEach((item) => {
        flattened.push({ type: "item", item });
      });
    });

    return flattened;
  }, [data]);

  const handleAddToCart = useCallback(
    (item: RestaurantMenuItemResponse) => {
      const hasOptions =
        (item.sides && item.sides.length > 0) ||
        (item.sizes && item.sizes.length > 0);

      if (checkedItems.has(item.id)) {
        removeItem(item.id);
        setCheckedItems((prev) => {
          const newChecked = new Set(prev);
          newChecked.delete(item.id);
          return newChecked;
        });
      } else {
        if (hasOptions) {
          setSelectedItem(item);
          bottomSheetRef.current?.present();
        } else {
          addItem(storeId as string, item.id, 1, {
            name: item.name,
            price: Number(item.price),
            image: item.images[0] || "",
          });
          setCheckedItems((prev) => {
            const newChecked = new Set(prev);
            newChecked.add(item.id);
            return newChecked;
          });
        }
      }
    },
    [addItem, removeItem, profile?.id, checkedItems],
  );

  const handleCustomAdd = useCallback(
    (
      item: RestaurantMenuItemResponse,
      selectedSize: SizeOption | null,
      selectedSide: string,
    ) => {
      // Use the selected size's price if available, otherwise use base price
      const finalPrice = selectedSize?.price ?? Number(item.price);

      addItem(storeId as string, item.id, 1, {
        name: item.name,
        price: finalPrice,
        image: item.images[0] || "",
        selected_size: selectedSize || undefined,
        selected_side: selectedSide,
      });

      setCheckedItems((prev) => {
        const newChecked = new Set(prev);
        newChecked.add(item.id);
        return newChecked;
      });

      bottomSheetRef.current?.dismiss();
    },
    [addItem, profile?.id],
  );

  return (
    <View className="flex-1 bg-background p-2">
      <View className="flex-1">
        <FlashList
          data={groupedData}
          keyExtractor={(item, index) =>
            item.type === "header" ? `header-${index}` : item.item!.id
          }
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View className="py-4 px-2 bg-background">
                  <Text className="text-lg font-poppins-bold text-primary">
                    {item.title}
                  </Text>
                </View>
              );
            }
            return (
              <FoodCard
                item={item.item!}
                onPress={() => handleAddToCart(item.item!)}
              />
            );
          }}
          getItemType={(item) => item.type}
          ListEmptyComponent={
            !isFetching ? (
              <EmptyList
                title="No Menu Items"
                description="Add your first menu item to start selling. Click the button below"
                buttonTitle="Add Menu"
                route="/store/add-menu"
              />
            ) : null
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshing={isFetching}
          onRefresh={refetch}
        />
      </View>
      <CartInfoBtn
        orderType="FOOD"
        totalItem={cart.order_items.length}
        onPress={() => router.push("/cart")}
      />

      <ItemCustomizationSheet
        ref={bottomSheetRef}
        item={selectedItem}
        onAdd={handleCustomAdd}
      />
    </View>
  );
};

export default FoodMenu;
