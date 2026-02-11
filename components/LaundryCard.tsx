import { softDeleteLaundryItem } from "@/api/laundry";
import { useCartStore } from "@/store/cartStore";
import { useUserStore } from "@/store/userStore";
import { LaundryItemResponse } from "@/types/item-types";

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

const LaundryCard = ({
  item,
  onPress,
}: {
  item: LaundryItemResponse;
  onPress: (item: LaundryItemResponse) => void;
}) => {
  const { user } = useUserStore();
  const { showError, showSuccess } = useToast();
  const cartItems = useCartStore((state) => state.cart.order_items);
  const queryClient = useQueryClient();

  // Check if item exists in cart
  const isChecked = cartItems.some((cartItem) => cartItem.item_id === item.id);

  const isOwner =
    user?.user_metadata.user_type === "LAUNDRY_VENDOR" &&
    user?.id === item.vendor_id;

  const deleteMutation = useMutation({
    mutationFn: () => softDeleteLaundryItem(item?.id!),
    onSuccess: () => {
      showSuccess("Deleted", `${item.name} deleted successfully.`);
      queryClient.invalidateQueries({
        queryKey: ["laundryItems", user?.id],
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
      className="my-1 p-3 bg-input rounded-md w-[95%] self-center"
    >
      {/* Edit/Delete buttons for owner */}
      {isOwner && (
        <View className="flex-row absolute top-3 right-3 gap-5 z-10">
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/laundry-store/add-item",
                params: {
                  id: item.id,
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
        <View className="w-[75%]">
          <View className="flex-row items-center justify-between">
            <Text className="text-primary tracking-tight font-poppins-medium text-sm">
              {item.name}
            </Text>
            {item.laundry_type && (
              <View className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                <Text className="text-slate-400 text-[10px] font-poppins">
                  {item.laundry_type.replace("_", " ")}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-wrap mt-1 text-muted text-sm flex-wrap">
            {item.description}
          </Text>
          <Text className="mt-2 text-sm font-poppins-bold text-primary">
            ₦{Number(item.price).toFixed(2)}
          </Text>
        </View>
      </View>



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
              "You cannot order from your own laundry",
            )
          }
          />
          
    </TouchableOpacity>
  );
};

export default LaundryCard;
