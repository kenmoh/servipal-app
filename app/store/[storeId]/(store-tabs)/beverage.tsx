import EmptyList from "@/components/EmptyList";
import FoodCard from "@/components/FoodCard";
import ItemCustomizationSheet from "@/components/ItemCustomizationSheet";
import { useCartStore } from "@/store/cartStore";
import { RestaurantMenuItemResponse } from "@/types/item-types";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useGlobalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { View } from "react-native";

import { fetchVendorMenuItems } from "@/api/food";
import { useUserStore } from "@/store/userStore";

const DrinkMenu = () => {
  const { storeId } = useGlobalSearchParams<{ storeId: string }>();
  const { profile } = useUserStore();
  const { addItem, removeItem } = useCartStore();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] =
    useState<RestaurantMenuItemResponse | null>(null);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["drinkMenutItems", storeId],
    queryFn: () => fetchVendorMenuItems(storeId!, "DRINK"),
    enabled: !!storeId,
  });

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
      selectedSize: string,
      selectedSides: string[],
    ) => {
      addItem(storeId as string, item.id, 1, {
        name: item.name,
        price: Number(item.price),
        image: item.images[0] || "",
        selected_sizes: selectedSize,
        selected_sides: selectedSides,
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
          data={data ?? []}
          keyExtractor={(item) => item?.id}
          renderItem={({ item }: { item: RestaurantMenuItemResponse }) => (
            <FoodCard item={item} onPress={() => handleAddToCart(item)} />
          )}
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

      <ItemCustomizationSheet
        ref={bottomSheetRef}
        item={selectedItem}
        onAdd={handleCustomAdd}
      />
    </View>
  );
};

export default DrinkMenu;
