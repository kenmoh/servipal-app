import { resetPassword } from "@/api/auth";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

const schema = z
  .object({
    accessToken: z.string().trim(),
    newPassword: z
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
    confirmPassword: z.string().min(8, "Confirm Password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

const RecoverPassword = () => {
  const theme = useColorScheme();
  const { accessToken } = useLocalSearchParams<{ accessToken?: string }>();
  const { showSuccess, showError } = useToast();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      accessToken,
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) =>
      resetPassword(data.accessToken, data.newPassword),
    onError: (error) => {
      showError("Error", error.message);
    },
    onSuccess: () => {
      showSuccess("Success", "Password reset successfully");
      router.replace("/sign-in");
    },
  });

  const onSubmit = (data: FormData) => {
    mutate(data);
  };
  const bgColor = useMemo(
    () => (theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT),
    [theme],
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView
        className="flex-1 w-full bg-background"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View className="flex-1 bg-background w-full">
          <View className="items-center w-[90%] my-10">
            <Text className="self-start text-primary font-poppins text-xs">
              Enter the new password to reset your password.
            </Text>
          </View>
          <View className="gap-5 w-full">
            <View className="hidden">
              <Controller
                name="accessToken"
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <AppTextInput
                    label={"Access Token"}
                    placeholder="Access Token"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    keyboardType="email-address"
                    errorMessage={errors.accessToken?.message}
                    editable={false}
                  />
                )}
              />
            </View>
            <Controller
              name="newPassword"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextInput
                  label={"New Password"}
                  placeholder="********"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  errorMessage={errors.newPassword?.message}
                  editable={!isPending}
                />
              )}
            />
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextInput
                  label={"Confirm Password"}
                  placeholder="********"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  errorMessage={errors.confirmPassword?.message}
                  editable={!isPending}
                />
              )}
            />
            <AppButton
              text={isPending ? "Sending" : "Send"}
              disabled={isPending}
              width={"90%"}
              icon={
                isPending && <ActivityIndicator size={"large"} color="white" />
              }
              onPress={handleSubmit(onSubmit)}
            />
          </View>

          <View className="items-center self-center mt-[25px] justify-center w-[90%] mb-[30px]">
            <Text className="text-primary font-poppins text-[14px]">
              Or continue to{"  "}
              <Text
                onPress={() => router.back()}
                className="font-poppins text-[14px] text-button-primary underline"
              >
                Login
              </Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RecoverPassword;
