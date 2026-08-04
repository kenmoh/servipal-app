import { resetPassword } from "@/api/auth";
import { useToast } from "@/components/ToastProvider";
import { AppTextInput } from "@/components/ui/app-text-input";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import authStorage from "@/storage/auth-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

const schema = z
  .object({
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
  const { accessToken, access_token: accessTokenSnakeCase } =
    useLocalSearchParams<{ accessToken?: string; access_token?: string }>();
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const token = accessToken ?? accessTokenSnakeCase ?? storedToken;
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (!accessToken && !accessTokenSnakeCase) {
      authStorage.getResetToken().then((stored) => setStoredToken(stored));
    }
  }, [accessToken, accessTokenSnakeCase]);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) => resetPassword(token!, data.newPassword),
    onError: (error) => {
      showError("Error", error.message);
    },
    onSuccess: () => {
      authStorage.removeResetToken();
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
      {/* <Stack.Screen
        options={{
          title: "Reset Password",
          headerShown: true,
          headerStyle: {
            backgroundColor:
              theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
          },
          headerTintColor: theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
        }}
      /> */}
      <ScrollView
        className="flex-1 w-full bg-background"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: "center",
          justifyContent: "center",
          flexGrow: 1,
          width: "100%",
        }}
      >
        <View className="gap-5 w-[90%]">
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
          <Pressable
            disabled={isPending}
            className="items-center mv-6 bg-button-primary gap-2 py-3 rounded-lg flex-row justify-center active:opacity-25"
            onPress={handleSubmit(onSubmit)}
          >
            {isPending && <ActivityIndicator size={"small"} color="#eee" />}
            <Text maxFontSizeMultiplier={1.3} className="text-primary font-poppins-bold text-[16px]">
              Send
            </Text>
          </Pressable>
        </View>

        <View className="items-center self-center mt-[25px] justify-center w-[90%] mb-[30px]">
          <Text className="text-primary font-poppins text-[14px]">
            Or continue to{"  "}
            <Text
              onPress={() => router.replace("/sign-in")}
              className="font-poppins-bold text-[16px] text-button-primary underline"
            >
              Login
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RecoverPassword;
