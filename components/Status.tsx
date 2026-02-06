import { DeliveryOrderStatus, PaymentStatus } from "@/types/delivey-types";
import React from "react";
import { Text, View } from "react-native";


// Memoize the Status component
export const Status = React.memo(
  ({ status, label }: { label?: string; status?: DeliveryOrderStatus }) => {
    const getStatusColors = (status?: DeliveryOrderStatus) => {
      switch (status) {
        case "PENDING":
          return { bg: "rgba(255, 193, 7, 0.12)", color: "gold" };
        case "PICKED_UP":
          return { bg: "rgba(33, 0, 243, 0.10)", color: "#0D47A1" };
        case "DELIVERED":
          return { bg: "rgba(33, 0, 243, 0.10)", color: "#0D47A1" };
        case "COMPLETED":
          return { bg: "rgba(33, 0, 243, 0.10)", color: "#0D47A1" };
        case "ASSIGNED":
          return { bg: "rgba(33, 0, 243, 0.10)", color: "#0D47A1" };
        case "PAID_NEEDS_RIDER":
          return { bg: "rgba(33, 0, 243, 0.10)", color: "#0D47A1" };
        case "CANCELLED":
          return { bg: "rgba(244, 67, 54, 0.10)", color: "#B71C1C" };
        default:
          return { bg: "rgba(33, 150, 243, 0.10)", color: "#0D47A1" };
      }
    };

    const colors = getStatusColors(status);

    return (
      <View
        style={{ backgroundColor: colors.bg }}
        className="py-[6px] px-[10px] rounded-full"
      >
        <Text
          style={{ color: colors.color }}
          className="font-poppins-medium text-sm capitalize"
        >
          {label || status}
        </Text>
      </View>
    );
  },
);

// Memoize the Status component
export const PaymentStatusColor = React.memo(
  ({ status }: { status?: PaymentStatus }) => {
    const getPaymentStatusColors = (status?: PaymentStatus) => {
      switch (status) {
        case "PENDING":
          return { bg: "rgba(255, 193, 7, 0.12)", color: "gold" };
        case "PAID":
          return { bg: "rgba(45, 245, 111, 0.10)", color: "green" };
        case "REFUNDED":
          return { bg: "rgba(244, 67, 54, 0.10)", color: "#B71C1C" };
        case "FAILED":
          return { bg: "rgba(244, 67, 54, 0.10)", color: "#B71C1C" };
        default:
          return { bg: "rgba(120, 144, 156, 0.10)", color: "#263238" };
      }
    };

    const colors = getPaymentStatusColors(status);

    return (
      <View
        style={{ backgroundColor: colors.bg }}
        className="py-[6px] px-[12px] rounded-full"
      >
        <Text
          style={{ color: colors.color }}
          className="font-poppins-medium text-sm capitalize"
        >
          {status}
        </Text>
      </View>
    );
  },
);

Status.displayName = "Status";
