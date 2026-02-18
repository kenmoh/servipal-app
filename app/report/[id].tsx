import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useColorScheme,
  View,
} from "react-native";

import { createDispute } from "@/api/dispute";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { DisputeOrderType } from "@/types/dispute-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const reportSchema = z.object({
  orderType: z.string(),
  orderId: z.string(),
  respondentId: z.string(),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type ReportFormData = z.infer<typeof reportSchema>;

const ReportPage = () => {
  const { id, orderType, respondentId } = useLocalSearchParams<{
    id: string;
    orderType: string;
    respondentId: string;
  }>();
  const queryClient = useQueryClient();
  const theme = useColorScheme();
  const { showSuccess, showError } = useToast();

  const COLOR = theme === "dark" ? "rgba(30, 33, 39, 0.5)" : "#ddd";
  const TEXT = theme === "dark" ? "#fff" : "#aaa";

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    mode: "onBlur",
    defaultValues: {
      orderId: id,
      orderType: orderType,
      respondentId: respondentId,
      description: "",
    },
  });

  const submitReportMutation = useMutation({
    mutationFn: createDispute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery", id] });
      showSuccess("Success", "Report submitted successfully");
      reset();
      router.push("/messages");
    },
    onError: (error: any) => {
      showError("Error", error?.message || "Failed to submit report");
    },
  });

  const handleSubmitReport = (data: ReportFormData) => {
    submitReportMutation.mutate({
      order_id: data.orderId,
      order_type: data.orderType as DisputeOrderType,
      respondent_id: data.respondentId,
      reason: data.description,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <Stack.Screen
        options={{
          title: "Open Dispute",
          headerShown: true,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: "Poppins_600SemiBold",
            fontSize: 18,
          },
          headerTintColor: theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK,
        }}
      />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 bg-background mt-12">
          <View className="w-full self-center gap-4">
            <View className="gap-1 hidden">
              <Controller
                control={control}
                name="respondentId"
                render={({ field: { onChange, value } }) => (
                  <AppTextInput
                    value={value}
                    onChangeText={onChange}
                    width={"90%"}
                    disabled
                  />
                )}
              />

              <Controller
                control={control}
                name="orderId"
                render={({ field: { onChange, value } }) => (
                  <AppTextInput
                    value={value}
                    onChangeText={onChange}
                    width={"90%"}
                    disabled
                  />
                )}
              />
              <Controller
                control={control}
                name="orderType"
                render={({ field: { onChange, value } }) => (
                  <AppTextInput
                    value={value}
                    onChangeText={onChange}
                    width={"90%"}
                    disabled
                  />
                )}
              />
            </View>

            <View className="gap-1 self-center items-center">
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <AppTextInput
                    label="Decription"
                    placeholder="Please describe the issue in detail..."
                    value={value}
                    onChangeText={onChange}
                    numberOfLines={4}
                    multiline={true}
                    width={"90%"}
                    errorMessage={errors.description?.message}
                  />
                )}
              />
            </View>
            <View className="my-6 items-center">
              <AppButton
                width={"90%"}
                text="Submit Report"
                icon={
                  submitReportMutation.isPending && (
                    <ActivityIndicator color="#ccc" />
                  )
                }
                onPress={handleSubmit(handleSubmitReport)}
                disabled={submitReportMutation.isPending}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ReportPage;
