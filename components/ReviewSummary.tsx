import { ReviewSummaryStats } from "@/types/review-types";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface ReviewSummaryProps {
  summary: ReviewSummaryStats;
}

const ReviewSummary = ({ summary }: ReviewSummaryProps) => {
  const { average_rating, total_reviews, rating_distribution } = summary;

  const renderDistributionBar = (star: number, count: number) => {
    const percentage = total_reviews > 0 ? (count / total_reviews) * 100 : 0;
    return (
      <View key={star} className="flex-row items-center gap-2 mb-1">
        <View className="flex-row items-center w-12">
          <Text className="text-xs font-poppins-regular text-muted mr-1">
            {star}
          </Text>
          <FontAwesome name="star" size={10} color="#FFB800" />
        </View>
        <View className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <View
            className="h-full bg-primary rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </View>
        <Text className="text-xs text-muted w-8 text-right font-poppins-regular">
          {percentage.toFixed(0)}%
        </Text>
      </View>
    );
  };

  return (
    <View className="bg-card p-4 rounded-xl mb-4 border border-border">
      <Text className="text-lg font-poppins-item-bold mb-3 text-foreground">
        Review Summary
      </Text>
      <View className="flex-row items-center">
        <View className="items-center justify-center mr-6">
          <Text className="text-4xl font-poppins-bold text-primary">
            {average_rating.toFixed(1)}
          </Text>
          <View className="flex-row items-center gap-1 my-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <FontAwesome
                key={index}
                name={index < Math.round(average_rating) ? "star" : "star-o"}
                size={14}
                color="#FFB800"
              />
            ))}
          </View>
          <Text className="text-xs text-muted font-poppins-regular">
            {total_reviews} {total_reviews === 1 ? "Review" : "Reviews"}
          </Text>
        </View>
        <View className="flex-1">
          {[5, 4, 3, 2, 1].map((star) =>
            renderDistributionBar(
              star,
              rating_distribution[star as keyof typeof rating_distribution],
            ),
          )}
        </View>
      </View>
    </View>
  );
};

export default ReviewSummary;
