import { getOrderDetails, updateOrderStatus } from "@/api/product";
import ProductDetailWrapper from "@/components/ProductDetailWrapper";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { useUserStore } from "@/store/userStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus =
  | "PENDING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED"
  | "RETURNED"
  | "DISPUTED";

interface ActionButton {
  label: string;
  newStatus: OrderStatus;
  variant?: "fill" | "outline" | "ghost";
  color?: string;
  isPrimary: boolean;
}

// ─── State Machine ────────────────────────────────────────────────────────────
// paymentStatus check is case-insensitive to guard against API casing differences

function getAvailableActions(
  orderStatus: OrderStatus,
  paymentStatus: string,
  role: "CUSTOMER" | "VENDOR",
): ActionButton[] {
  const actions: ActionButton[] = [];
  const isPaid = paymentStatus?.toUpperCase() === "SUCCESS";

  if (role === "VENDOR") {
    switch (orderStatus) {
      case "PENDING":
        if (isPaid) {
          actions.push({
            label: "Mark as Shipped",
            newStatus: "SHIPPED",
            isPrimary: true,
          });
        }
        actions.push({
          label: "Cancel Order",
          newStatus: "CANCELLED",
          variant: "outline",
          color: "#EF4444",
          isPrimary: false,
        });
        break;

      case "SHIPPED":
        actions.push({
          label: "Mark as Delivered",
          newStatus: "DELIVERED",
          isPrimary: true,
        });
        actions.push({
          label: "Dispute",
          newStatus: "DISPUTED",
          variant: "outline",
          color: "#F59E0B",
          isPrimary: false,
        });
        break;

      case "CANCELLED":
      case "REJECTED":
        actions.push({
          label: "Confirm Item Returned",
          newStatus: "RETURNED",
          isPrimary: true,
        });
        break;

      case "RETURNED":
        actions.push({
          label: "Release Payment",
          newStatus: "COMPLETED",
          isPrimary: true,
        });
        break;

      default:
        break;
    }
  }

  if (role === "CUSTOMER") {
    switch (orderStatus) {
      case "PENDING":
        actions.push({
          label: "Cancel Order",
          newStatus: "CANCELLED",
          variant: "outline",
          color: "#EF4444",
          isPrimary: false,
        });
        break;

      case "SHIPPED":
        actions.push({
          label: "Dispute",
          newStatus: "DISPUTED",
          variant: "outline",
          color: "#F59E0B",
          isPrimary: false,
        });
        break;

      case "DELIVERED":
        actions.push({
          label: "Mark as Received",
          newStatus: "COMPLETED",
          isPrimary: true,
        });
        actions.push({
          label: "Reject Item",
          newStatus: "REJECTED",
          variant: "outline",
          color: "#EF4444",
          isPrimary: false,
        });
        actions.push({
          label: "Dispute",
          newStatus: "DISPUTED",
          variant: "outline",
          color: "#F59E0B",
          isPrimary: false,
        });
        break;

      default:
        break;
    }
  }

  return actions;
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
  RETURNED: "Returned",
  DISPUTED: "Disputed",
};

const STATUS_COLORS: Record<
  OrderStatus,
  { bg: string; border: string; text: string }
> = {
  PENDING: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-100 dark:border-amber-900/40",
    text: "text-amber-700 dark:text-amber-400",
  },
  SHIPPED: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-100 dark:border-blue-900/40",
    text: "text-blue-700 dark:text-blue-400",
  },
  DELIVERED: {
    bg: "bg-indigo-50 dark:bg-indigo-900/20",
    border: "border-indigo-100 dark:border-indigo-900/40",
    text: "text-indigo-700 dark:text-indigo-400",
  },
  COMPLETED: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-100 dark:border-green-900/40",
    text: "text-green-700 dark:text-green-400",
  },
  CANCELLED: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-100 dark:border-red-900/40",
    text: "text-red-700 dark:text-red-400",
  },
  REJECTED: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-100 dark:border-red-900/40",
    text: "text-red-700 dark:text-red-400",
  },
  RETURNED: {
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-100 dark:border-purple-900/40",
    text: "text-purple-700 dark:text-purple-400",
  },
  DISPUTED: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-100 dark:border-orange-900/40",
    text: "text-orange-700 dark:text-orange-400",
  },
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(price);

// ─── Component ────────────────────────────────────────────────────────────────

const ProductDetail = () => {
  const { user } = useUserStore();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["product-order", orderId],
    queryFn: () => getOrderDetails(orderId!),
    enabled: !!orderId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["product-order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["product-orders"] });
    refetch();
  };

  const statusMutation = useMutation({
    mutationFn: ({
      newStatus,
      cancelReason,
    }: {
      newStatus: OrderStatus;
      cancelReason?: string;
    }) => updateOrderStatus({ orderId: orderId!, newStatus, cancelReason }),
    onSuccess: (_, variables) => {
      const messages: Partial<Record<OrderStatus, string>> = {
        SHIPPED: "Order marked as shipped",
        DELIVERED: "Order marked as delivered",
        COMPLETED: "Order completed. Payment released.",
        CANCELLED: "Order has been cancelled",
        REJECTED: "Item rejected",
        RETURNED: "Item return confirmed",
        DISPUTED: "Dispute raised successfully",
      };
      showSuccess("Success", messages[variables.newStatus] ?? "Order updated");
      invalidate();
    },
    onError: (error: any) =>
      showError("Error", error?.message ?? "Failed to update order"),
  });

  const handleAction = (action: ActionButton) => {
    statusMutation.mutate({ newStatus: action.newStatus });
  };

  // ─── Loading / Empty ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="gray" />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-6">
        <Text className="text-sm text-primary font-poppins-bold mb-6">
          Order not found
        </Text>
        <AppButton
          width="50%"
          borderRadius={50}
          text="Go Back"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const isVendor = user?.id === data.vendor_id;
  const isBuyer = user?.id === data.customer_id;
  const role: "CUSTOMER" | "VENDOR" = isVendor ? "VENDOR" : "CUSTOMER";

  const orderStatus = (data.order_status as OrderStatus) ?? "PENDING";
  const statusStyle = STATUS_COLORS[orderStatus] ?? STATUS_COLORS.PENDING;
  const statusLabel = STATUS_LABELS[orderStatus] ?? String(orderStatus);

  const actions = getAvailableActions(
    orderStatus,
    data.payment_status ?? "",
    role,
  );
  const primaryAction = actions.find((a) => a.isPrimary);
  const secondaryActions = actions.filter((a) => !a.isPrimary);
  const hasActions = actions.length > 0;

  const item = data.items?.[0];
  const itemQuantity = Number(item?.quantity ?? 1);
  const itemPrice = Number(item?.price ?? 0);
  const shippingCost = Number(data.shipping_cost ?? 0);

  return (
    <ProductDetailWrapper images={item?.images ?? []}>
      <View
        className="flex-1 bg-background rounded-t-[40px] -mt-10 pt-8 px-5"
        style={{ paddingBottom: hasActions ? 100 : 32 }}
      >
        {/* Header */}
        <View className="flex-row justify-between items-start mb-2 mt-2">
          <View className="flex-1 pr-4">
            <Text
              className="text-2xl font-poppins-bold text-slate-900 dark:text-white leading-tight capitalize"
              numberOfLines={2}
            >
              {String(item?.name ?? "")}
            </Text>
            <View className="flex-row items-center gap-2 mt-2">
              <View className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                <Text className="text-xs text-slate-600 dark:text-slate-300 font-poppins-medium">
                  {"Order #" + String(data.order_number ?? "")}
                </Text>
              </View>
              <TouchableOpacity
                className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700"
                onPress={() =>
                  router.push({
                    pathname: "/product-detail/product-receipt",
                    params: { orderId: data.id },
                  })
                }
              >
                <Text className="text-slate-600 dark:text-slate-300 font-poppins-medium text-xs">
                  View Receipt
                </Text>
              </TouchableOpacity>
              {isBuyer && orderStatus === "COMPLETED" && !data?.has_review && (
                <TouchableOpacity
                  className="bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full border border-orange-100 dark:border-orange-800/30"
                  onPress={() =>
                    router.push({
                      pathname: "/review/[id]",
                      params: {
                        id: item?.id,
                        reviewType: "PRODUCT",
                        itemId: item?.id,
                        revieweeId: user?.id,
                        orderId: data.id,
                        orderType: "PRODUCT",
                      },
                    })
                  }
                >
                  <Text className="text-orange-600 dark:text-orange-400 font-poppins-medium text-xs">
                    Review
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View className="items-end">
            <Text className="text-2xl font-poppins-bold text-orange-600 dark:text-orange-500">
              {formatPrice(Number(data.grand_total ?? 0))}
            </Text>
            <Text className="text-[10px] text-slate-400 font-poppins-light mt-1">
              {String(itemQuantity) +
                " " +
                (itemQuantity > 1 ? "items" : "item")}
            </Text>
          </View>
        </View>

        {/* Status Badges */}
        <View className="flex-row gap-3 my-6">
          <View
            className={
              "flex-1 px-4 py-3 rounded-2xl border " +
              (data.payment_status?.toUpperCase() === "SUCCESS"
                ? "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/40"
                : "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40")
            }
          >
            <Text className="text-[10px] uppercase tracking-wider font-poppins-medium text-slate-500 dark:text-slate-400 mb-1">
              Payment
            </Text>
            <Text
              className={
                "font-poppins-bold text-sm capitalize " +
                (data.payment_status?.toUpperCase() === "SUCCESS"
                  ? "text-green-700 dark:text-green-400"
                  : "text-amber-700 dark:text-amber-400")
              }
            >
              {String(data.payment_status ?? "").toLowerCase()}
            </Text>
          </View>

          <View
            className={
              "flex-1 px-4 py-3 rounded-2xl border " +
              statusStyle.bg +
              " " +
              statusStyle.border
            }
          >
            <Text className="text-[10px] uppercase tracking-wider font-poppins-medium text-slate-500 dark:text-slate-400 mb-1">
              Status
            </Text>
            <Text className={"font-poppins-bold text-sm " + statusStyle.text}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Disputed Banner */}
        {orderStatus === "DISPUTED" && (
          <View className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-2xl p-4 mb-6 flex-row items-center gap-3">
            <Text className="text-2xl">{"⚠️"}</Text>
            <View className="flex-1">
              <Text className="text-orange-800 dark:text-orange-300 font-poppins-bold text-sm">
                Order Under Dispute
              </Text>
              <Text className="text-orange-600 dark:text-orange-400 font-poppins text-xs mt-1">
                This order is being reviewed by our team. Funds are held until
                resolved.
              </Text>
            </View>
          </View>
        )}

        {/* Return Flow Banner */}
        {orderStatus === "RETURNED" && (
          <View className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 rounded-2xl p-4 mb-6 flex-row items-center gap-3">
            <Text className="text-2xl">{"📦"}</Text>
            <View className="flex-1">
              <Text className="text-purple-800 dark:text-purple-300 font-poppins-bold text-sm">
                {isVendor ? "Item Returned by Buyer" : "Return in Progress"}
              </Text>
              <Text className="text-purple-600 dark:text-purple-400 font-poppins text-xs mt-1">
                {isVendor
                  ? "Confirm receipt and release payment to complete the return."
                  : "Vendor is confirming your return. Funds released once confirmed."}
              </Text>
            </View>
          </View>
        )}

        {/* Item Details */}
        <View className="bg-input rounded-2xl p-4 mb-6">
          <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white mb-4">
            Item Details
          </Text>
          <View className="flex-row flex-wrap gap-6">
            {Array.isArray(item?.selected_color) &&
              item.selected_color.length > 0 && (
                <View>
                  <Text className="text-[10px] text-slate-400 font-poppins-medium mb-2 uppercase">
                    Colors
                  </Text>
                  <View className="flex-row gap-2">
                    {item.selected_color.map((color: string, i: number) => (
                      <View
                        key={i}
                        className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700"
                        style={{ backgroundColor: String(color ?? "#ccc") }}
                      />
                    ))}
                  </View>
                </View>
              )}
            {Array.isArray(item?.selected_size) &&
              item.selected_size.length > 0 && (
                <View>
                  <Text className="text-[10px] text-slate-400 font-poppins-medium mb-2 uppercase">
                    Sizes
                  </Text>
                  <View className="flex-row gap-2">
                    {item.selected_size.map((size: string, i: number) => (
                      <View
                        key={i}
                        className="h-8 min-w-[32px] px-3 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"
                      >
                        <Text className="font-poppins-semibold text-xs text-slate-700 dark:text-slate-300">
                          {String(size ?? "")
                            .trim()
                            .toUpperCase()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
          </View>
        </View>

        {/* Order Notes */}
        <View className="bg-input rounded-2xl p-4 mb-6">
          <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white mb-3">
            {isVendor ? "Buyer Instructions" : "Order Notes"}
          </Text>
          <Text className="text-sm text-slate-600 dark:text-slate-400 font-poppins-light leading-6">
            {String(
              data.additional_info || "No additional instructions provided.",
            )}
          </Text>
        </View>

        {/* Delivery Info */}
        {!!data.delivery_address && (
          <View className="bg-input rounded-2xl p-4 mb-6">
            <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white mb-3">
              Delivery Info
            </Text>
            <Text className="text-sm text-slate-600 dark:text-slate-400 font-poppins-light">
              {"📍 " + String(data.delivery_address)}
            </Text>
            {!!data.delivery_option && (
              <Text className="text-xs text-slate-400 font-poppins-medium mt-1 uppercase">
                {String(data.delivery_option).replace(/_/g, " ")}
              </Text>
            )}
          </View>
        )}

        {/* Payment Summary */}
        <View className="bg-input rounded-2xl p-5 mb-4">
          <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white mb-4">
            Payment Summary
          </Text>
          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-poppins text-xs">
                {"Item Total (" + String(itemQuantity) + "x)"}
              </Text>
              <Text className="text-slate-700 dark:text-slate-300 font-poppins-medium text-xs">
                {formatPrice(itemPrice * itemQuantity)}
              </Text>
            </View>

            {shippingCost > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-slate-500 font-poppins text-xs">
                  Shipping
                </Text>
                <Text className="text-slate-700 dark:text-slate-300 font-poppins-medium text-xs">
                  {formatPrice(shippingCost)}
                </Text>
              </View>
            )}

            <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-1" />

            {isBuyer && (
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-900 dark:text-white font-poppins-bold text-sm">
                  Total Amount
                </Text>
                <Text className="text-orange-600 dark:text-orange-500 font-poppins-bold text-lg">
                  {formatPrice(Number(data.grand_total ?? 0))}
                </Text>
              </View>
            )}

            {isVendor && (
              <View className="flex-row justify-between items-center bg-green-50 dark:bg-green-900/10 p-3 rounded-xl">
                <Text className="text-green-800 dark:text-green-400 font-poppins-bold text-sm">
                  Your Payout
                </Text>
                <Text className="text-green-700 dark:text-green-400 font-poppins-bold text-lg">
                  {formatPrice(Number(data.amount_due_vendor ?? 0))}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Floating Action Bar ─────────────────────────────────────────────── */}
      {hasActions && (
        <View className="absolute bottom-0 left-0 right-0 bg-background border-t border-slate-100 dark:border-slate-800 px-4 py-4 pb-8">
          <View className="flex-row items-center gap-3">
            {secondaryActions.map((action) => (
              <AppButton
                key={action.newStatus}
                text={action.label}
                variant={action.variant ?? "outline"}
                width={secondaryActions.length > 1 ? "28%" : "35%"}
                borderRadius={50}
                color={action.color ?? "#EF4444"}
                borderColor={action.color ?? "#EF4444"}
                textStyle={{ color: action.color ?? "#EF4444", fontSize: 12 }}
                onPress={() => handleAction(action)}
                disabled={statusMutation.isPending}
              />
            ))}

            {primaryAction && (
              <View className="flex-1">
                <AppButton
                  text={
                    statusMutation.isPending &&
                    statusMutation.variables?.newStatus ===
                      primaryAction.newStatus
                      ? "Updating..."
                      : primaryAction.label
                  }
                  width="100%"
                  borderRadius={50}
                  onPress={() => handleAction(primaryAction)}
                  disabled={statusMutation.isPending}
                />
              </View>
            )}

            {!primaryAction && secondaryActions.length > 0 && (
              <View className="flex-1" />
            )}
          </View>
        </View>
      )}
    </ProductDetailWrapper>
  );
};

export default ProductDetail;
