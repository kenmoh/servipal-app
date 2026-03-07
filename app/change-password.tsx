import { changeCurrentUserPassword, ChangePassword } from "@/api/auth";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import {
  ChangePasswordFormValues,
  changePasswordSchema,
} from "@/types/auth-types";
import Ionicons from "@expo/vector-icons/Ionicons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

const ChangePasswordScreen = () => {
  const { showError, showSuccess } = useToast();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { isPending, mutate } = useMutation({
    mutationFn: (data: ChangePassword) => changeCurrentUserPassword(data),
    onSuccess: () => {
      showSuccess("SUCCESS", "Password changed successfully");
      router.back();
    },
    onError: (error) => {
      showError("ERROR", error.message);
    },
  });

  const onSubmit = (data: ChangePasswordFormValues) => {
    mutate(data);
  };
  return (
    <KeyboardAvoidingView className="flex-1" behavior="padding">
      <View className="flex-1 bg-background px-5 py-6 gap-6">
        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, value, onBlur } }) => (
            <AppTextInput
              label="Old Password"
              placeholder="Enter your old password"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              secureTextEntry
              height={45}
              errorMessage={errors.currentPassword?.message}
              editable={!isPending}
              autoCapitalize="none"
            />
          )}
        />
        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, value, onBlur } }) => (
            <AppTextInput
              label="New Password"
              placeholder="Enter your new password"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              secureTextEntry
              height={45}
              errorMessage={errors.newPassword?.message}
              editable={!isPending}
              autoCapitalize="none"
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value, onBlur } }) => (
            <AppTextInput
              label="Confirm Password"
              placeholder="Enter your confirm password"
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              secureTextEntry
              height={45}
              errorMessage={errors.confirmPassword?.message}
              editable={!isPending}
              autoCapitalize="none"
            />
          )}
        />
        <AppButton
          text="Change Password"
          onPress={handleSubmit(onSubmit)}
          icon={
            isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Ionicons name="lock-closed" size={20} color="white" />
            )
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export default ChangePasswordScreen;

const styles = StyleSheet.create({});
