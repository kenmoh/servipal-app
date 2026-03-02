import { ReviewsService } from "@/api/review";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

const ProductReviews = () => {
  const { productId } = useLocalSearchParams<{ productId: string }>();

  const { data } = useQuery({
    queryKey: ["product-summary", productId],
    queryFn: () => ReviewsService.fetchItemReviews(productId!),
    enabled: !!productId,
  });

  console.log(data);

  return (
    <View className="flex-1 bg-background p-5">
      <Text>Product Reviews</Text>
      <Text>{data?.reviews?.length}</Text>
    </View>
  );
};

export default ProductReviews;
