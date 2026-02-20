import { ReviewsService } from "@/api/review";
import LoadingIndicator from "@/components/LoadingIndicator";
import ReviewCard from "@/components/ReviewCard";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";
import { Review } from "@/types/review-types";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { RefreshControl, useColorScheme, View } from "react-native";

const reviews = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUserStore();
  const theme = useColorScheme();

  const { data, isFetching, isLoading, isPending, refetch } = useQuery({
    queryKey: ["reviews", user?.id],
    queryFn: () => ReviewsService.getUserReviewsById(id),
  });

  if (isLoading || isFetching || isPending) {
    return <LoadingIndicator />;
  }

  return (
    <View className="bg-background flex-1">
      <Stack.Screen
        options={{
          title: "Reviews",
          headerTintColor: theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK,
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor:
              theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
          },
        }}
      />
      <FlashList
        data={data?.reviews || []}
        keyExtractor={(item: Review) => item.id.toString()}
        renderItem={({ item }: { item: Review }) => <ReviewCard data={item} />}
        refreshing={isFetching}
        onRefresh={() => (
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      />
    </View>
  );
};

export default reviews;
