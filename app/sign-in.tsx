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
import { useUserStore } from "@/store/userStore";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Linking from "expo-linking";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { useTrack } from "@/hooks/use-events";
import { SignInFormValues, signInSchema } from "@/types/auth-types";
import { useSignIn } from "@/hooks/user-sign-in";

const roleData = [
  { id: "CUSTOMER", name: "Customer" },
  { id: "RESTAURANT_VENDOR", name: "Restaurant Service" },
  { id: "LAUNDRY_VENDOR", name: "Laundry Service" },
  { id: "DISPATCH", name: "Dispatch Service" },
];

const signUpSchema = z
  .object({
    email: z.email().trim().nonempty("Email is required"),
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

const SignIn = () => {
  const { mutate: signIn, isPending } = useSignIn();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: "onChange",
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = (values: SignInFormValues) => {
    signIn(values);
  };

  return (
    
      <View className="w-full flex-1 items-center bg-background px-6 gap-4">
        <View className="items-start mb-5 self-start">
          <Text className="self-start font-poppins-bold text-primary text-[24px] font-bold">
            Welcome back!
          </Text>
          <Text className="text-muted font-poppins">
            Login to continue
          </Text>
        </View>
        
          <Controller
            control={control}
            name="identifier"
            render={({ field: { onChange, value, onBlur } }) => (
              <AppTextInput
                autoCapitalize="none"
                label="Email"
                placeholder="email@example.com"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                width="100%"
                height={48}
                errorMessage={errors.identifier?.message}
                editable={!isPending}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <AppTextInput
                label="Password"
                placeholder="Enter your password"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value}
                secureTextEntry
                width="100%"
                height={48}
                errorMessage={errors.password?.message}
                editable={!isPending}
                autoCapitalize="none"
              />
            )}
          />

          <View className="items-end self-center justify-center w-full my-4">
            <Text
              className="text-button-primary  font-poppins-semibold text-[14px]"
              onPress={() => router.push("/forgot-password")}
            >
              Forgot Password
            </Text>
          </View>

          
            <AppButton
              disabled={isPending}
              borderRadius={50}
              text={"Sign In"}
              icon={
                isPending && <ActivityIndicator size={"small"} color="white" />
              }
              width={"100%"}
              onPress={handleSubmit(onSubmit)}
            />
       
      
        <View className="items-center self-center justify-center mt-[30px] flex-row gap-2">
          <Text className="text-muted  font-poppins text-[14px]">
            Don't have an account ?
          </Text>
          <Text
              className="font-poppins-semibold text-[14px] text-button-primary"
              onPress={() => router.navigate("/sign-up")}
            >
              Register
            </Text>
        </View>
      </View>

  );
};

export default SignIn;

const styles = StyleSheet.create({});
