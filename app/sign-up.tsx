import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppPicker from "@/components/AppPicker";

import { phoneRegEx } from "@/types/user-types";
import { supabase } from "@/utils/supabase";
import { useMutation } from "@tanstack/react-query";

import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Linking from "expo-linking";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const roleData = [
  { id: "CUSTOMER", name: "Customer" },
  { id: "RESTAURANT_VENDOR", name: "Restaurant Service" },
  { id: "LAUNDRY_VENDOR", name: "Laundry Service" },
  { id: "DISPATCH", name: "Dispatch Service" },
];

const signUpSchema = z
  .object({
    email: z.email().trim().nonempty("Email is required"),
    userType: z.string().nonempty("User type is required"),
    phoneNumber: z
      .string()
      .regex(phoneRegEx, "Enter a valid phone number")
      .min(10, "Phone number must be at least 10 digits")
      .max(11, "Phone number must be at most 11 digits"),
    password: z
      .string()
      .min(
        8,
        "Password must be at least 8 characters long, contains at least 1 special character, 1 uppercase, 1 number",
      )
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number")
      .regex(
        /[!@#$%^&*(),.?":{}|<>]/,
        "Password must contain at least one special character",
      ),
    // Confirm password is for UI validation only and is not sent to Supabase
    confirmPassword: z.string().min(8, "Confirm Password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const { showError, showInfo } = useToast();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      userType: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  const openURL = () => {
    Linking.openURL("https://www.servi-pal.com/terms");
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      email,
      password,
      phoneNumber,
      userType,
    }: SignUpFormValues) => {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPhone = phoneNumber.trim();

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        phone: trimmedPhone,
        password,
        options: {
          data: {
            user_type: userType,
            phone: trimmedPhone,
          },
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      showInfo(
        "Pending Confirmation",
        "Please check your email or SMS to verify your account.",
      );
      router.replace("/sign-in");
    },
    onError: (error: any) => {
      showError(
        "Registration Failed",
        error.message || "Registration failed, please try again.",
      );
    },
  });

  const onSubmit = (values: SignUpFormValues) => {
    mutate(values);
  };

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 350 }}
    >
      <View className="w-full items-center bg-background">
        <View className="items-center w-[90%] mb-5">
          <Text className="self-start font-poppins-bold text-primary text-[24px] font-bold">
            Let's get you started
          </Text>
          <Text className="self-start font-poppins text-primary text-[12px] font-normal">
            Create an account
          </Text>
        </View>
        <View className="w-full gap-3 items-center">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <AppTextInput
                onChangeText={onChange}
                width={"90%"}
                onBlur={onBlur}
                placeholder="Email"
                keyboardType="email-address"
                value={value}
                errorMessage={errors.email?.message}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                editable={!isPending}
              />
            )}
          />
          <Controller
            control={control}
            name="phoneNumber"
            render={({ field: { onChange, value, onBlur } }) => (
              <AppTextInput
                onChangeText={onChange}
                width={"90%"}
                onBlur={onBlur}
                keyboardType="phone-pad"
                value={value}
                placeholder="Phone Number"
                errorMessage={errors.phoneNumber?.message}
                editable={!isPending}
              />
            )}
          />

          <Controller
            control={control}
            name="userType"
            render={({ field: { onChange, value } }) => (
              <AppPicker
                items={roleData}
                isBank={false}
                value={value}
                onValueChange={onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <AppTextInput
                value={value}
                onChangeText={onChange}
                width={"90%"}
                onBlur={onBlur}
                secureTextEntry
                placeholder="Password"
                errorMessage={errors.password?.message}
                editable={!isPending}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value, onBlur } }) => (
              <AppTextInput
                value={value}
                onChangeText={onChange}
                width={"90%"}
                onBlur={onBlur}
                secureTextEntry
                placeholder="Confirm Password"
                errorMessage={errors.confirmPassword?.message}
                editable={!isPending}
              />
            )}
          />

          <View className="mt-5 w-full items-center">
            <AppButton
              disabled={isPending}
              text={isPending ? "Registering..." : "Register"}
              icon={
                isPending && <ActivityIndicator size={"large"} color="white" />
              }
              width={"90%"}
              onPress={handleSubmit(onSubmit)}
            />
            <View className="w-[90%] self-center my-2">
              <Text className="text-sm font-poppins text-gray-500">
                By clicking on Register, you agree to ServiPal{" "}
                <Text
                  onPress={openURL}
                  className="text-sm underline font-poppins text-orange-400"
                >
                  terms and conditions
                </Text>
              </Text>
            </View>
          </View>
        </View>
        <View className="items-center self-center justify-center w-[90%] mt-[30px]">
          <Text className="text-primary  font-poppins text-[14px]">
            Already have an account?{" "}
            <Text
              className="font-poppins text-[14px] text-button-primary underline"
              onPress={() => router.navigate("/sign-in")}
            >
              Login
            </Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default SignUp;

const styles = StyleSheet.create({});
