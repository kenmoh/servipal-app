import { useUserStore } from "@/store/userStore";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import HDivider from "./HDivider";

import { UnifiedOrderResponse } from "@/types/order-types";

interface OrderProps {
  order: UnifiedOrderResponse;
}

const FoodLaundryOrderCard = ({ order }: OrderProps) => {
  const { user } = useUserStore();
  const { orderType } = useLocalSearchParams<{
    orderType: "FOOD" | "LAUNDRY";
  }>();
  const hamdlePress = () => {
    router.push({
      pathname: "/receipt/[id]",
      params: {
        id: order.id,
      },
    });
  };

  return (
    <Pressable
      onPress={hamdlePress}
      style={({ pressed }) => [{ height: 200, opacity: pressed ? 0.6 : 1 }]}
      android_ripple={{ color: "#00000020" }}
      className="bg-input rounded-2xl h-[200px] border border-collapse-transparent border-border-subtle p-4 mb-2 shadow-sm w-[95%] self-center my-1"
    >
      {/* Header */}
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

      <View className="my-4">
        <View className="flex-row items-center mb-2 gap-2">
          <MaterialCommunityIcons name="circle" color="gray" size={12} />

          <Text
            className="flex-1 text-secondary font-poppins-light text-xs"
            numberOfLines={2}
          >
            {order?.pickup_location}
          </Text>
        </View>
        <View className="flex-row items-center mb-2 gap-2">
          <Feather
            name="map-pin"
            color={"gray"}
            size={12}
            style={styles.iconStyle}
          />
          <Text
            className="flex-1 text-secondary font-poppins-light text-xs"
            numberOfLines={2}
          >
            {order?.destination}
          </Text>
        </View>
      </View>

      <HDivider />

      {/* <View className="mt-2 flex-row justify-between">
        <View className="">
          <Status
            label={
              order?.delivery_status === "IN_TRANSIT"
                ? "In Transit"
                : order?.delivery_status === "PICKED_UP"
                  ? "Picked Up"
                  : order?.delivery_status === "PAID_NEEDS_RIDER"
                    ? "ASSIGN RIDER"
                    : undefined
            }
            status={order?.delivery_status}
          />
        </View>
      </View> */}
    </Pressable>
  );
};

export default React.memo(FoodLaundryOrderCard);

const styles = StyleSheet.create({
  iconStyle: {
    // marginTop: 2
  },
});
