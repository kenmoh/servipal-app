import { cancelFoodOrder, cancelLaundryOrder } from "@/api/order";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useUserStore } from "@/store/userStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { z } from "zod";

const ReasonSchema = z.object({
  reason: z.string().nonempty("Reason is required"),
});

type ReasonFormValues = z.infer<typeof ReasonSchema>;

const CancelSheet = () => {
  const { id, orderType } = useLocalSearchParams<{
    id: string;
    orderType: "FOOD" | "LAUNDRY";
  }>();

  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUserStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReasonFormValues>({
    resolver: zodResolver(ReasonSchema),
    defaultValues: {
      reason: "",
    },
  });

  const cancelFoodOrderMutation = useMutation({
    mutationFn: (reason: string) =>
      cancelFoodOrder(id, {
        new_status: "CANCELLED",
        cancel_reason: reason,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-orders", user?.id] });
      showSuccess(`${data.status}`, `Order status updated to ${data.status}`);
      router.back();
    },
    onError: (error) => {
      showError("Error", `${error.message}`);
    },
  });

  const cancelLaundryOrderMutation = useMutation({
    mutationFn: (reason: string) =>
      cancelLaundryOrder(id, {
        new_status: "CANCELLED",
        cancel_reason: reason,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-orders", user?.id] });
      showSuccess(`${data.status}`, `Order status updated to ${data.status}`);
      router.back();
    },
    onError: (error) => {
      showError("Error", `${error.message}`);
    },
  });

  const handleCancelOrder = (reason: string) => {
    if (orderType === "FOOD") {
      cancelFoodOrderMutation.mutate(reason);
    } else if (orderType === "LAUNDRY") {
      cancelLaundryOrderMutation.mutate(reason);
    }
  };
  const onSubmit = (data: ReasonFormValues) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      {
        text: "No",
        style: "cancel",
      },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: () => handleCancelOrder(data.reason.trim()),
      },
    ]);
  };

  if (
    cancelFoodOrderMutation.isPending ||
    cancelLaundryOrderMutation.isPending
  ) {
    return <LoadingIndicator label="Cancelling Order..." />;
  }

  return (
    <View className="p-4 flex-1 bg-background gap-4 mt-6">
      <Text className="text-xl text-primary mb-4 font-poppins-bold">
        Cancel Order
      </Text>
      <Controller
        control={control}
        name="reason"
        render={({ field: { onChange, value, onBlur } }) => (
          <AppTextInput
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Enter reason for cancellation..."
            value={value}
            errorMessage={errors.reason?.message}
            multiline
            height={100}
            autoCapitalize="sentences"
            editable={
              !cancelLaundryOrderMutation.isPending &&
              !cancelFoodOrderMutation.isPending
            }
          />
        )}
      />
      <AppButton
        text="Cancel Order"
        onPress={handleSubmit(onSubmit)}
        disabled={
          cancelFoodOrderMutation.isPending ||
          cancelLaundryOrderMutation.isPending
        }
        icon={
          cancelFoodOrderMutation.isPending ||
          cancelLaundryOrderMutation.isPending ? (
            <ActivityIndicator size="small" color="white" />
          ) : null
        }
      />
    </View>
  );
};

export default CancelSheet;
