import ReviewList from "@/components/ReviewList";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { View } from "react-native";

const ProductReviews = () => {
  const { productId } = useLocalSearchParams<{ productId: string }>();

  return (
    <View className="flex-1 bg-background p-5">
      <ReviewList itemId={productId} />
    </View>
  );
};

export default ProductReviews;
