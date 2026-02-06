import {
  buyerRejectedItem,
  fetProductOrderDetails,
  orderDelivered,
  orderReceived,
  vendorRecivedRejectedItem,
} from "@/api/marketplace";
import ProductDetailWrapper from "@/components/ProductDetailWrapper";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { useUserStore } from "@/store/userStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";

const ProductDetail = () => {
  const { user } = useUserStore();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["product-order", orderId],
    queryFn: () => fetProductOrderDetails(orderId!),
    enabled: !!orderId,
  });

  const getButtonLabel = () => {
    if (
      user?.id === data?.vendor_id &&
      data?.order_payment_status === "paid" &&
      data?.order_status === "pending"
    ) {
      return "Mark as Delivered";
    }
    if (user?.id === data?.user_id && data?.order_status === "delivered") {
      return "Mark as Received";
    }
    // Return a more user-friendly status display
    const statusDisplay =
      data?.order_status === "received_rejected_product"
        ? "Return Confirmed"
        : data?.order_status?.toUpperCase();
    return statusDisplay || "UNKNOWN";
  };
  const label = getButtonLabel();
  const orderDeliveredMutation = useMutation({
    mutationFn: () => orderDelivered(orderId!),
    onSuccess: () => {
      showSuccess("Success", "Order marked as delivered");
      queryClient.invalidateQueries({ queryKey: ["product-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      refetch();
    },
    onError: (error) =>
      showError("Error", error.message || "Failed to deliver order"),
  });
  const orderReceiveddMutation = useMutation({
    mutationFn: () => orderReceived(orderId!),
    onSuccess: () => {
      showSuccess("Success", "Order marked as received");
      queryClient.invalidateQueries({ queryKey: ["product-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      refetch();
    },
    onError: (error) =>
      showError("Error", error.message || "Failed to deliver order"),
  });

  // Buyer rejecting item mutation
  const buyerRejectMutation = useMutation({
    mutationFn: () => buyerRejectedItem(orderId!),
    onSuccess: () => {
      showWarning("Success", "Item rejected.");
      queryClient.invalidateQueries({ queryKey: ["product-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) =>
      showError("Error", error.message || "Failed to reject item"),
  });

  // Vendor received rejected item mutation
  const vendorReceivedRejectedMutation = useMutation({
    mutationFn: () => vendorRecivedRejectedItem(orderId!),
    onSuccess: () => {
      showInfo("Success", "Rejected item received.");
      queryClient.invalidateQueries({ queryKey: ["product-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) =>
      showError(
        "Error",
        error.message || "Failed to confirm rejected item received",
      ),
  });

  const handleButtonPress = () => {
    // Customer trying to mark as received
    if (user?.id === data?.user_id) {
      // Already marked as received
      if (data?.order_status === "received") {
        showWarning("Warning", "Order has already been marked as received");
        return;
      }
      // Must be delivered first
      if (data?.order_status !== "delivered") {
        showWarning(
          "Warning",
          "Order must be delivered by vendor before you can mark it as received",
        );
        return;
      }
      // All checks passed, mark as received
      orderReceiveddMutation.mutate();
    }

    // Vendor trying to mark as delivered
    if (user?.id === data?.vendor_id) {
      if (data?.order_payment_status !== "paid") {
        showWarning("Warning", "Order must be paid before it can be delivered");
        return;
      }
      if (data?.order_status !== "pending") {
        showWarning("Warning", "Order has already been processed");
        return;
      }
      // All checks passed, mark as delivered
      orderDeliveredMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size={"large"} color={"gray"} />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <Text className="text-sm text-primary font-poppins-bold mb-6">
          Order not found
        </Text>
        <AppButton
          width={"50%"}
          borderRadius={50}
          text="Go Back"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(price);
  };

  const isBuyer = user?.id === data?.user_id;
  const isVendor = user?.id === data?.vendor_id;

  return (
    <ProductDetailWrapper images={data?.order_items[0]?.item?.images}>
      <View className="flex-1 bg-background rounded-t-[40px] -mt-10 pt-8 px-5 pb-24">
        {/* Header: Title & Price */}
        <View className="flex-row justify-between items-start mb-2 mt-2">
          <View className="flex-1 pr-4">
            <Text className="text-2xl font-poppins-bold text-slate-900 dark:text-white leading-tight capitalize">
              {data?.order_items[0]?.name}
            </Text>
            <View className="flex-row items-center gap-2 mt-2">
              <View className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                <Text className="text-xs text-slate-600 dark:text-slate-300 font-poppins-medium">
                  Order #{data?.order_number}
                </Text>
              </View>
              {isBuyer && (
                <TouchableOpacity
                  className="bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full border border-orange-100 dark:border-orange-800/30"
                  onPress={() =>
                    router.push({
                      pathname: "/review/[deliveryId]",
                      params: {
                        deliveryId: data?.order_items[0]?.item_id,
                        reviewType: "product",
                        itemId: data?.order_items[0]?.item_id,
                        revieweeId: user?.id,
                        orderId: data?.id,
                        orderType: data?.order_type,
                      },
                    })
                  }
                >
                  <Text className="text-orange-600 dark:text-orange-400 font-poppins-medium text-xs">
                    Write Review
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View className="items-end">
            <Text className="text-2xl font-poppins-bold text-orange-600 dark:text-orange-500">
              {formatPrice(Number(data.total_price))}
            </Text>
            <Text className="text-[10px] text-slate-400 font-poppins-light mt-1">
              {data?.order_items[0].quantity}{" "}
              {data?.order_items[0].quantity > 1 ? "items" : "item"}
            </Text>
          </View>
        </View>

        {/* Status Badges */}
        <View className="flex-row gap-3 my-6">
          <View
            className={`flex-1 px-4 py-3 rounded-2xl border ${
              data?.order_payment_status === "paid"
                ? "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/40"
                : "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/40"
            }`}
          >
            <Text className="text-[10px] uppercase tracking-wider font-poppins-medium text-slate-500 dark:text-slate-400 mb-1">
              Payment
            </Text>
            <Text
              className={`font-poppins-bold text-sm capitalize ${
                data?.order_payment_status === "paid"
                  ? "text-green-700 dark:text-green-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {data?.order_payment_status}
            </Text>
          </View>

          <View
            className={`flex-1 px-4 py-3 rounded-2xl border ${
              data?.order_status === "delivered" ||
              data?.order_status === "received"
                ? "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/40"
                : "bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700"
            }`}
          >
            <Text className="text-[10px] uppercase tracking-wider font-poppins-medium text-slate-500 dark:text-slate-400 mb-1">
              Status
            </Text>
            <Text
              className={`font-poppins-bold text-sm capitalize ${
                data?.order_status === "delivered" ||
                data?.order_status === "received"
                  ? "text-blue-700 dark:text-blue-400"
                  : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {data?.order_status === "received_rejected_product"
                ? "Return Confirmed"
                : data?.order_status}
            </Text>
          </View>
        </View>

        {/* Item Details Card */}
        <View className="bg-white dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-6 shadow-sm">
          <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white mb-4">
            Item Details
          </Text>

          <View className="flex-row flex-wrap gap-6">
            {/* Colors */}
            {data?.order_items[0].colors &&
              data?.order_items[0].colors.length > 0 && (
                <View>
                  <Text className="text-[10px] text-slate-400 font-poppins-medium mb-2 uppercase">
                    Colors
                  </Text>
                  <View className="flex-row gap-2">
                    {data?.order_items[0]?.colors?.map(
                      (color: string, index: number) => (
                        <View
                          key={index}
                          className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ),
                    )}
                  </View>
                </View>
              )}

            {/* Sizes */}
            {data?.order_items[0]?.item?.sizes &&
              data?.order_items[0]?.item?.sizes
                .split(",")
                .filter((s: string) => s.trim()).length > 0 && (
                <View>
                  <Text className="text-[10px] text-slate-400 font-poppins-medium mb-2 uppercase">
                    Sizes
                  </Text>
                  <View className="flex-row gap-2">
                    {data.order_items[0].item.sizes
                      .split(",")
                      .filter((size: string) => size?.trim())
                      .map((size: string, index: number) => (
                        <View
                          key={index}
                          className="h-8 min-w-[32px] px-3 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800"
                        >
                          <Text className="font-poppins-semibold text-xs text-slate-700 dark:text-slate-300">
                            {size.trim().toUpperCase()}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
          </View>
        </View>

        {/* Order Info Card */}
        <View className="bg-white dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mb-6 shadow-sm">
          <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white mb-3">
            {isVendor ? "Buyer Instructions" : "Order Notes"}
          </Text>
          <Text className="text-sm text-slate-600 dark:text-slate-400 font-poppins-light leading-6">
            {data?.additional_info || "No additional instructions provided."}
          </Text>
        </View>

        {/* Payment Summary */}
        <View className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-5 mb-8">
          <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white mb-4">
            Payment Summary
          </Text>
          <View className="gap-3">
            <View className="flex-row justify-between">
              <Text className="text-slate-500 font-poppins text-xs">
                Item Total ({data?.order_items[0].quantity}x)
              </Text>
              <Text className="text-slate-700 dark:text-slate-300 font-poppins-medium text-xs">
                {formatPrice(
                  Number(data.order_items[0].price) *
                    data?.order_items[0].quantity,
                )}
              </Text>
            </View>

            {isBuyer && (
              <>
                <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-1" />
                <View className="flex-row justify-between items-center">
                  <Text className="text-slate-900 dark:text-white font-poppins-bold text-sm">
                    Total Amount
                  </Text>
                  <Text className="text-orange-600 dark:text-orange-500 font-poppins-bold text-lg">
                    {formatPrice(Number(data.total_price))}
                  </Text>
                </View>
              </>
            )}

            {isVendor && (
              <>
                <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-1" />
                <View className="flex-row justify-between items-center bg-green-50 dark:bg-green-900/10 p-3 rounded-xl">
                  <Text className="text-green-800 dark:text-green-400 font-poppins-bold text-sm">
                    Vendor Payout
                  </Text>
                  <Text className="text-green-700 dark:text-green-400 font-poppins-bold text-lg">
                    {formatPrice(Number(data?.amount_due_vendor))}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      {/* Floating Action Bar */}
      {(isVendor &&
        (data?.order_status === "pending" ||
          data?.order_status === "rejected")) ||
      (isBuyer &&
        (data?.order_payment_status === "pending" ||
          data?.order_status === "delivered")) ? (
        <View className="absolute bottom-0 left-0 right-0 bg-background border-t border-slate-100 dark:border-slate-800 px-4 py-4 pb-8 flex-row items-center gap-3">
          {/* Reject Actions (Secondary) */}
          {isBuyer && data?.order_status === "delivered" && (
            <AppButton
              text="Reject"
              variant="outline"
              width="35%"
              borderRadius={50}
              onPress={() => buyerRejectMutation.mutate()}
              disabled={buyerRejectMutation.isPending}
              color="#EF4444"
              textStyle={{ color: "#EF4444" }}
            />
          )}

          {/* Primary Actions */}
          <View className="flex-1">
            {isVendor &&
              data?.order_status === "pending" &&
              data?.order_payment_status === "paid" && (
                <AppButton
                  text="Mark Delivered"
                  width="100%"
                  borderRadius={50}
                  onPress={orderDeliveredMutation.mutate}
                  disabled={orderDeliveredMutation.isPending}
                />
              )}

            {isVendor && data?.order_status === "rejected" && (
              <AppButton
                text="Confirm Return"
                width="100%"
                borderRadius={50}
                onPress={vendorReceivedRejectedMutation.mutate}
                disabled={vendorReceivedRejectedMutation.isPending}
              />
            )}

            {isBuyer && data?.order_payment_status === "pending" && (
              <AppButton
                text="Pay Now"
                width="100%"
                borderRadius={50}
                onPress={() => console.log("Pay Now")}
              />
            )}

            {isBuyer && data?.order_status === "delivered" && (
              <AppButton
                text="Mark Received"
                width="100%"
                borderRadius={50}
                onPress={handleButtonPress}
                disabled={orderReceiveddMutation.isPending}
              />
            )}
          </View>
        </View>
      ) : null}
    </ProductDetailWrapper>
  );
};

export default ProductDetail;
