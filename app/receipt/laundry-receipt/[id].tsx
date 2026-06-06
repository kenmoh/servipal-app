import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchOrderDetails, updateLaundryOrderStatus } from "@/api/order";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUserStore } from "@/store/userStore";
import { DetailResponse, OrderItem, OrderStatus } from "@/types/order-types";
import { getButtonConfig } from "@/utils/button-config";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Directory, File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import Animated, { ZoomIn, ZoomOut } from "react-native-reanimated";

type StatusAction = {
  status: OrderStatus;
  label: string;
  icon: string;
  color: string;
};

const getStatusActions = (orderType: "FOOD" | "LAUNDRY"): StatusAction[] => [
  {
    status: "PENDING",
    label: "Pending",
    icon: "time-outline",
    color: "#9CA3AF",
  },
  {
    status: "PREPARING",
    label: orderType === "LAUNDRY" ? "Washing" : "Preparing",
    icon: orderType === "LAUNDRY" ? "color-wand-outline" : "flame-outline",
    color: "#2196F3",
  },
  {
    status: "READY",
    label: "Ready",
    icon: "checkmark-circle-outline",
    color: "#FF9800",
  },
  {
    status: "IN_TRANSIT",
    label: "In Transit",
    icon: "car-outline",
    color: "#9C27B0",
  },
  {
    status: "DELIVERED",
    label: "Delivered",
    icon: "bag-check-outline",
    color: "#4CAF50",
  },
  {
    status: "COMPLETED",
    label: "Completed",
    icon: "checkmark-done-circle-outline",
    color: "#4CAF50",
  },
  {
    status: "CANCELLED",
    label: "Cancelled",
    icon: "close-circle-outline",
    color: "#F44336",
  },
];

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

function OrderContextMenu({
  actions,
  currentStatus,
  onSelect,
  onDismiss,
  isDark,
  isVendor,
  isCustomer,
  loading,
  loadingStatus,
}: {
  actions: StatusAction[];
  currentStatus: OrderStatus;
  onSelect: (status: OrderStatus) => void;
  onDismiss: () => void;
  isDark: boolean;
  isVendor: boolean;
  isCustomer: boolean;
  loading: boolean;
  loadingStatus: OrderStatus | null;
}) {
  const menuBg = isDark ? "#1c1c1e" : "#ffffff";
  const borderCol = isDark ? "#2c2c2e" : "#e5e7eb";
  const dividerCol = isDark ? "#2c2c2e" : "#f3f4f6";

  const vendorStatuses = ["PENDING", "PREPARING", "READY", "IN_TRANSIT"];
  const customerStatuses = ["DELIVERED"];

  return (
    <>
      <Pressable
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 998,
        }}
        onPress={onDismiss}
      />
      <Animated.View
        entering={ZoomIn.duration(160).springify().damping(18).stiffness(260)}
        exiting={ZoomOut.duration(120)}
        style={{
          position: "absolute",
          top: 36,
          left: 0,
          zIndex: 999,
          width: 190,
          borderRadius: 14,
          backgroundColor: menuBg,
          borderWidth: 1,
          borderColor: borderCol,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.5 : 0.12,
          shadowRadius: 12,
          elevation: 8,
          overflow: "hidden",
        }}
      >
        {actions.map((action, index) => {
          const isActive = currentStatus === action.status;
          const allowed = VALID_TRANSITIONS[currentStatus] || [];
          const isAllowed = allowed.includes(action.status);

          const canVendorAction =
            isVendor && vendorStatuses.includes(currentStatus) && isAllowed;
          const canCustomerAction =
            isCustomer && customerStatuses.includes(currentStatus) && isAllowed;
          const canAction = canVendorAction || canCustomerAction;

          const isDisabled = isActive || !canAction;

          return (
            <React.Fragment key={action.status}>
              {index > 0 && (
                <View style={{ height: 1, backgroundColor: dividerCol }} />
              )}
              <TouchableOpacity
                disabled={isDisabled || loading}
                activeOpacity={0.6}
                onPress={() => onSelect(action.status)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  opacity: isDisabled ? 0.35 : 1,
                }}
              >
                <Ionicons
                  name={action.icon as any}
                  size={17}
                  color={action.color}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontFamily: "Poppins-Medium",
                      color: isDisabled
                        ? isDark
                          ? "#6b7280"
                          : "#9ca3af"
                        : action.color,
                    }}
                  >
                    {action.label}
                  </Text>
                  {isActive && !loading && (
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Poppins-Regular",
                        color: isDark ? "#6b7280" : "#9ca3af",
                        marginTop: 1,
                      }}
                    >
                      Current status
                    </Text>
                  )}
                  {loading && loadingStatus === action.status && (
                    <Text
                      style={{
                        fontSize: 10,
                        fontFamily: "Poppins-Regular",
                        color: action.color,
                        marginTop: 1,
                      }}
                    >
                      Updating...
                    </Text>
                  )}
                </View>
                {loading && loadingStatus === action.status ? (
                  <ActivityIndicator size="small" color={action.color} />
                ) : isActive ? (
                  <Ionicons name="checkmark" size={14} color={action.color} />
                ) : null}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </Animated.View>
    </>
  );
}

const LaundryReceiptPage = () => {
  const screenWidth = Dimensions.get("window").width;
  const theme = useColorScheme();
  const { user } = useUserStore();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();

  const isDark = theme === "dark";
  const BG_COLOR = isDark ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const CARD_BG = isDark ? "bg-gray-800/40" : "bg-white";
  const TEXT_PRIMARY = isDark ? "text-white" : "text-gray-900";
  const TEXT_SECONDARY = isDark ? "text-gray-400" : "text-gray-600";
  const BORDER_COLOR = isDark ? "border-gray-700" : "border-gray-200";

  const { id } = useLocalSearchParams<{ id: string }>();
  const orderType = "LAUNDRY";

  const { data, isLoading, refetch } = useQuery<DetailResponse>({
    queryKey: ["laundry-order-details", id, orderType],
    queryFn: () => fetchOrderDetails(id, orderType),
    enabled: !!id,
    refetchOnWindowFocus: true,
  });

  const buttonConfig = getButtonConfig(
    data?.order?.order_status!,
    data?.order?.delivery_option as "PICKUP" | "DELIVERY",
    orderType,
  );

  const [menuOpen, setMenuOpen] = useState(false);

  const isVendor = user?.id === data?.order.vendor_id;
  const isCustomer = user?.id === data?.order.customer_id;

  const vendorStatuses = ["PENDING", "PREPARING", "READY", "IN_TRANSIT"];
  const showVendorButton =
    isVendor && vendorStatuses.includes(data?.order?.order_status!);

  const showCustomerButton =
    isCustomer && data?.order.order_status === "DELIVERED";

  const contextMenuMutation = useMutation({
    mutationFn: ({ newStatus }: { newStatus: OrderStatus }) => {
      console.log("[LaundryStatusUpdate] Calling API:", {
        newStatus,
        orderId: data?.order.id,
        orderType,
      });
      if (!data?.order.id) throw new Error("Order ID not available");
      return updateLaundryOrderStatus(data.order.id, { new_status: newStatus });
    },
    onSuccess: (result) => {
      console.log("[LaundryStatusUpdate] Success:", result);
      queryClient.invalidateQueries({ queryKey: ["user-orders", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["laundry-orders", user?.id] });
      queryClient.invalidateQueries({
        queryKey: ["laundry-order-details", id, orderType],
      });
      refetch();
      setTimeout(() => setMenuOpen(false), 600);
      showSuccess("Success", `Order status updated to ${result.status}`);
    },
    onError: (error) => {
      console.log("[LaundryStatusUpdate] Error:", error);
      showError("Error", error.message || "Failed to update status");
    },
  });

  const handleStatusSelect = (newStatus: OrderStatus) => {
    if (newStatus === data?.order?.order_status) return;
    console.log("[LaundryStatusUpdate] Selected:", newStatus);
    contextMenuMutation.mutate({ newStatus });
  };

  const laundryOrderMutation = useMutation({
    mutationFn: () =>
      updateLaundryOrderStatus(data?.order.id!, {
        new_status: buttonConfig.nextStatus!,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-orders", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["laundry-orders", user?.id] });
      queryClient.invalidateQueries({
        queryKey: ["laundry-order-details", id, orderType],
      });
      refetch();
      showSuccess(`${data.status}`, `Order status updated to ${data.status}`);
    },
    onError: (error) => {
      showError("Error", `${error.message}`);
    },
  });

  const handleOrderStatusUpdate = () => {
    laundryOrderMutation.mutate();
  };

  const generateReceiptHTML = () => {
    if (!data) return "";

    const truncateText = (text: string, maxLength: number = 150) => {
      if (!text) return "";
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + "...";
    };

    const itemsTotal = Number(data.order?.total_price || 0);
    const deliveryFee = Number(data?.order?.delivery_fee || 0);
    const total = Number(data.order?.grand_total || itemsTotal + deliveryFee);

    return `
            <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
                        
                        body { 
                            font-family: 'Poppins', sans-serif;
                            padding: 40px 20px;
                            color: #1a1a1a;
                            background-color: #fcfcfc;
                            margin: 0;
                            line-height: 1.6;
                        }
                        
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            background: white;
                            padding: 40px;
                            border-radius: 24px;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                        }
                        
                        .header { 
                            text-align: center; 
                            margin-bottom: 40px;
                        }

                        .header h1 {
                            color: #FF8C00;
                            margin: 0;
                            font-size: 28px;
                            font-weight: 700;
                            letter-spacing: -0.5px;
                        }

                        .business-name {
                            font-size: 18px;
                            font-weight: 600;
                            color: #333;
                            margin-top: 5px;
                        }
                        
                        .order-meta {
                            text-align: center;
                            font-size: 14px;
                            color: #666;
                            margin-top: 8px;
                        }

                        .section { 
                            margin-bottom: 30px;
                        }
                        
                        .section h2 {
                            color: #1a1a1a;
                            margin: 0 0 15px 0;
                            font-size: 16px;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                        }
                        
                        .line-item { 
                            display: flex; 
                            justify-content: space-between; 
                            padding: 12px 0;
                            border-bottom: 1px solid #f0f0f0;
                        }
                        
                        .line-item:last-child {
                            border-bottom: none;
                        }
                        
                        .label {
                            color: #666;
                        }
                        
                        .value {
                            font-weight: 500;
                            color: #1a1a1a;
                        }
                        
                        .total-block { 
                            margin-top: 20px;
                            padding-top: 20px;
                            border-top: 2px solid #f0f0f0;
                        }
                        
                        .grand-total {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            font-weight: 700;
                            font-size: 22px;
                            color: #000;
                            margin-top: 10px;
                        }
                        
                        .status {
                            display: inline-block;
                            padding: 6px 16px;
                            border-radius: 50px;
                            font-size: 12px;
                            font-weight: 600;
                            text-transform: uppercase;
                        }
                        
                        .status-paid {
                            background: #e6f4ea;
                            color: #1e7e34;
                        }
                        
                        .status-unpaid {
                            background: #fdeaea;
                            color: #d93025;
                        }
                        
                        .address-box {
                            background: #fcfcfc;
                            padding: 16px;
                            border-radius: 12px;
                            border: 1px solid #f0f0f0;
                            font-size: 14px;
                            margin-bottom: 15px;
                        }

                        .footer {
                            text-align: center;
                            margin-top: 50px;
                            color: #999;
                            font-size: 11px;
                            letter-spacing: 0.5px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>ServiPal</h1>
                            <div class="business-name">${data.order?.vendor_name || "Laundry Vendor"}</div>
                            <div class="order-meta">Laundry Order #${data.order?.order_number}</div>
                        </div>
                        
                        <div class="section">
                            <div class="line-item">
                                <span class="label">Customer</span>
                                <span class="value">${data.order?.customer_name || "User"}</span>
                            </div>
                            <div class="line-item">
                                <span class="label">Payment Status</span>
                                <span class="status status-${data.order?.order_payment_status === "SUCCESS" ? "PAID" : "UNPAID"}">
                                    ${data.order?.order_payment_status?.toUpperCase()}
                                </span>
                            </div>
                            <div class="line-item">
                                <span class="label">Date</span>
                                <span class="value">${format(new Date(data.order?.created_at || ""), "PPP")}</span>
                            </div>
                        </div>

                        ${
                          data.order?.order_items &&
                          data.order.order_items.length > 0
                            ? `
                            <div class="section">
                                <h2>Services</h2>
                                ${data.order.order_items
                                  .map(
                                    (item) => `
                                    <div class="line-item">
                                        <span>${item.quantity}X ${item.name}</span>
                                        <span class="value">₦${Number((item.sizes?.[0]?.price ?? item.price) * item.quantity).toFixed(2)}</span>
                                    </div>
                                  `,
                                  )
                                  .join("")}
                            </div>
                        `
                            : ""
                        }

                        <div class="section total-block">
                            <div class="line-item">
                                <span class="label">Subtotal</span>
                                <span class="value">₦${itemsTotal.toFixed(2)}</span>
                            </div>
                            ${
                              deliveryFee > 0
                                ? `
                                <div class="line-item">
                                    <span class="label">Delivery Fee</span>
                                    <span class="value">₦${deliveryFee.toFixed(2)}</span>
                                </div>
                            `
                                : ""
                            }
                            <div class="grand-total">
                                <span>Total</span>
                                <span>₦${total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="section">
                            <h2>Address Details</h2>
                            <div class="address-box">
                                <strong style="display:block; margin-bottom:4px; font-size:11px; color:#999;">PICKUP LOCATION</strong>
                                ${truncateText(data.order?.pickup_location || "")}
                            </div>
                            <div class="address-box">
                                <strong style="display:block; margin-bottom:4px; font-size:11px; color:#999;">DROP-OFF LOCATION</strong>
                                ${truncateText(data.order?.destination || "")}
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p>Thank you for choosing ServiPal Laundry!</p>
                            <p>Computer generated receipt. Valid without signature.</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
  };

  const handleShare = async () => {
    try {
      const html = generateReceiptHTML();
      const { uri } = await Print.printToFileAsync({
        html,
        width: screenWidth,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Laundry Receipt #${data?.order?.order_number}`,
          UTI: "com.adobe.pdf",
        });
      }
    } catch (error) {
      showError("Error", "Failed to share receipt");
    }
  };

  if (isLoading) return <LoadingIndicator />;
  if (!data) return null;

  const { order, delivery } = data;
  const itemsTotal = Number(order?.total_price || 0);
  const deliveryFee = Number(delivery?.delivery_fee || 0);
  const total = Number(order?.grand_total || itemsTotal + deliveryFee);

  const showReviewButton = order.vendor_id !== user?.id;

  const getStatusLabel = (status: OrderStatus) => {
    if (status === "PREPARING") return "Washing";
    return status.replace("_", " ");
  };

  const getStatusBadgeColor = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/10";
      case "PREPARING":
        return "bg-blue-500/10";
      case "READY":
        return "bg-orange-500/10";
      case "IN_TRANSIT":
        return "bg-purple-500/10";
      case "DELIVERED":
        return "bg-green-500/10";
      case "COMPLETED":
        return "bg-green-500/10";
      case "CANCELLED":
        return "bg-red-500/10";
      default:
        return "bg-gray-500/10";
    }
  };

  const getStatusTextColor = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return "text-yellow-600";
      case "PREPARING":
        return "text-blue-600";
      case "READY":
        return "text-orange-600";
      case "IN_TRANSIT":
        return "text-purple-600";
      case "DELIVERED":
        return "text-green-600";
      case "COMPLETED":
        return "text-green-600";
      case "CANCELLED":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: BG_COLOR }}
      contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 10 }}
    >
      <Stack.Screen
        options={{
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: "Poppins-Medium" },
          headerStyle: { backgroundColor: BG_COLOR },
          headerRight: () => (
            <View className="flex-row items-center gap-5">
              <Pressable
                onPress={handleShare}
                className="bg-slate-600/10 p-2.5 rounded-full active:opacity-50"
              >
                <Feather
                  name="share-2"
                  size={20}
                  color={theme === "dark" ? "#eee" : "black"}
                />
              </Pressable>
            </View>
          ),
        }}
      />

      {/* Update Status Section */}
      <View className="flex-row items-center justify-between mb-3 px-2" style={{ zIndex: menuOpen ? 100 : 1 }}>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => setMenuOpen((v) => !v)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text className={`text-sm font-poppins-medium ${TEXT_SECONDARY}`}>
              Update Status
            </Text>
          </Pressable>
          <View style={{ position: "relative" }}>
            <TouchableOpacity
              onPress={() => setMenuOpen((v) => !v)}
              className="bg-input border border-border-subtle p-1.5 rounded-xl"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="ellipsis-vertical" size={16} color="gray" />
            </TouchableOpacity>

            {menuOpen && (
              <OrderContextMenu
                actions={getStatusActions(orderType)}
                currentStatus={order.order_status}
                isDark={isDark}
                isVendor={isVendor}
                isCustomer={isCustomer}
                loading={contextMenuMutation.isPending}
                loadingStatus={contextMenuMutation.variables?.newStatus ?? null}
                onDismiss={() => setMenuOpen(false)}
                onSelect={handleStatusSelect}
              />
            )}
          </View>
        </View>
        <View className={`${getStatusBadgeColor(order.order_status)} px-4 py-1.5 rounded-full`}>
          <Text className={`${getStatusTextColor(order.order_status)} text-xs font-poppins-semibold uppercase`}>
            {getStatusLabel(order.order_status)}
          </Text>
        </View>
      </View>

      <View
        className={`${CARD_BG} rounded-xl p-4 ${BORDER_COLOR} border shadow-sm`}
      >
        {/* Header */}
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-blue-500/10 rounded-full items-center justify-center mb-4">
            <MaterialCommunityIcons
              name="washing-machine"
              size={32}
              color="#3B82F6"
            />
          </View>
          <Text className={`text-2xl font-poppins-bold ${TEXT_PRIMARY}`}>
            {order?.vendor_name || "Laundry Receipt"}
          </Text>
          <Text className={`text-sm ${TEXT_SECONDARY} mt-1`}>
            Order #{order?.order_number}
          </Text>
        </View>

        {/* Status Section */}
        <View className={`py-4 border-y ${BORDER_COLOR} mb-8 gap-4`}>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>Customer</Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              {order?.customer_name || "User"}
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>
              Payment Status
            </Text>
            <View
              className={`${order?.order_payment_status === "SUCCESS" ? "bg-green-500/10" : "bg-red-500/10"} px-4 py-1.5 rounded-full`}
            >
              <Text
                className={`${order?.order_payment_status === "FAILED" || order?.order_payment_status === "CANCELLED" ? "text-red-600" : "text-green-600"} text-xs font-poppins-semibold uppercase`}
              >
                {order?.order_payment_status || "Pending"}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>Date</Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              {format(new Date(order?.created_at || ""), "MMM dd, yyyy")}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        {order?.order_items && order.order_items.length > 0 && (
          <View className="mb-8">
            <Text
              className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px] mb-4`}
            >
              Services
            </Text>
            {order.order_items.map((item: OrderItem) => (
              <View
                className="flex-row justify-between items-center py-2"
                key={item.id || item.item_id}
              >
                <View className="flex-1 mr-4">
                  <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
                    {item.quantity}x {item.name}
                  </Text>
                  {item.size && (
                    <Text className="text-[10px] text-gray-400 mt-0.5 uppercase">
                      {item.size}
                    </Text>
                  )}
                </View>
                <Text className={`${TEXT_PRIMARY} font-poppins-semibold`}>
                  ₦
                  {Number(
                    (item.sizes?.[0]?.price ?? item.price) * item.quantity,
                  ).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Totals */}
        <View className={`pt-6 border-t ${BORDER_COLOR} gap-3`}>
          <View className="flex-row justify-between">
            <Text className={`${TEXT_SECONDARY} font-poppins`}>Subtotal</Text>
            <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
              ₦{itemsTotal.toFixed(2)}
            </Text>
          </View>
          {deliveryFee > 0 && (
            <View className="flex-row justify-between">
              <Text className={`${TEXT_SECONDARY} font-poppins`}>
                Delivery Fee
              </Text>
              <Text className={`${TEXT_PRIMARY} font-poppins-medium`}>
                ₦{deliveryFee.toFixed(2)}
              </Text>
            </View>
          )}
          <View className="flex-row justify-between items-center mt-2 group">
            <Text className={`${TEXT_PRIMARY} text-xl font-poppins-bold`}>
              Total Amount
            </Text>
            <Text className="text-xl font-poppins-bold text-blue-500">
              ₦{total.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Instructions */}
        {order.washing_instructions && (
          <View className={`mt-8 pt-8 border-t ${BORDER_COLOR}`}>
            <Text
              className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px] mb-4`}
            >
              Washing Instructions
            </Text>
            <View
              className={`p-4 rounded-xl ${isDark ? "bg-gray-700/30" : "bg-gray-50"} border ${BORDER_COLOR}`}
            >
              <Text
                className={`${TEXT_PRIMARY} text-xs leading-5 font-poppins`}
              >
                {order.washing_instructions}
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Details */}
        <View className={`mt-8 pt-8 border-t ${BORDER_COLOR}`}>
          <Text
            className={`${TEXT_PRIMARY} font-poppins-bold uppercase text-[10px] tracking-[2px] mb-4`}
          >
            Address Details
          </Text>

          <View className="gap-6">
            <View>
              <Text className="text-[10px] text-gray-400 font-poppins-bold uppercase mb-2">
                Delivery Address
              </Text>
              <View
                className={`p-4 rounded-xl ${isDark ? "bg-gray-700/30" : "bg-gray-50"} border ${BORDER_COLOR}`}
              >
                <Text
                  className={`${TEXT_PRIMARY} text-xs leading-5 font-poppins`}
                  numberOfLines={2}
                >
                  {data?.order?.destination || "Vendor Location"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons - Keep for testing */}
      <View className="items-center mt-5 gap-2">
        {showVendorButton && (
          <AppButton
            text={buttonConfig.text}
            onPress={handleOrderStatusUpdate}
            icon={
              laundryOrderMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                buttonConfig.icon
              )
            }
            variant="fill"
            borderRadius={50}
            width={"90%"}
            color={buttonConfig.color}
            disabled={buttonConfig.disabled || laundryOrderMutation.isPending}
          />
        )}

        <View className="flex-row gap-6  mt-2">
          {showReviewButton && !data?.order?.has_review && (
            <AppButton
              text="Leave a Review"
              width={!data?.order?.has_review ? "42.5%" : "90%"}
              borderRadius={50}
              disabled={
                data?.order?.order_status === "CANCELLED" ||
                data?.order?.order_status === "DELIVERED" ||
                data?.order?.order_status === "COMPLETED"
              }
              onPress={() =>
                router.push({
                  pathname: "/review/[id]",
                  params: {
                    id: order.id,
                    orderId: order.id,
                    orderType: "LAUNDRY",
                    revieweeId: order.vendor_id,
                  },
                })
              }
            />
          )}
          <AppButton
            text="Raise Dispute"
            width={
              showReviewButton && !data?.order?.has_review ? "42.5%" : "90%"
            }
            borderRadius={50}
            variant="outline"
            onPress={() =>
              router.push({
                pathname: "/report/[id]",
                params: {
                  id: order.id,
                  orderType: "LAUNDRY",
                  revieweeId: order.vendor_id,
                },
              })
            }
          />
        </View>
      </View>
      <Text className="text-center text-[10px] text-gray-500 mt-10 font-poppins tracking-widest uppercase">
        ServiPal Laundry • Laundry Service
      </Text>
    </ScrollView>
  );
};

export default LaundryReceiptPage;
