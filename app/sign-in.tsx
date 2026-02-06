import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useSignIn } from "@/hooks/user-sign-in";
import { SignInFormValues, signInSchema } from "@/types/auth-types";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

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
    <View className="flex-1 w-full bg-background items-center ">
      {/* Header */}
      <View className="w-[90%] mb-10">
        <Text className="font-bold text-[20px] text-primary">
          Welcome back!
        </Text>
        <Text className="font-normal text-[12px] text-primary mt-1">
          Login to continue
        </Text>
      </View>

      {/* Form */}
      <View className="gap-4">
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
              width={'90%'}
              height={45}
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
              width={'90%'}
              height={45}
              errorMessage={errors.password?.message}
              editable={!isPending}
              autoCapitalize="none"
              
            />
          )}
        />

        {/* Forgot Password */}
        <View className="w-[50%] self-end mr-2">
          <AppButton
          text="Forgot Password"
          variant="ghost"
          
          />
        </View>

        {/* Login Button */}
        <View className="mt">
          <AppButton
            disabled={isPending || !isValid}
            icon={isPending && <ActivityIndicator color="white" size="large" />}
            text={isPending ? "Logging in..." : "Sign In"}
            onPress={handleSubmit(onSubmit)}
          />
        </View>
      </View>

      {/* Sign Up Link */}
      <View className="flex-row items-center justify-center w-[90%] mt-[25px] align-baseline">
        <Text className="text-primary font-normal text-[14px]">
          Don't have an account?{" "}
          </Text>
          <Pressable
            onPress={() => router.push("/sign-up")}
            disabled={isPending}
          >
            <Text className="font-poppins-medium text-[14px] text-button-primary underline">
              Register
            </Text>
          </Pressable>
      </View>
    </View>
  );
};

export default SignIn;