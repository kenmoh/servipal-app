import { softDeleteFoodItem } from "@/api/food";
import { useCartStore } from "@/store/cartStore";
import { useUserStore } from "@/store/userStore";
import { RestaurantMenuItemResponse } from "@/types/item-types";

import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Checkbox from "expo-checkbox";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useToast } from "./ToastProvider";

const FoodCard = ({
  item,
  onPress,
}: {
  item: RestaurantMenuItemResponse;
  onPress: (item: RestaurantMenuItemResponse) => void;
}) => {
  const { user } = useUserStore();
  const { showError, showSuccess } = useToast();
  const cartItems = useCartStore((state) => state.cart.order_items);
  const queryClient = useQueryClient();
  // Check if item exists in cart
  const isChecked = cartItems.some((cartItem) => cartItem.item_id === item.id);

  const isOwner =
    // Remember to reverser this
    user?.user_metadata.user_type === "RESTAURANT_VENDOR" &&
    user?.id === item.vendor_id;

  const deleteMutation = useMutation({
    mutationFn: () => softDeleteFoodItem(item?.id!),
    onSuccess: () => {
      showSuccess("Deleted", `${item.name} deleted successfully.`);
      queryClient.invalidateQueries({
        queryKey: ["restaurantItems", user?.id],
      });
    },
    onError: (error: any) => {
      Alert.alert(
        "Failed to delete",
        error.message || `Failed to delete ${item.name}. Please try again.`,
      );
    },
  });

  const openDialog = () => {
    Alert.alert("Warning", `Are you sure you want to delete ${item.name}`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "OK",
        onPress: () => {
          deleteMutation.mutate();
        },
      },
    ]);
  };

  return (
    <TouchableOpacity
      disabled={isOwner}
      onPress={() => onPress(item)}
      className="my-1 p-2 bg-input rounded-md w-[95%] self-center"
    >
      {/* Edit/Delete buttons for owner */}
      {isOwner && (
        <View className="flex-row absolute top-3 right-3 gap-5 z-10">
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/store/add-menu",
                params: {
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  images: JSON.stringify(item.images),
                  item_type: item.restaurant_item_type,
                },
              })
            }
            hitSlop={10}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.5 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <Ionicons name="create-outline" color="gray" size={18} />
          </Pressable>
        </View>
      )}
      <View className="flex-row gap-4">
        <View className="w-20 h-20 overflow-hidden rounded-lg">
          <Image
            source={{ uri: item?.images[0] }}
            style={{
              height: "100%",
              width: "100%",
            }}
          />
        </View>
        <View className="w-[70%]">
          <Text className="text-primary tracking-tight font-poppins-medium text-sm">
            {item.name}
          </Text>
          <Text className="text-wrap mt-1 text-muted text-sm flex-wrap">
            {item.description}
          </Text>
          <Text className="mt-2 text-sm font-poppins-bold text-primary">
            ₦{Number(item.price).toFixed(2)}
          </Text>
        </View>
      </View>

      {isOwner ? (
        <View className="flex-row absolute right-2 bottom-2">
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/store/add-menu",
                params: {
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  images: JSON.stringify(item.images),
                  item_type: item.restaurant_item_type,
                },
              })
            }
            hitSlop={10}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.5 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <Ionicons name="create-outline" color="gray" size={18} />
          </Pressable>
        </View>
      ) : (
        <Checkbox
          style={{ borderWidth: 1, height: 18, width: 18, borderRadius: 3 }}
          className="absolute right-2 bottom-2"
          value={isChecked}
          color={isChecked ? "orange" : undefined}
          hitSlop={25}
          disabled={isOwner}
          onValueChange={
            !isOwner
              ? () => onPress(item)
              : () =>
                  showError(
                    "Not Allowed",
                    "You cannot order from your own restaurant",
                  )
          }
        />
      )}
    </TouchableOpacity>
  );
};

export default FoodCard;
