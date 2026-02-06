import { Status } from "@/components/Status";
import { useUserStore } from "@/store/userStore";
import { DeliveryOrder } from "@/types/delivey-types";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import HDivider from "./HDivider";

const DeliveryCard = ({ order }: { order: DeliveryOrder }) => {
  const { user } = useUserStore();
  const handlePress = React.useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (
      order.delivery_status === "PAID_NEEDS_RIDER" &&
      order.payment_status === "PAID"
    ) {
      router.push({
        pathname: "/riders",
        params: { txRef: order.tx_ref, paymentStatus: order.payment_status },
      });
    } else {
      router.prefetch("/delivery-detail/[id]");
      router.push({
        pathname: "/delivery-detail/[id]",
        params: {
          id: order.id!,
        },
      });
    }
  }, [order]);

  const canViewOrderDetail =
    order?.sender_id === user?.id ||
    order?.rider_id === user?.id ||
    order?.dispatch_id === user?.id;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [{ height: 200, opacity: pressed ? 0.6 : 1 }]}
      android_ripple={{ color: "#00000020" }}
      disabled={!canViewOrderDetail}
      className="bg-input rounded-2xl h-[200px] border border-collapse-transparent border-border-subtle p-4 mb-2 shadow-sm w-[95%] self-center my-1"
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-2">
          <MaterialCommunityIcons name="package" size={30} color="gray" />
        </View>
        <View className="flex-row gap-[5px] items-center ml-3">
          <Text className="text-primary font-poppins-medium text-sm">
            ₦ {Number(order?.delivery_fee).toFixed(2)}
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

      <View className="mt-2 flex-row justify-between">
        <View className="flex-row items-center">
          <Feather name="clock" color="gray" size={12} />
          <Text className="font-poppins-light text-sm text-muted ml-1">
            Est Time: {order?.duration}
          </Text>
        </View>
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
          {/* <PaymentStatusColor status={order?.payment_status} /> */}
        </View>
      </View>
    </Pressable>
  );
};

export default React.memo(DeliveryCard);

const styles = StyleSheet.create({
  iconStyle: {
    // marginTop: 2
  },
});
