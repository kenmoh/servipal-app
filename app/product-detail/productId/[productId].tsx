import { fetchProduct } from "@/api/product";
import { buyItem } from "@/api/product-ignore";
import { ReviewsService } from "@/api/review";

import HDivider from "@/components/HDivider";
import ProductDetailWrapper from "@/components/ProductDetailWrapper";
import { AppButton } from "@/components/ui/app-button";
import { usePurchaseActions, usePurchaseSelectors } from "@/store/productStore";
import { Ionicons } from "@expo/vector-icons";
import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ProductDetail = () => {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const {
    setProduct,
    clearProduct,
    incrementQuantity,
    decrementQuantity,
    toggleColor,
    toggleSize,
    clearColors,
    clearSizes,
  } = usePurchaseActions();

  const { product, quantity, selectedSizes, selectedColors, availableSizes } =
    usePurchaseSelectors();

  const { data, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => {
      if (!productId) throw new Error("Product ID is required");
      return fetchProduct(productId);
    },
    enabled: !!productId,
  });

  const { data: reviewSummary } = useQuery({
    queryKey: ["review-summary", productId],
    queryFn: () => ReviewsService.fetchReviewSummary({ item_id: productId }),
    enabled: !!productId,
  });

  useEffect(() => {
    if (data) {
      setProduct(data);
    }

    // Cleanup when component unmounts
    return () => {
      clearProduct();
    };
  }, [data, setProduct, clearProduct]);

  const buyMutation = useMutation({
    mutationFn: (data: any) => buyItem(productId!, data),
    onSuccess: () => {
      Alert.alert("Success", "Product added to cart successfully!");
      router.back();
    },
    onError: (error) => {
      Alert.alert("Error", error.message || "Failed to process request");
    },
  });

  const isColorSelected = (color: string) => selectedColors.includes(color);
  const isSizeSelected = (size: string) => selectedSizes.includes(size);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-background">
        <ActivityIndicator size={"large"} color="#F97316" />
        <Text className="mt-4 text-slate-500 font-poppins-medium">
          Loading product details...
        </Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View className="flex-1 justify-center items-center bg-background px-6">
        <View className="bg-input p-6 rounded-3xl items-center w-full">
          <Ionicons name="search-outline" size={64} color="#94A3B8" />
          <Text className="text-xl text-slate-900 dark:text-white font-poppins-bold mt-4 mb-2">
            Product Not Found
          </Text>
          <Text className="text-slate-500 text-center font-poppins-light mb-8">
            The product you're looking for might have been removed or is
            temporarily unavailable.
          </Text>
          <AppButton
            width={"100%"}
            text="Go Back"
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  const handleContinueToPurchase = () => {
    if (selectedColors.length > 0 && selectedColors.length !== quantity) {
      Alert.alert(
        "Selection Required",
        `Please select exactly ${quantity} color${quantity > 1 ? "s" : ""} to match your quantity.`,
      );
      return;
    }

    router.push({
      pathname: "/product-detail/purchase-summary",
      params: { productId: productId },
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <ProductDetailWrapper images={product.images}>
      <View className="flex-1 bg-background rounded-t-[40px] -mt-10 pt-8 px-3 pb-24">
        {/* Header: Title & Rating */}
        <View className="flex-row justify-between items-start mb-2 mt-5">
          <View className="flex-1 pr-4">
            <Text className="text-2xl font-poppins-bold text-slate-900 dark:text-white leading-tight capitalize">
              {product.name}
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-1 mt-1"
              onPress={() =>
                router.push({
                  pathname: "/product-detail/product-reviews",
                  params: { productId: product.id },
                })
              }
            >
              <View className="flex-row items-center bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-full">
                <Ionicons name="star" size={14} color="#F97316" />
                <Text className="text-orange-600 dark:text-orange-400 font-poppins-medium text-xs ml-1">
                  {reviewSummary?.average_rating?.toFixed(1) || "0.0"}
                </Text>
              </View>
              <Text className="text-slate-400 font-poppins-light text-xs ml-1">
                ({reviewSummary?.total_reviews || 0} Reviews)
              </Text>
            </TouchableOpacity>
          </View>
          <View className="items-end">
            <Text className="text-2xl font-poppins-bold text-orange-600 dark:text-orange-500">
              {formatPrice(Number(product.price))}
            </Text>
            <Text className="text-[10px] text-slate-400 font-poppins-light mt-1">
              {product.total_sold || 0} units sold
            </Text>
          </View>
        </View>

        {/* Quick Info/Badges */}
        <HDivider />
        <View className="flex-row justify-between my-4">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-input items-center justify-center">
              <Feather name="truck" size={16} color="#64748B" />
            </View>
            <View>
              <Text className="text-[10px] text-slate-400 font-poppins-light">
                Shipping
              </Text>
              <Text className="text-xs text-slate-900 dark:text-slate-200 font-poppins-medium">
                Free Delivery
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-input items-center justify-center">
              <Feather name="refresh-ccw" size={16} color="#64748B" />
            </View>
            <View>
              <Text className="text-[10px] text-slate-400 font-poppins-light">
                Returns
              </Text>
              <Text className="text-xs text-slate-900 dark:text-slate-200 font-poppins-medium">
                30 Days Free
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-input items-center justify-center">
              <Feather name="shield" size={16} color="#64748B" />
            </View>
            <View>
              <Text className="text-[10px] text-slate-400 font-poppins-light">
                Warranty
              </Text>
              <Text className="text-xs text-slate-900 dark:text-slate-200 font-poppins-medium">
                1 Year Local
              </Text>
            </View>
          </View>
        </View>

        <HDivider />

        {/* Colors Selection */}
        {product.colors && product.colors.length > 0 && (
          <View className="my-4">
            <View className="flex-row justify-between items-center mb-3">
              <View>
                <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white">
                  Available Colors
                </Text>
                <Text className="text-xs text-slate-400 font-poppins-light">
                  Selected {selectedColors.length} of {quantity}
                </Text>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={clearColors}
                  className="px-3 py-1.5 rounded-xl bg-input"
                >
                  <Text className="text-[10px] font-poppins-medium text-slate-600 dark:text-slate-400">
                    Clear
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-4">
              {product.colors.map((color, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => toggleColor(color)}
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    isColorSelected(color) ? "scale-110" : "scale-100"
                  }`}
                  style={[
                    {
                      backgroundColor: color,
                      borderWidth: isColorSelected(color) ? 3 : 1,
                      borderColor: isColorSelected(color)
                        ? "#F97316"
                        : "#E2E8F0",
                    },
                    isColorSelected(color) ? styles.selectedShadow : {},
                  ]}
                >
                  {isColorSelected(color) && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={
                        color === "#FFFFFF" || color === "white"
                          ? "black"
                          : "white"
                      }
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sizes Selection */}
        {availableSizes.length > 0 && (
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white">
                Choose Size
              </Text>
              <TouchableOpacity onPress={clearSizes}>
                <Text className="text-[10px] font-poppins-medium text-slate-400">
                  Clear All
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap gap-3">
              {availableSizes.map((size, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => toggleSize(size)}
                  style={isSizeSelected(size) ? styles.selectedShadow : {}}
                  className={`px-6 py-3 rounded-2xl items-center justify-center border-2 ${
                    isSizeSelected(size)
                      ? "border-orange-500 bg-orange-500"
                      : "border-slate-100 dark:border-slate-800 bg-input"
                  }`}
                >
                  <Text
                    className={`text-sm font-poppins-bold ${
                      isSizeSelected(size)
                        ? "text-white"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {size.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Quantity & Inventory */}
        <View className="flex-row items-center justify-between bg-input p-4 rounded-3xl mb-8">
          <View>
            <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white">
              Quantity
            </Text>
            <Text className="text-[10px] text-slate-400 font-poppins-light mt-0.5">
              {product.stock} items available
            </Text>
          </View>
          <View className="flex-row items-center bg-background rounded-2xl p-1 border border-slate-100 dark:border-slate-700">
            <TouchableOpacity
              onPress={decrementQuantity}
              disabled={quantity <= 1}
              className={`w-10 h-10 items-center justify-center rounded-xl ${quantity <= 1 ? "opacity-30" : "opacity-100"}`}
            >
              <Ionicons name="remove" size={20} color="#64748B" />
            </TouchableOpacity>
            <Text className="text-lg font-poppins-bold text-slate-900 dark:text-white px-4 text-center min-w-[50px]">
              {quantity}
            </Text>
            <TouchableOpacity
              onPress={incrementQuantity}
              disabled={quantity >= product.stock}
              className={`w-10 h-10 items-center justify-center rounded-xl ${quantity >= product.stock ? "opacity-30" : "opacity-100"}`}
            >
              <Ionicons name="add" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Description Section */}
        <View className="mb-16">
          <Text className="text-sm font-poppins-bold text-slate-900 dark:text-white mb-2">
            Description
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 font-poppins-light leading-6">
            {product.description ||
              "No description provided for this product. High quality materials used for comfort and durability."}
          </Text>
        </View>
      </View>

      {/* Floating Bottom Bar */}
      <View
        // style={styles.floatingBarShadow}
        className="absolute bottom-0 left-0 right-0 bg-background border-t border-slate-100 dark:border-slate-800 px-4 py-4 pb-16 flex-row items-center justify-between"
      >
        <View className="flex-1 mr-6">
          <Text className="text-[10px] text-slate-400 font-poppins-medium uppercase tracking-widest">
            Total Price
          </Text>
          <Text className="text-xl font-poppins-bold text-slate-900 dark:text-white">
            {formatPrice(Number(product.price) * quantity)}
          </Text>
        </View>
        <AppButton
          text="Checkout"
          width={"45%"}
          borderRadius={50}
          onPress={handleContinueToPurchase}
        />
      </View>
    </ProductDetailWrapper>
  );
};

const styles = StyleSheet.create({
  selectedShadow: {
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonShadow: {
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingBarShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 15,
  },
});

export default ProductDetail;
