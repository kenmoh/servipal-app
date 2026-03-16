import { ReviewsService } from "@/api/review";
import HDivider from "@/components/HDivider";
import ReviewCard from "@/components/ReviewCard";
import { Review } from "@/types/review-types";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { RefreshControl, View } from "react-native";

const ProductReviews = () => {
  const { productId } = useLocalSearchParams<{ productId: string }>();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: () => ReviewsService.fetchItemReviews(productId!),
    enabled: !!productId,
  });

  return (
    <View className="flex-1 bg-background ">
      <HDivider />
      <FlashList
        data={data?.reviews || []}
        keyExtractor={(item: Review) => item.id.toString()}
        renderItem={({ item }: { item: Review }) => <ReviewCard data={item} />}
        refreshing={isFetching}
        onRefresh={() => (
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        )}
        scrollEventThrottle={16}
        ItemSeparatorComponent={() => <HDivider width={"90%"} />}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      />
    </View>
  );
};

export default ProductReviews;
