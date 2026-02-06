import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

import { createReport } from "@/api/report";
import AppPicker from "@/components/AppPicker";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { ReportedUserType, ReportType } from "@/types/review-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const ISSUE_TYPES = [
  { id: "damage_items", name: "Damaged Items" },
  { id: "wrong_items", name: "Wrong Items" },
  { id: "late_delivery", name: "Late Delivery" },
  { id: "rider_behaviour", name: "Rider Behavior" },
  { id: "customer_behaviour", name: "Customer Behavior" },
  { id: "other", name: "Other" },
];

const REPORTED_USER_TYPE = [
  { id: "vendor", name: "Vendor" },
  { id: "customer", name: "Customer" },
  { id: "dispatch", name: "Dispatch" },
];

const reportSchema = z.object({
  reported_user_type: z.string().min(1, "Please select who you are reporting"),
  report_type: z.string().min(1, "Please select an issue type"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type ReportFormData = z.infer<typeof reportSchema>;

const ReportPage = () => {
  const { deliveryId } = useLocalSearchParams();
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
      reported_user_type: "",
      report_type: "",
      description: "",
    },
  });

  const submitReportMutation = useMutation({
    mutationFn: async (data: ReportFormData) => {
      return createReport(deliveryId as string, {
        ...data,
        order_id: deliveryId as string,
        report_type: data.report_type as ReportType,
        reported_user_type: data.reported_user_type as ReportedUserType,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["delivery", deliveryId] });
      showSuccess("Success", "Report submitted successfully");
      reset();
    },
    onError: (error: any) => {
      showError("Error", error?.message || "Failed to submit report");
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 bg-background">
          <View className="gap-1 w-full self-center">
            <Text className="font-poppins px-[5%] text-primary">
              Issue Type
            </Text>

            <Controller
              control={control}
              name="report_type"
              render={({ field: { onChange, value } }) => (
                <AppPicker
                  items={ISSUE_TYPES}
                  isBank={false}
                  value={value}
                  onValueChange={onChange}
                />
              )}
            />

            {errors.report_type && (
              <Text className="text-status-error px-[5%]">
                {errors.report_type.message}
              </Text>
            )}
            <Text className="font-poppins px-[5%] text-primary">Reporting</Text>
            <Controller
              control={control}
              name="reported_user_type"
              render={({ field: { onChange, value } }) => (
                <AppPicker
                  items={REPORTED_USER_TYPE}
                  isBank={false}
                  value={value}
                  onValueChange={onChange}
                />
              )}
            />
            {errors.reported_user_type && (
              <Text className="text-status-error px-[5%]">
                {errors.reported_user_type.message}
              </Text>
            )}

            <View className="gap-1 self-center items-center w-[90%]">
              <Text className="self-start text-primary font-poppins">
                Description
              </Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    placeholder="Please describe the issue in detail..."
                    value={value}
                    onChangeText={onChange}
                    numberOfLines={4}
                    multiline={true}
                    style={{
                      backgroundColor: COLOR,
                      borderRadius: 8,
                      color: TEXT,

                      width: "100%",
                    }}
                  />
                )}
              />
              {errors.description && (
                <Text className="text-status-error font-poppins self-start">
                  {errors.description.message}
                </Text>
              )}
            </View>
            <View className="my-6">
              <AppButton
                width={"90%"}
                text="Submit Report"
                icon={
                  submitReportMutation.isPending && (
                    <ActivityIndicator color="#ccc" />
                  )
                }
                onPress={handleSubmit((data) =>
                  submitReportMutation.mutate(data),
                )}
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
