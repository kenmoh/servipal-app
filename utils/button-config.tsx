import { OrderStatus } from "@/types/order-types";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";

const getNextStatus = (
  currentStatus: OrderStatus,
  deliveryOption: "PICKUP" | "DELIVERY",
): OrderStatus | null => {
  switch (currentStatus) {
    case "PENDING":
      return "PREPARING";
    case "PREPARING":
      return "READY";
    case "READY":
      return deliveryOption === "DELIVERY" ? "IN_TRANSIT" : "DELIVERED";
    case "IN_TRANSIT":
      return "DELIVERED";
    case "DELIVERED":
      return "COMPLETED";
    default:
      return null;
  }
};

interface ButtonConfig {
  text: string;
  icon: React.ReactNode;
  color: string;
  nextStatus: OrderStatus | null;
  disabled?: boolean;
}

export const getButtonConfig = (
  currentStatus: OrderStatus,
  deliveryOption: "PICKUP" | "DELIVERY",
  orderType: "FOOD" | "LAUNDRY" = "FOOD",
): ButtonConfig => {
  const isLaundry = orderType === "LAUNDRY";

  const configs: Record<OrderStatus, ButtonConfig> = {
    PENDING: {
      text: isLaundry ? "Start Washing" : "Start Preparing",
      icon: <AntDesign name="play-circle" size={20} color="white" />,
      color: "#4CAF50",
      nextStatus: "PREPARING",
    },
    PREPARING: {
      text: isLaundry ? "Finish Washing" : "Mark as Ready",
      icon: <AntDesign name="check-circle" size={20} color="white" />,
      color: "#2196F3",
      nextStatus: "READY",
    },
    READY: {
      text:
        deliveryOption === "DELIVERY"
          ? "Out for Delivery"
          : "Mark as Delivered",
      icon:
        deliveryOption === "DELIVERY" ? (
          <Feather name="truck" size={20} color="white" />
        ) : (
          <AntDesign name="check-circle" size={20} color="white" />
        ),
      color: "#FF9800",
      nextStatus: deliveryOption === "DELIVERY" ? "IN_TRANSIT" : "DELIVERED",
    },
    IN_TRANSIT: {
      text: "Mark as Delivered",
      icon: <AntDesign name="check-circle" size={20} color="white" />,
      color: "#9C27B0",
      nextStatus: "DELIVERED",
    },
    DELIVERED: {
      text: "Confirm Receipt",
      icon: <AntDesign name="like" size={20} color="white" />,
      color: "#4CAF50",
      nextStatus: "COMPLETED",
    },
    COMPLETED: {
      text: "Completed",
      icon: <AntDesign name="check" size={20} color="white" />,
      color: "#757575",
      nextStatus: null,
      disabled: true,
    },
    CANCELLED: {
      text: "Cancelled",
      icon: <AntDesign name="close-circle" size={20} color="white" />,
      color: "#F44336",
      nextStatus: null,
      disabled: true,
    },
  };

  return configs[currentStatus] || configs.COMPLETED;
};
