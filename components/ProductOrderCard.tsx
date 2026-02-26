import { blurhash } from "@/constants/state";
import { OrderStatus, ProductOrder } from "@/types/product-types";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

const ProductOrderCard = ({ data }: { data: ProductOrder }) => {
  const handleOrderPress = () => {
    router.push({
      pathname: "/product-detail/[orderId]",
      params: { orderId: data?.id },
    });
  };

  const getStatusColor = (status: OrderStatus) => {
    if (status === "COMPLETED") return "text-green-700 dark:text-green-400";
    if (status === "PENDING") return "text-amber-700 dark:text-amber-400";
    if (status === "CANCELLED") return "text-red-700 dark:text-red-400";
    if (status === "DELIVERED") return "text-green-700 dark:text-green-400";
    if (status === "DISPUTED") return "text-red-700 dark:text-red-400";
  };

  const getStatusBg = (status: OrderStatus) => {
    if (status === "COMPLETED") return "bg-green-400/20";
    if (status === "PENDING") return "bg-orange-300/20";
    if (status === "CANCELLED") return "bg-red-400/20";
    if (status === "DELIVERED") return "bg-green-400/20";
    if (status === "DISPUTED") return "bg-red-400/20";
    return "bg-slate-400/20";
  };

  return (
    <Pressable
      onPress={handleOrderPress}
      className="bg-profile-card rounded-2xl mx-4 my-2 p-3 flex-row items-center active:opacity-80"
    >
      {/* Image Section */}
      <View className="h-20 w-20 rounded-xl overflow-hidden">
        <Image
          source={{
            uri:
              data?.items[0].images?.[0] || "https://via.placeholder.com/150",
          }}
          contentFit="cover"
          transition={200}
          placeholder={blurhash}
          style={{ width: "100%", height: "100%" }}
        />
      </View>

      {/* Details Section */}
      <View className="flex-1 ml-4 self-stretch py-1 justify-between">
        {/* Top Section: Name */}
        <View className="flex-row">
          <Text
            className="flex-1 text-black dark:text-white font-poppins-semibold text-sm"
            numberOfLines={2}
          >
            {data?.items[0]?.name}
          </Text>
        </View>

        {/* Bottom Section: Price and Order Info */}
        <View className="flex-row justify-between items-center">
          {/* Price */}
          <View className="flex-row items-center">
            <Text className="text-muted font-poppins-medium text-[10px]">
              Total:{" "}
            </Text>
            <Text className="text-primary font-poppins-bold text-xs">
              ₦{Number(data?.grand_total).toLocaleString()}
            </Text>
          </View>

          {/* Order Info */}
          <View className="flex-row items-end gap-2">
            <Text
              className={`text-sm font-poppins-bold ${getStatusColor(data?.order_status)}`}
              numberOfLines={1}
            >
              #{data?.order_number}
            </Text>
            <View
              className={`px-2 py-0.5 rounded-full ${getStatusBg(data?.order_status)}`}
            >
              <Text
                className={`text-[8px] font-poppins-bold uppercase ${getStatusColor(data?.order_status)}`}
                numberOfLines={1}
              >
                {data?.order_status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Section */}
      <View className="ml-2">
        <Feather name="chevron-right" size={20} color="#9CA3AF" />
      </View>
    </Pressable>
  );
};

export default ProductOrderCard;
