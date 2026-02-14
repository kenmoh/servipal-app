import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Fontisto from "@expo/vector-icons/Fontisto";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import HDivider from "./HDivider";

import { UnifiedOrderResponse } from "@/types/order-types";
import { Status } from "./Status";

interface OrderProps {
  order: UnifiedOrderResponse;
  orderType: "FOOD" | "LAUNDRY";
}

const FoodLaundryOrderCard = ({ order, orderType }: OrderProps) => {
  const handlePress = () => {
    router.push({
      pathname: "/receipt/[id]",
      params: { id: order.id, orderType },
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
      android_ripple={{ color: "#00000020" }}
      className="bg-input rounded-2xl border border-border-subtle p-4 mb-2 shadow-sm w-[95%] self-center my-1"
    >
      {/* Header Row — unchanged */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          {orderType === "FOOD" ? (
            <MaterialIcons name="restaurant" size={30} color="gray" />
          ) : (
            <MaterialCommunityIcons
              name="washing-machine"
              size={30}
              color="gray"
            />
          )}
        </View>
        <View className="flex-row gap-[5px] items-center ml-3">
          <Text className="text-primary font-poppins-medium text-sm">
            ₦ {Number(order?.grand_total).toFixed(2)}
          </Text>
        </View>
        <Text className="font-poppins-medium text-muted">
          #ORDN-0{order?.order_number}
        </Text>
      </View>

      <HDivider />

      {/* Body — two columns */}
      <View className="flex-row my-4 gap-3">
        {/* Left column */}
        <View className="flex-1 gap-3">
          <View className="flex-row items-center gap-2">
            <FontAwesome6 name="landmark" color="gray" size={12} />
            <Text
              className="flex-1 text-secondary font-poppins-medium text-xs"
              numberOfLines={1}
            >
              {order?.vendor_name}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <AntDesign name="user" color="gray" size={12} />
            <Text
              className="flex-1 text-secondary font-poppins-light text-xs"
              numberOfLines={1}
            >
              {order?.customer_name}
            </Text>
          </View>
        </View>

        {/* Vertical divider */}
        <View className="w-[1px] bg-border-subtle" />

        {/* Right column */}
        <View className="flex-1 gap-3">
          <View className="flex-row items-center gap-2">
            <Fontisto name="motorcycle" color="gray" size={12} />
            <Text
              className="flex-1 text-secondary font-poppins-light text-xs"
              numberOfLines={2}
            >
              {order?.delivery_option}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            {orderType === "FOOD" ? (
              <MaterialIcons name={"restaurant"} color="gray" size={12} />
            ) : (
              <MaterialCommunityIcons
                name={"washing-machine"}
                color="gray"
                size={12}
              />
            )}
            <Text className="text-secondary font-poppins-light text-xs">
              {orderType === "FOOD" ? "Food Order" : "Laundry Order"}
            </Text>
          </View>
        </View>
      </View>

      <HDivider />

      {/* Footer */}
      <View className="mt-3 flex-row items-center justify-between">
        <Status
          label={
            order?.order_status === "PENDING"
              ? "Pending"
              : order?.order_status === "PREPARING"
                ? "Preparing"
                : order?.order_status === "READY"
                  ? "Ready"
                  : undefined
          }
          status={order?.order_status}
        />
        <Feather name="chevron-right" size={16} color="gray" />
      </View>
    </Pressable>
  );
};

export default React.memo(FoodLaundryOrderCard);
