import { createPayoutAccount, fetchBanks, resolveBank } from "@/api/user";
import BankSelectionSheet from "@/components/BankSelectionSheet";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import Feather from "@expo/vector-icons/Feather";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Sentry from "@sentry/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { z } from "zod";

const payoutAccountSchema = z.object({
  bank_name: z.string().min(1, "Bank name is required"),
  account_bank: z.string().min(1, "Bank code is required"),
  account_number: z.string().length(10, "Account number must be 10 digits"),
  beneficiary_name: z.string().min(1, "Account name is required"),
});

type PayoutAccountForm = z.infer<typeof payoutAccountSchema>;

const CreatePayoutAccountScreen = () => {
  const { showSuccess, showError } = useToast();
  const bankSheetRef = React.useRef<BottomSheetModal>(null);
  const queryClient = useQueryClient();

  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: () => fetchBanks(),
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PayoutAccountForm>({
    resolver: zodResolver(payoutAccountSchema),
    defaultValues: {
      bank_name: "",
      account_bank: "",
      account_number: "",
      beneficiary_name: "",
    },
  });

  const account_number = watch("account_number");
  const account_bank = watch("account_bank");
  const [isResolvingBank, setIsResolvingBank] = useState(false);

  useEffect(() => {
    const resolveAccount = async () => {
      if (account_number?.length === 10 && account_bank) {
        setIsResolvingBank(true);
        try {
          const result = await resolveBank(account_number, account_bank);
          if (result?.account_name) {
            setValue("beneficiary_name", result.account_name, {
              shouldValidate: true,
            });
          }
        } catch (error) {
          console.error("Resolution failed:", error);
          showError(
            "Resolution Failed",
            "Could not resolve bank account details.",
          );
          setValue("beneficiary_name", "", { shouldValidate: true });
        } finally {
          setIsResolvingBank(false);
        }
      }
    };
    resolveAccount();
  }, [account_number, account_bank, setValue, showError]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: PayoutAccountForm) => createPayoutAccount(data),
    onSuccess: () => {
      showSuccess("Success", "Payout account created successfully.");
      queryClient.invalidateQueries();
      router.back();
    },
    onError: (error) => {
      showError(
        "Error",
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    },
  });

  const onSubmit = (data: PayoutAccountForm) => {
    console.log(data);
    Sentry.addBreadcrumb({
      category: "payout",
      message: "Payout account created",
      level: "info",
    });
    mutate(data);
  };

  return (
    <BottomSheetModalProvider>
      <View className="flex-1 bg-background">
        <Stack.Screen
          options={{
            headerTitle: "Create Payout Account",
            headerTitleAlign: "center",
          }}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5 mt-5 gap-6">
            <Text className="text-secondary font-poppins-semibold text-base mt-2">
              Payout Account Details
            </Text>

            <View className="gap-5">
              <Controller
                control={control}
                name="bank_name"
                render={({ field: { value } }) => (
                  <Pressable
                    onPress={() => {
                      if (!isPending) {
                        bankSheetRef.current?.present();
                      }
                    }}
                  >
                    <View pointerEvents="none">
                      <AppTextInput
                        label="Bank Name"
                        value={value}
                        placeholder="Select bank"
                        errorMessage={errors.bank_name?.message}
                        editable={false}
                        icon={
                          <Feather
                            name="chevron-down"
                            size={18}
                            color="#94a3b8"
                          />
                        }
                      />
                    </View>
                  </Pressable>
                )}
              />

              <View className="flex-row justify-between">
                <Controller
                  control={control}
                  name="account_number"
                  render={({ field: { onChange, value } }) => (
                    <AppTextInput
                      label="Account Number"
                      value={value || ""}
                      width={"47.5%"}
                      onChangeText={onChange}
                      placeholder="10-digit number"
                      keyboardType="numeric"
                      errorMessage={errors.account_number?.message}
                      editable={!isPending}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="account_bank"
                  render={({ field: { value } }) => (
                    <AppTextInput
                      label="Bank Code"
                      value={value || ""}
                      width={"47.5%"}
                      placeholder="e.g. 058"
                      errorMessage={errors.account_bank?.message}
                      editable={false}
                    />
                  )}
                />
              </View>

              <Controller
                control={control}
                name="beneficiary_name"
                render={({ field: { onChange, value } }) => (
                  <AppTextInput
                    label="Account Name"
                    value={value || ""}
                    onChangeText={onChange}
                    placeholder="Enter account name"
                    errorMessage={errors.beneficiary_name?.message}
                    editable={false}
                    icon={
                      isResolvingBank ? (
                        <ActivityIndicator size="small" color="#FF8C00" />
                      ) : undefined
                    }
                  />
                )}
              />

              <View className="mt-5 mb-10">
                <AppButton
                  text="Create Account"
                  variant="fill"
                  icon={
                    isPending ? <ActivityIndicator color="white" /> : undefined
                  }
                  onPress={handleSubmit(onSubmit)}
                  disabled={isPending || isResolvingBank}
                  width="100%"
                />
              </View>
            </View>
          </View>
        </ScrollView>

        <BankSelectionSheet
          ref={bankSheetRef}
          banks={banks || []}
          onSelect={(bank) => {
            setValue("bank_name", bank.name, { shouldValidate: true });
            setValue("account_bank", bank.code, { shouldValidate: true });
          }}
        />
      </View>
    </BottomSheetModalProvider>
  );
};

export default CreatePayoutAccountScreen;
