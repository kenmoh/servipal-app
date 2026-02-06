import { ReviewsService } from "@/api/review";
import EmptyList from "@/components/EmptyList";
import ReviewCard from "@/components/ReviewCard";
import ReviewSummary from "@/components/ReviewSummary";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ActivityIndicator, View } from "react-native";

interface ReviewListProps {
  itemId?: string;
  revieweeId?: string;
  dispatchId?: string;
}

const ReviewList = ({ itemId, revieweeId, dispatchId }: ReviewListProps) => {
  const { data: reviews, isLoading: isReviewsLoading } = useQuery({
    queryKey: ["reviews", itemId, revieweeId, dispatchId],
    queryFn: () =>
      ReviewsService.fetchReviews({
        item_id: itemId,
        reviewee_id: revieweeId,
        dispatch_id: dispatchId,
      }),
  });

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["review-summary", itemId, revieweeId, dispatchId],
    queryFn: () =>
      ReviewsService.fetchReviewSummary({
        item_id: itemId,
        reviewee_id: revieweeId,
        dispatch_id: dispatchId,
      }),
  });

  const isLoading = isReviewsLoading || isSummaryLoading;

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center py-10">
        <ActivityIndicator size="large" color="#FFB800" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <FlashList
        data={reviews || []}
        renderItem={({ item }) => <ReviewCard data={item} />}
        ListHeaderComponent={
          (revieweeId || itemId || dispatchId) &&
          summary &&
          summary.total_reviews > 0 ? (
            <ReviewSummary summary={summary} />
          ) : null
        }
        ListEmptyComponent={
          <EmptyList
            title="No reviews yet"
            description="Be the first to leave a review!"
          />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default ReviewList;
