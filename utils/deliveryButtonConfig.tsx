import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { DeliveryOrderStatus } from "../types/delivey-types";

export interface DeliveryActionConfig {
  text: string;
  icon: React.ReactNode;
  color: string;
  nextStatus: DeliveryOrderStatus | null;
  disabled?: boolean;
  requiresReason?: boolean; // For cancellations
  warningMessage?: string; // For sender cancellation after pickup
  variant?: "fill" | "outline" | "ghost";
  textColor?: string;
}

export interface DualButtonConfig {
  primary: DeliveryActionConfig | null;
  secondary: DeliveryActionConfig | null;
}

export const getDeliveryButtonConfig = (
  currentStatus: DeliveryOrderStatus,
  userRole: "SENDER" | "RIDER",
): DualButtonConfig => {
  // ============================================================
  // DEFAULTS
  // ============================================================
  const defaultConfig: DualButtonConfig = {
    primary: null,
    secondary: null,
  };

  const cancelAction: DeliveryActionConfig = {
    text: "Cancel Delivery",
    icon: <AntDesign name="close-circle" size={20} color="#ef4444" />,
    color: "#ef4444",
    textColor: "#ef4444",
    variant: "outline",
    nextStatus: "CANCELLED",
    requiresReason: true,
  };

  // ============================================================
  // SENDER BUTTONS
  // ============================================================
  if (userRole === "SENDER") {
    switch (currentStatus) {
      case "PENDING":
        return {
          primary: {
            text: "Assign Rider",
            icon: <Feather name="user-plus" size={20} color="white" />,
            color: "orange", // "bg-button-primary" usually maps to a theme color, sticking to explicit or theme colors is best. Assuming 'red' matches previous code or primary button style.
            // actually previous code had "bg-button-primary" in riders.tsx and "red" in utils.
            // Let's use a standard primary color hex if possible or just "red" as placeholder if theme not available here.
            // Riders.tsx used 'bg-button-primary' which is a tailwind class.
            // Here we return hex for the prop.
            nextStatus: "ASSIGNED", // Logic in UI will hijack this to navigate to /riders
          },
          secondary: null,
        };

      case "ASSIGNED":
        return {
          primary: null, // Waiting for rider to accept
          secondary: null, // Moved to top custom button
        };

      case "ACCEPTED":
        return {
          primary: null,
          secondary: null, // Moved to top custom button
        };

      case "PICKED_UP":
      case "IN_TRANSIT":
        return {
          primary: null,
          secondary: {
            ...cancelAction,
            text: "Request Return",
            warningMessage: "⚠️ Rider will still be paid for the return trip.",
            icon: (
              <MaterialCommunityIcons
                name="package-variant-closed-remove"
                size={20}
                color="#ef4444"
              />
            ),
          },
        };

      case "DELIVERED":
        return {
          primary: {
            text: "Complete & Release Payment",
            icon: <AntDesign name="check-circle" size={20} color="white" />,
            color: "#059669",
            nextStatus: "COMPLETED",
          },
          secondary: null,
        };

      case "COMPLETED":
        return {
          primary: {
            text: "Completed",
            icon: <AntDesign name="check" size={20} color="white" />,
            color: "#6b7280",
            nextStatus: null,
            disabled: true,
          },
          secondary: null,
        };

      case "CANCELLED":
        return {
          primary: {
            text: "Cancelled",
            icon: <AntDesign name="close-circle" size={20} color="white" />,
            color: "#6b7280",
            nextStatus: null,
            disabled: true,
          },
          secondary: null,
        };

      default:
        return defaultConfig;
    }
  }

  // ============================================================
  // RIDER BUTTONS
  // ============================================================
  if (userRole === "RIDER") {
    switch (currentStatus) {
      case "ASSIGNED":
        return {
          primary: {
            text: "Accept Order",
            icon: <AntDesign name="check-circle" size={20} color="white" />,
            color: "orange",
            nextStatus: "ACCEPTED",
          },
          secondary: {
            text: "Decline",
            icon: <AntDesign name="close-circle" size={20} color="#ef4444" />,
            color: "#ef4444",
            textColor: "#ef4444",
            variant: "outline",
            nextStatus: "DECLINED", // UI needs to handle DECLINE action
          },
        };

      case "ACCEPTED":
        return {
          primary: {
            text: "Pick Up Package",
            icon: (
              <MaterialCommunityIcons
                name="package-variant"
                size={20}
                color="white"
              />
            ),
            color: "#8b5cf6",
            nextStatus: "PICKED_UP",
          },
          secondary: null,
        };

      case "PICKED_UP":
        return {
          primary: {
            text: "Mark In Transit",
            icon: <Feather name="truck" size={20} color="white" />,
            color: "#f59e0b",
            nextStatus: "IN_TRANSIT",
          },
          secondary: null,
        };

      case "IN_TRANSIT":
        return {
          primary: {
            text: "Mark Delivered",
            icon: <AntDesign name="check-circle" size={20} color="white" />,
            color: "#10b981",
            nextStatus: "DELIVERED",
          },
          secondary: null,
        };

      case "DELIVERED":
        return {
          primary: {
            text: "Waiting for Confirmation",
            icon: <Feather name="clock" size={20} color="white" />,
            color: "#6b7280",
            nextStatus: null,
            disabled: true,
          },
          secondary: null,
        };

      case "COMPLETED":
        return {
          primary: {
            text: "Completed",
            icon: <AntDesign name="check" size={20} color="white" />,
            color: "#6b7280",
            nextStatus: null,
            disabled: true,
          },
          secondary: null,
        };

      case "CANCELLED":
        return {
          primary: {
            text: "Cancelled",
            icon: <AntDesign name="close-circle" size={20} color="white" />,
            color: "#6b7280",
            nextStatus: null,
            disabled: true,
          },
          secondary: null,
        };

      default:
        return defaultConfig;
    }
  }

  return defaultConfig;
};
