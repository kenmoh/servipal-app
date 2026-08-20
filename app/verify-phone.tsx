import { requestOtp, verifyOTP } from "@/api/auth";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { useUserStore } from "@/store/userStore";
import * as Sentry from "@sentry/react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

const VerifyOtp = () => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();
  const { profile, fetchProfile } = useUserStore();

  const verifyMutation = useMutation({
    mutationFn: verifyOTP,
    onSuccess: async (data) => {
      if (data?.account_status === "ACTIVE") {
        queryClient.invalidateQueries({
          queryKey: ["user-profile-image", profile?.id],
        });
        await fetchProfile();
        showSuccess("Success", "Phone number verified successfully!");
        router.back();
      }
    },
    onError: (error: any) => {
      Sentry.captureException(error, { tags: { action: "verify_otp" } });
      showError("Error", error.message || "Verification failed");
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: requestOtp,
    onSuccess: (data) => {
      if (data.status === "success") {
        showSuccess("Success", data.message);
      }
    },
    onError: (error: any) => {
      Sentry.captureException(error, { tags: { action: "resend_otp" } });
      showError("Error", error.message || "Failed to resend code");
    },
  });

  const handleOtpChange = (value: string, index: number) => {
    // If user deleted character, keep current index
    if (value === "") {
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
      return;
    }

    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, "");
    if (numericValue === "") return;

    // Handle single digit input
    const newOtp = [...otp];
    newOtp[index] = numericValue.slice(-1);
    setOtp(newOtp);

    // Auto focus next
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // If last digit, dismiss keyboard
      Keyboard.dismiss();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const isComplete = otp.every((digit) => digit !== "");

  const handleVerify = () => {
    const code = otp.join("");
    verifyMutation.mutate({ otp: code });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <View className="flex-1 px-6 pt-12 items-center">
        {/* Header */}
        <View className="w-full mb-10">
          <Text className="font-poppins-semibold text-[24px] text-primary">
            Phone Verification 🔐
          </Text>
          <Text className="font-normal text-[14px] text-primary mt-2">
            Enter the 6-digit code sent to your phone number.
          </Text>
        </View>

        {/* OTP Input Grid */}
        <View className="flex-row justify-between w-full mb-12">
          {otp.map((digit, index) => (
            <View
              key={index}
              className={`w-[14%] aspect-[4/5] bg-input rounded-2xl items-center justify-center border-2 ${
                focusedIndex === index
                  ? "border-brand-primary"
                  : "border-transparent"
              }`}
            >
              <TextInput
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                className="text-primary font-poppins-bold text-2xl text-center w-full h-full"
                keyboardType="number-pad"
                maxLength={index === 0 ? 6 : 1} // Allow paste on first box
                value={digit}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(null)}
                onChangeText={(value) => {
                  if (value.length > 1 && index === 0) {
                    // Handle paste
                    const pasted = value.split("").slice(0, 6);
                    const newOtp = [...otp];
                    pasted.forEach((d, i) => (newOtp[i] = d));
                    setOtp(newOtp);
                    const nextIdx = Math.min(pasted.length, 5);
                    inputRefs.current[nextIdx]?.focus();
                  } else {
                    handleOtpChange(value, index);
                  }
                }}
                onKeyPress={(e) => handleKeyPress(e, index)}
                selectTextOnFocus
              />
            </View>
          ))}
        </View>

        {/* Action Button */}
        <View className="w-full">
          <AppButton
            text={
              verifyMutation.isPending ? "Verifying..." : "Confirm & Verify"
            }
            onPress={handleVerify}
            disabled={!isComplete || verifyMutation.isPending}
            color="#FF8C00" // Use brand primary orange
          />
        </View>

        {/* Resend Link */}
        <View className="flex-row items-baseline justify-center mt-8">
          <Text className="text-secondary font-normal text-[14px]">
            I didn't receive a code?{"  "}
          </Text>
          <Pressable
            onPress={() => resendOtpMutation.mutate()}
            disabled={resendOtpMutation.isPending}
          >
            <Text className="font-poppins-medium text-[14px] text-brand-primary underline">
              {resendOtpMutation.isPending ? "Sending..." : "Resend Code"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default VerifyOtp;
