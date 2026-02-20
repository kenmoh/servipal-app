import { ReviewsService } from "@/api/review";
import HDivider from "@/components/HDivider";
import StarRatingInput from "@/components/StarRatingInput";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useUserStore } from "@/store/userStore";
import { ReviewInsert } from "@/types/review-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z
    .number()
    .min(1, "Please select a rating")
    .max(5, "Rating must be between 1 and 5"),
  description: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(500, "Review must be less than 500 characters"),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

const RATINGS = [
  { id: 1, name: "1 Star" },
  { id: 2, name: "2 Stars" },
  { id: 3, name: "3 Stars" },
  { id: 4, name: "4 Stars" },
  { id: 5, name: "5 Stars" },
];

const ReviewPage = () => {
  const { revieweeId, id, dispatchId, itemId, orderType } =
    useLocalSearchParams<{
      revieweeId: string;
      id: string;
      dispatchId: string;
      itemId: string;
      orderType: "DELIVERY" | "FOOD" | "LAUNDRY" | "PRODUCT";
    }>();
  const queryClient = useQueryClient();
  const { user } = useUserStore();
  const theme = useColorScheme();
  const { showError, showSuccess } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    mode: "onChange",
    defaultValues: {
      rating: 3,
      description: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: ReviewsService.createReview,
    onSuccess: () => {
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
      queryClient.invalidateQueries({ queryKey: ["review-summary"] });

      showSuccess("Success", "Review submitted successfully");
      router.back();
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  const onSubmit = (data: ReviewFormData) => {
    const reviewData: ReviewInsert = {
      order_id: id || undefined,
      item_id: itemId || undefined,
      reviewee_id: revieweeId,
      dispatch_id: dispatchId || undefined,
      rating: data.rating,
      comment: data.description,
      order_type: orderType,
    };

    mutate(reviewData);
  };

  return (
    <ScrollView className="bg-background flex-1">
      <Stack.Screen
        options={{
          headerTitle: "Leave a Review",
          headerTintColor: theme === "dark" ? "white" : "black",
        }}
      />
      <HDivider />
      <View className="gap-6 px-5 mt-4">
        <View className="w-full my-4">
          <Controller
            control={control}
            name="rating"
            render={({ field: { onChange, value } }) => (
              <StarRatingInput
                label="Rating"
                rating={value}
                onRatingChange={onChange}
              />
            )}
          />
          {errors.rating && (
            <Text className="text-status-error text-xs mt-1">
              {errors.rating.message}
            </Text>
          )}
        </View>
        <View className="w-full">
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <View className="gap-2 self-center ">
                <AppTextInput
                  label="Comment"
                  multiline
                  width="100%"
                  placeholder="Write your review..."
                  value={value}
                  onChangeText={onChange}
                />
                {errors.description && (
                  <Text className="text-status-error text-xs">
                    {errors.description.message}
                  </Text>
                )}
                <Text className="text-xs text-muted self-end">
                  {value.length}/500 characters
                </Text>
              </View>
            )}
          />
        </View>

        <AppButton
          text={isPending ? "Submitting..." : "Submit Review"}
          onPress={handleSubmit(onSubmit)}
          disabled={isPending}
          icon={
            isPending ? <ActivityIndicator color="white" size="small" /> : null
          }
        />
      </View>
    </ScrollView>
  );
};

export default ReviewPage;
