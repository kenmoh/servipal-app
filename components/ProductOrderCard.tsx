import { ProductOrderResponse } from "@/types/product-types";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ProductOrderCardProps = {
  data: ProductOrderResponse;
};

const ProductOrderCard = ({ data }: ProductOrderCardProps) => {
  const handleOrderPress = () => {
    router.push({
      pathname: "/product-detail/[orderId]",
      params: { orderId: data?.id },
    });
  };

  const getStatusColor = (status: string) => {
    const success = ["paid", "accepted", "delivered", "received"];
    const warning = ["pending", "laundry_received"];
    if (success.includes(status)) return "text-green-700 dark:text-green-400";
    if (warning.includes(status)) return "text-amber-700 dark:text-amber-400";
    return "text-red-700 dark:text-red-400";
  };

  const getStatusBg = (status: string) => {
    const success = ["paid", "accepted", "delivered", "received"];
    const warning = ["pending", "laundry_received"];
    if (success.includes(status))
      return "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/40";
    if (warning.includes(status))
      return "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40";
    return "bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700";
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleOrderPress}
      style={styles.card}
      className="bg-white dark:bg-slate-900 rounded-2xl mx-4 my-2 p-3 flex-row items-center border border-slate-100 dark:border-slate-800 shadow-sm"
    >
      {/* Image Section */}
      <View className="h-20 w-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
        <Image
          source={{
            uri:
              data?.order_items?.[0]?.images?.[0] ||
              "https://via.placeholder.com/150",
          }}
          className="w-full h-full"
          contentFit="cover"
          transition={200}
        />
      </View>

      {/* Details Section */}
      <View className="flex-1 ml-4 py-1">
        <Text
          className="text-slate-900 dark:text-white font-poppins-semibold text-sm mb-0.5"
          numberOfLines={1}
        >
          {data?.order_items?.[0]?.name || "Product"}
        </Text>

        <Text className="text-slate-400 text-[10px] font-poppins mb-1.5">
          Order #{data?.order_number}
        </Text>

        <View className="flex-row items-center gap-2">
          <Text className="text-slate-900 dark:text-white font-poppins-bold text-sm">
            ₦{Number(data?.grand_total || 0).toLocaleString()}
          </Text>

          <View
            className={`px-2 py-0.5 rounded-md border ${
              data?.payment_status === "paid"
                ? "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/40"
                : "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40"
            }`}
          >
            <Text
              className={`text-[9px] font-poppins-bold uppercase ${
                data?.payment_status === "paid"
                  ? "text-green-700 dark:text-green-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {data?.payment_status}
            </Text>
          </View>
        </View>
      </View>

      {/* Status Section */}
      <View className="items-end gap-1.5">
        <View
          className={`px-2 py-1 rounded-md border ${getStatusBg(data?.order_status)}`}
        >
          <Text
            className={`text-[9px] font-poppins-bold uppercase ${getStatusColor(data?.order_status)}`}
            numberOfLines={1}
          >
            {data?.order_status === "received_rejected_product"
              ? "Return"
              : data?.order_status}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color="#CBD5E1" />
      </View>
    </TouchableOpacity>
  );
};

export default ProductOrderCard;

const styles = StyleSheet.create({
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
});
