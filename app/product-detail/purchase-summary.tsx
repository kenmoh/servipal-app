import { initiateProductPayment } from "@/api/product";
import { AppButton } from "@/components/ui/app-button";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { usePurchaseActions, usePurchaseSelectors } from "@/store/productStore";
import { useUserStore } from "@/store/userStore";
import { ProductOrderCreateRequest } from "@/types/product-types";
import { navigateToPayment } from "@/utils/payment-utils";
import { Ionicons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

const PurchaseSummary = () => {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const theme = useColorScheme();
  const router = useRouter();
  const { user } = useUserStore();
  const queryClient = useQueryClient();

  const { product, quantity, selectedSizes, selectedColors, additionalInfo } =
    usePurchaseSelectors();

  const {
    setAdditionalInfo,
    resetPurchase,
    validatePurchase,
    incrementQuantity,
    decrementQuantity,
  } = usePurchaseActions();

  // Redirect if no product data
  useEffect(() => {
    if (!product) {
      Alert.alert("Error", "No product selected", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [product]);

  const buyMutation = useMutation({
    mutationFn: (data: ProductOrderCreateRequest) =>
      initiateProductPayment(data),
    onSuccess: (responseData) => {
      Alert.alert(
        "Order Placed!",
        "Your order has been created successfully. Proceed to payment to complete your purchase.",
        [
          {
            text: "Go to Payment",
            onPress: () => {
              resetPurchase();
              navigateToPayment(responseData);
            },
          },
        ],
      );
      queryClient.invalidateQueries({ queryKey: ["products", user?.id] });
    },
    onError: (error: any) => {
      Alert.alert(
        "Order Failed",
        error.message || "Failed to process your order. Please try again.",
      );
    },
  });

  const handlePurchase = () => {
    if (!product) return;

    const validation = validatePurchase();

    if (user?.id === product.vendor_id) {
      Alert.alert(
        "Action Not Allowed",
        "You cannot purchase your own product.",
      );
      return;
    }

    if (!validation.isValid) {
      Alert.alert("Information Required", validation.errors[0]);
      return;
    }

    const buyData: ProductOrderCreateRequest = {
      vendor_id: product.vendor_id,
      item_id: product.id,
      quantity,
      sizes: selectedSizes,
      colors: selectedColors,
      images: product.images || [],
      delivery_option: "VENDOR_DELIVERY",
      delivery_address: additionalInfo,
      additional_info: "",
    };

    Alert.alert(
      "Confirm Purchase",
      `Place order for ${formatPrice(Number(product?.price) * quantity)}?`,
      [
        { text: "Review", style: "cancel" },
        {
          text: "Place Order",
          onPress: () => buyMutation.mutate(buyData),
          style: "default",
        },
      ],
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const unitPrice = product ? Number(product.price) : 0;

  if (!product) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="text-slate-500 font-poppins-medium mt-4">
          Preparing your summary...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Order Summary",
          headerShadowVisible: false,
          headerTintColor: theme === "dark" ? "#fff" : "#000",
          headerTitleStyle: {
            fontFamily: "Poppins-Bold",
            fontSize: 18,
          },
          headerStyle: {
            backgroundColor:
              theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
          },
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        className="bg-background"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="p-2 gap-3">
            {/* Steps Indicator */}
            <View className="flex-row items-center justify-center mb-2">
              <View className="flex-row items-center">
                <View className="w-6 h-6 rounded-full bg-green-500 items-center justify-center">
                  <Ionicons name="checkmark" size={14} color="white" />
                </View>
                <Text className="text-[10px] font-poppins-medium text-green-600 ml-1">
                  Detail
                </Text>
              </View>
              <View className="w-8 h-[1px] bg-green-500 mx-2" />
              <View className="flex-row items-center">
                <View className="w-6 h-6 rounded-full bg-orange-500 items-center justify-center">
                  <Text className="text-white text-[10px] font-poppins-bold">
                    2
                  </Text>
                </View>
                <Text className="text-[10px] font-poppins-medium text-orange-600 ml-1">
                  Summary
                </Text>
              </View>
              <View className="w-8 h-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />
              <View className="flex-row items-center">
                <View className="w-6 h-6 rounded-full bg-input items-center justify-center">
                  <Text className="text-slate-400 text-[10px] font-poppins-bold">
                    3
                  </Text>
                </View>
                <Text className="text-[10px] font-poppins-medium text-slate-400 ml-1">
                  Payment
                </Text>
              </View>
            </View>

            {/* Product Card */}
            <View className="bg-input rounded-3xl p-4 flex-row items-center border border-slate-100 dark:border-slate-800">
              <View className="w-24 h-24 rounded-2xl overflow-hidden bg-background">
                {product.images && product.images.length > 0 ? (
                  <Image
                    source={{ uri: product.images[0] }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full justify-center items-center">
                    <Ionicons name="image-outline" size={32} color="#94A3B8" />
                  </View>
                )}
              </View>
              <View className="flex-1 ml-4 justify-between h-24 py-1">
                <View>
                  <Text
                    className="text-slate-900 dark:text-white font-poppins-bold text-base"
                    numberOfLines={1}
                  >
                    {product.name}
                  </Text>
                  <Text className="text-slate-400 font-poppins-light text-xs">
                    {"Official Store"}
                  </Text>
                </View>
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-orange-600 dark:text-orange-500 font-poppins-bold text-lg">
                    {formatPrice(unitPrice)}
                  </Text>
                  <Text className="text-slate-400 font-poppins-light text-[10px]">
                    / unit
                  </Text>
                </View>
              </View>
            </View>

            {/* Selection Summary */}
            <View className="bg-input rounded-3xl p-5 border border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center mb-4">
                <Feather name="package" size={18} color="#F97316" />
                <Text className="text-slate-900 dark:text-white font-poppins-bold text-sm ml-2">
                  Order Details
                </Text>
              </View>

              <View className="space-y-4">
                {/* Variant Info Row */}
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="text-[10px] text-slate-400 font-poppins-medium uppercase tracking-wider mb-2">
                      Configurations
                    </Text>
                    <View className="flex-row flex-wrap gap-2 py-1">
                      {selectedColors.map((color, i) => (
                        <View
                          key={`c-${i}`}
                          className="flex-row items-center bg-background px-2 py-1 rounded-full border border-slate-100 dark:border-slate-700"
                        >
                          <View
                            className="w-3 h-3 rounded-full mr-1.5"
                            style={{
                              backgroundColor: color,
                              borderWidth: 1,
                              borderColor: "#e2e8f0",
                            }}
                          />
                          <Text className="text-[10px] text-slate-600 dark:text-slate-300 font-poppins-medium capitalize">
                            {color}
                          </Text>
                        </View>
                      ))}
                      {selectedSizes.map((size, i) => (
                        <View
                          key={`s-${i}`}
                          className="bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full border border-orange-100 dark:border-orange-800"
                        >
                          <Text className="text-[10px] text-orange-600 dark:text-orange-400 font-poppins-bold">
                            {size.toUpperCase()}
                          </Text>
                        </View>
                      ))}
                      {selectedColors.length === 0 &&
                        selectedSizes.length === 0 && (
                          <Text className="text-slate-400 text-[10px] font-poppins-light italic">
                            Default variant
                          </Text>
                        )}
                    </View>
                  </View>
                </View>

                {/* Quantity Control */}
                {/* <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-2" /> */}
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-[10px] text-slate-400 font-poppins-medium uppercase tracking-wider">
                      Quantity
                    </Text>
                    <Text className="text-slate-900 dark:text-white font-poppins-bold text-sm mt-0.5">
                      {quantity} Items
                    </Text>
                  </View>
                  <View className="flex-row items-center bg-background rounded-xl p-1">
                    <TouchableOpacity
                      onPress={decrementQuantity}
                      disabled={quantity <= 1}
                      className={`w-8 h-8 items-center justify-center rounded-lg ${quantity <= 1 ? "opacity-20" : "opacity-100"}`}
                    >
                      <Ionicons name="remove" size={16} color="#64748B" />
                    </TouchableOpacity>
                    <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white px-3 min-w-[30px] text-center">
                      {quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={incrementQuantity}
                      disabled={quantity >= product.stock}
                      className={`w-8 h-8 items-center justify-center rounded-lg ${quantity >= product.stock ? "opacity-20" : "opacity-100"}`}
                    >
                      <Ionicons name="add" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Delivery Information */}
            <View className="bg-input rounded-3xl p-5 border border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center mb-4">
                <Feather name="map-pin" size={18} color="#F97316" />
                <Text className="text-slate-900 dark:text-white font-poppins-bold text-sm ml-2">
                  Delivery Details
                </Text>
              </View>

              <Text className="text-xs text-slate-400 font-poppins-light mb-4 leading-5">
                Ensure your shipping address is accurate to avoid delays in
                processing your order.
              </Text>

              <View className="relative">
                <TextInput
                  value={additionalInfo}
                  onChangeText={setAdditionalInfo}
                  placeholder="Enter full delivery address and special instructions..."
                  multiline
                  numberOfLines={4}
                  className="p-4 rounded-2xl text-slate-900 dark:text-white font-poppins-medium bg-background text-sm border border-slate-100 dark:border-slate-700 h-32"
                  placeholderTextColor="#94A3B8"
                  textAlignVertical="top"
                />
                {!additionalInfo && (
                  <View className="absolute right-4 bottom-4">
                    <Ionicons
                      name="alert-circle-outline"
                      size={18}
                      color="#F97316"
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Summary & Price Breakdown */}
            <View className="bg-input rounded-3xl p-5 border border-slate-100 dark:border-slate-800">
              <View className="flex-row items-center mb-4">
                <Feather name="credit-card" size={18} color="#F97316" />
                <Text className="text-slate-900 dark:text-white font-poppins-bold text-sm ml-2">
                  Checkout Details
                </Text>
              </View>

              <View className="space-y-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-400 font-poppins-medium">
                    Subtotal ({quantity} items)
                  </Text>
                  <Text className="text-xs text-slate-900 dark:text-slate-200 font-poppins-medium">
                    {formatPrice(unitPrice * quantity)}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-slate-400 font-poppins-medium">
                    Shipping Fee
                  </Text>
                  <Text className="text-[10px] text-green-500 font-poppins-bold uppercase">
                    Calculated at Payment
                  </Text>
                </View>
                <View className="h-[1px] bg-background my-1" />
                <View className="flex-row justify-between items-center pt-1">
                  <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white">
                    Order Total
                  </Text>
                  <Text className="text-xl font-poppins-bold text-orange-600 dark:text-orange-500">
                    {formatPrice(unitPrice * quantity)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Terms Hint */}
            <View className="flex-row items-start px-2 mb-2">
              <Feather name="check-circle" size={16} color="#94A3B8" />
              <Text className="text-[10px] text-slate-400 font-poppins-light ml-2 leading-4">
                I agree to the{" "}
                <Text className="text-orange-500 dark:text-orange-400 font-poppins-medium underline">
                  Terms of Service
                </Text>{" "}
                and understand that orders are finalized upon successful
                payment.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Floating Action Button */}
        <View className="absolute bottom-0 left-0 right-0 bg-background border-t border-slate-100 dark:border-slate-800 px-6 py-4 pb-10 blur-xl">
          <AppButton
            text="Confirm & Pay"
            onPress={handlePurchase}
            disabled={buyMutation.isPending}
            borderRadius={50}
            height={50}
            icon={<Feather name="credit-card" size={20} color="white" />}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  fabShadow: {
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
});

export default PurchaseSummary;
