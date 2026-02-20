import { updateCurrentUserProfile } from "@/api/user";
import AppPicker from "@/components/AppPicker";
import CurrentLocationButton from "@/components/CurrentLocationButton";
import GoogleTextInput from "@/components/GoogleTextInput";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { states } from "@/constants/state";
import { useUserStore } from "@/store/userStore";
import { UserProfileUpdate } from "@/types/user-types";
import Feather from "@expo/vector-icons/Feather";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import z from "zod";

const profileUpdateSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone_number: z
    .string()
    .min(1, "Phone number is required")
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 15;
      },
      { message: "Invalid phone number (10-15 digits required)" },
    ),
  state: z.string().optional().nullable(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional().nullable(),
  store_name: z.string().optional(),
  business_name: z.string().optional(),
  business_address: z.string().optional(),
  business_registration_number: z.string().optional(),
  opening_hours: z.string().optional(),
  closing_hours: z.string().optional(),
  pickup_and_delivery_charge: z.string().optional().nullable(),
});

type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

const UpdateProfile = () => {
  const { profile, user, fetchProfile } = useUserStore();

  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [isOpeningPickerVisible, setOpeningPickerVisibility] = useState(false);
  const [isClosingPickerVisible, setClosingPickerVisibility] = useState(false);

  const userType = user?.user_metadata?.user_type;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProfileUpdateFormData>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      full_name: "",
      phone_number: "",
      state: "",
      bank_name: "",
      bank_account_number: "",
      store_name: "",
      business_name: "",
      business_address: "",
      business_registration_number: "",
      opening_hours: "",
      closing_hours: "",
      pickup_and_delivery_charge: "",
    },
  });

  useEffect(() => {
    if (profile) {
      // Sanitize phone number to ensure it's a valid string
      const sanitizedPhone = profile.phone_number
        ? String(profile.phone_number).replace(/\D/g, "").padStart(11, "0")
        : "";

      reset({
        full_name: profile.full_name || profile.business_name || "",
        phone_number: sanitizedPhone, // Critical fix
        state: profile?.state || "",
        bank_name: profile.bank_name || "",

        store_name: profile.store_name || profile.business_name || "",
        business_name: profile.business_name || "",
        business_address: profile.business_address || "",
        business_registration_number:
          profile.business_registration_number || "",
        opening_hours: profile.opening_hour || "",
        closing_hours: profile.closing_hour || "",
        pickup_and_delivery_charge: profile?.pickup_and_delivery_charge
          ? String(profile.pickup_and_delivery_charge)
          : "",
      });
    }
  }, [profile, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: UserProfileUpdate) => updateCurrentUserProfile(data),
    onSuccess: () => {
      showSuccess("Success", "Profile updated successfully");
      fetchProfile();
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      router.back();
    },
    onError: (error: Error) => {
      showError("Update Failed", error.message);
    },
  });

  const showOpeningPicker = () => setOpeningPickerVisibility(true);
  const hideOpeningPicker = () => setOpeningPickerVisibility(false);

  const handleConfirmOpening = (date: Date) => {
    const formattedTime = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    setValue("opening_hours", formattedTime);
    hideOpeningPicker();
  };

  const showClosingPicker = () => setClosingPickerVisibility(true);
  const hideClosingPicker = () => setClosingPickerVisibility(false);

  const handleConfirmClosing = (date: Date) => {
    const formattedTime = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    setValue("closing_hours", formattedTime);
    hideClosingPicker();
  };

  const onSubmit = (data: ProfileUpdateFormData) => {
    // Filter data based on user type to avoid sending irrelevant fields
    const updateData: UserProfileUpdate = {
      full_name: data.full_name,
      phone_number: data.phone_number,
      state: data.state!,
      bank_name: data.bank_name,
      bank_account_number: data.bank_account_number || undefined,
    };

    if (userType === "CUSTOMER") {
      updateData.store_name = data.store_name;
    }

    if (
      userType === "RESTAURANT_VENDOR" ||
      userType === "LAUNDRY_VENDOR" ||
      userType === "DISPATCH"
    ) {
      updateData.business_name = data.business_name;
      updateData.business_address = data.business_address;
      updateData.business_registration_number =
        data.business_registration_number;
    }

    if (userType === "RESTAURANT_VENDOR" || userType === "LAUNDRY_VENDOR") {
      updateData.opening_hour = data.opening_hours;
      updateData.closing_hour = data.closing_hours;
      updateData.pickup_and_delivery_charge =
        data.pickup_and_delivery_charge ?? undefined;
    }

    updateMutation.mutate(updateData);
  };

  if (!profile) return <LoadingIndicator />;

  const isPending = updateMutation.isPending;

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerTitle: "Update Profile",
          headerTitleAlign: "center",
        }}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 300 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-[90%] self-center gap-5">
          <Text className="text-secondary font-poppins-semibold text-base mt-4">
            Profile Information
          </Text>
          {/* COMMON FIELDS */}
          {user?.user_metadata?.user_type === "CUSTOMER" && (
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Full Name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Enter your full name"
                  errorMessage={errors.full_name?.message}
                  editable={!isPending}
                />
              )}
            />
          )}

          <Controller
            control={control}
            name="phone_number"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Phone Number"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. 08012345678"
                keyboardType="phone-pad"
                errorMessage={errors.phone_number?.message}
                editable={!isPending}
              />
            )}
          />

          <Controller
            control={control}
            name="state"
            render={({ field: { onChange, value } }) => (
              <AppPicker
                label="State"
                isState
                items={states || []}
                onValueChange={onChange}
                value={value!}
                width="100%"
              />
            )}
          />

          {/* CUSTOMER SPECIFIC */}
          {userType === "CUSTOMER" && (
            <Controller
              control={control}
              name="store_name"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Store Name (Display Name)"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Your display name"
                  errorMessage={errors.store_name?.message}
                  editable={!isPending}
                />
              )}
            />
          )}

          {/* BUSINESS SPECIFIC */}
          {(userType === "RESTAURANT_VENDOR" ||
            userType === "LAUNDRY_VENDOR" ||
            userType === "DISPATCH") && (
            <>
              <Controller
                control={control}
                name="business_name"
                render={({ field: { onChange, value } }) => {
                  const handleChange = (newValue: string) => {
                    onChange(newValue);
                    // SYNC TO FULL_NAME AND STORE_NAME IN REAL-TIME
                    setValue("full_name", newValue, { shouldValidate: true });
                    setValue("store_name", newValue, { shouldValidate: true });
                  };
                  return (
                    <AppTextInput
                      label="Business Name"
                      value={value}
                      onChangeText={handleChange} // Use synced handler
                      placeholder="Enter business name"
                      errorMessage={errors.business_name?.message}
                      editable={!isPending}
                    />
                  );
                }}
              />

              <Controller
                control={control}
                name="business_address"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text className="text-muted font-poppins-medium mb-1.5 ml-1 text-sm">
                      Business Address
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="flex-1">
                        <GoogleTextInput
                          placeholder="Search or enter address"
                          scrollEnabled={false}
                          value={value || ""}
                          onPlaceSelect={(lat, lng, address) => {
                            onChange(address);
                          }}
                          onChangeText={onChange}
                          error={errors.business_address?.message}
                        />
                      </View>
                      <View>
                        <CurrentLocationButton
                          height={56}
                          width={56}
                          onLocationSet={(address, coords) => {
                            onChange(address);
                          }}
                        />
                      </View>
                    </View>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="business_registration_number"
                render={({ field: { onChange, value } }) => (
                  <AppTextInput
                    label="Business Reg. Number"
                    value={value}
                    onChangeText={onChange}
                    placeholder="CAC Number"
                    errorMessage={errors.business_registration_number?.message}
                    editable={!isPending}
                  />
                )}
              />
            </>
          )}

          {/* VENDOR SPECIFIC (HOURS & CHARGES) */}
          {(userType === "RESTAURANT_VENDOR" ||
            userType === "LAUNDRY_VENDOR") && (
            <View className="gap-5">
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="opening_hours"
                    render={({ field: { value } }) => (
                      <Pressable onPress={showOpeningPicker}>
                        <View pointerEvents="none">
                          <AppTextInput
                            label="Opening Time"
                            value={value}
                            placeholder="e.g. 08:00 AM"
                            errorMessage={errors.opening_hours?.message}
                            editable={false}
                          />
                        </View>
                      </Pressable>
                    )}
                  />
                </View>
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="closing_hours"
                    render={({ field: { value } }) => (
                      <Pressable onPress={showClosingPicker}>
                        <View pointerEvents="none">
                          <AppTextInput
                            label="Closing Time"
                            value={value}
                            placeholder="e.g. 09:00 PM"
                            errorMessage={errors.closing_hours?.message}
                            editable={false}
                          />
                        </View>
                      </Pressable>
                    )}
                  />
                </View>
              </View>

              <DateTimePickerModal
                isVisible={isOpeningPickerVisible}
                mode="time"
                onConfirm={handleConfirmOpening}
                onCancel={hideOpeningPicker}
              />

              <DateTimePickerModal
                isVisible={isClosingPickerVisible}
                mode="time"
                onConfirm={handleConfirmClosing}
                onCancel={hideClosingPicker}
              />

              <Controller
                control={control}
                name="pickup_and_delivery_charge"
                render={({ field: { onChange, value } }) => (
                  <View>
                    <View className="flex-row items-center gap-2 mb-1.5 ml-1">
                      <Text className="text-muted font-poppins-medium text-sm">
                        Delivery Charge (₦)
                      </Text>
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            "Delivery Charge",
                            "If you offer delivery, this is where you add your delivery charge. This amount will be added to the customer's total. Enable pickup/delivery to use this feature",
                          )
                        }
                      >
                        <Feather name="info" size={16} color="#64748b" />
                      </Pressable>
                    </View>
                    <AppTextInput
                      value={value?.toString()}
                      onChangeText={onChange}
                      placeholder="0"
                      keyboardType="numeric"
                      errorMessage={errors.pickup_and_delivery_charge?.message}
                      editable={!isPending}
                    />
                  </View>
                )}
              />
            </View>
          )}

          {/* BANKING INFO */}
          <View>
            <Text className="text-secondary font-poppins-semibold text-base mt-4 mb-2">
              Payout Account Information
            </Text>
          </View>

          <Controller
            control={control}
            name="bank_name"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Bank Name"
                value={value}
                onChangeText={onChange}
                placeholder="Enter bank name"
                errorMessage={errors.bank_name?.message}
                editable={!isPending}
              />
            )}
          />

          <Controller
            control={control}
            name="bank_account_number"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Account Number"
                value={value || ""}
                onChangeText={onChange}
                placeholder="10-digit account number"
                keyboardType="numeric"
                errorMessage={errors.bank_account_number?.message}
                editable={!isPending}
              />
            )}
          />

          <View className="mt-5 mb-10">
            <AppButton
              text="Update Profile"
              // onPress={handleSubmit(onSubmit)}
              onPress={handleSubmit(onSubmit, (errors) => {
                console.error("❌ Validation failed:", errors);
                // Show user-friendly error
                const firstError =
                  Object.values(errors)[0]?.message ||
                  "Please fill all required fields";
                showError("Validation Error", firstError);
              })}
              disabled={isPending}
              icon={isPending ? <ActivityIndicator color="white" /> : undefined}
              width="100%"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default UpdateProfile;
