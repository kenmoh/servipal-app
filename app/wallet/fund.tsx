import { initiateWalletTopup } from "@/api/payment";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { AntDesign } from "@expo/vector-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Text, useColorScheme, View } from "react-native";
import { z } from "zod";

const fundWalletSchema = z.object({
  amount: z
    .number({ message: "Amount must be a number" })
    .min(1000, "Minimum amount is 1000"),
});

type FundWalletForm = z.infer<typeof fundWalletSchema>;

const FundWalletScreen = () => {
  const theme = useColorScheme();
  const { showError } = useToast();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FundWalletForm>({
    resolver: zodResolver(fundWalletSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (amount: number) => initiateWalletTopup(amount),
    onSuccess: (data) => {
      console.log("Payment amount:", data.amount);
      router.push({
        pathname: "/payment",
        params: {
          serviceType: "WALLET",
          logo: data.customization.logo,
          email: data.customer.email,
          phonenumber: data.customer.phone_number,
          fullName: data.customer.full_name,
          description: data.customization.description,
          title: data.customization.title,
          txRef: data.tx_ref,
          amount: data.amount,
          publicKey: data.public_key,
        },
      });
    },
    onError: (error) => {
      console.error("Error creating order:", error);
      showError(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    },
  });

  const onSubmit = (data: FundWalletForm) => {
    // Proceed with payment
    console.log("Payment amount:", data.amount);
    mutate(data.amount);
  };

  return (
    <View className="flex-1 bg-background px-5 mt-5 gap-6">
      <Text className="text-primary font-poppins-medium tracking-wider">
        Fund your wallet
      </Text>
      <View className="gap-6">
        <View>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, onBlur, value } }) => (
              <AppTextInput
                placeholder="1000"
                height={50}
                label="Amount"
                keyboardType="numeric"
                value={value?.toString() || ""}
                onChangeText={(text) => {
                  const num = text === "" ? 0 : Number(text);
                  onChange(num);
                }}
                onBlur={onBlur}
              />
            )}
          />
          {errors.amount && (
            <Text className="text-red-500 text-sm mt-1 font-poppins-regular">
              {errors.amount.message}
            </Text>
          )}
        </View>
        <AppButton
          text="Pay"
          variant="fill"
          icon={
            isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <AntDesign name="credit-card" color={"#ccc"} size={24} />
            )
          }
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </View>
  );
};

export default FundWalletScreen;
