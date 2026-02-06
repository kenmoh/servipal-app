import { ReviewsService } from "@/api/review";
import StarRatingInput from "@/components/StarRatingInput";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useUserStore } from "@/store/userStore";
import { ReviewInsert } from "@/types/review-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
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
  orderId: z.string().optional(),
  itemId: z.string().optional(),
  dispatchId: z.string().optional(),
  revieweeId: z.string().min(1, "Reviewee ID is required"),
  reviewType: z.string().min(1, "Please select review type"),
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
  const { revieweeId, orderId, dispatchId, itemId, reviewType } =
    useLocalSearchParams();
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
      revieweeId: revieweeId as string,
      orderId: orderId as string,
      itemId: itemId as string,
      reviewType: reviewType as string,
      dispatchId: dispatchId as string,
      rating: 5,
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
      order_id: data.orderId || undefined,
      item_id: data.itemId || undefined,
      reviewee_id: data.revieweeId,
      dispatch_id: data.dispatchId || undefined,
      rating: data.rating,
      comment: data.description,
      review_type: data.reviewType,
    };
    mutate(reviewData);
  };

  return (
    <ScrollView className="bg-background flex-1 p-5">
      <View className="gap-6">
        <View className="items-center w-full mb-4">
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
              <View className="gap-2 w-[95%] self-center ">
                <Text className="text-sm text-primary font-poppins-bold">
                  Comment
                </Text>
                <AppTextInput
                  multiline
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
