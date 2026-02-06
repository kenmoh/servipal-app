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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import z from "zod";

const profileUpdateSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone_number: z.string().min(10, "Invalid phone number"),
  state: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.coerce.number().optional().or(z.literal(0)),
  // Conditional fields
  store_name: z.string().optional(),
  business_name: z.string().optional(),
  business_address: z.string().optional(),
  business_registration_number: z.string().optional(),
  opening_hours: z.string().optional(),
  closing_hours: z.string().optional(),
  pickup_and_delivery_charge: z.coerce.number().optional().or(z.literal(0)),
});

type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;

const UpdateProfile = () => {
  const { profile, user, fetchProfile } = useUserStore();
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const [isGettingLocation, setIsGettingLocation] = useState(false);

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
      bank_account_number: 0,
      store_name: "",
      business_name: "",
      business_address: "",
      business_registration_number: "",
      opening_hours: "",
      closing_hours: "",
      pickup_and_delivery_charge: 0,
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        full_name: profile.full_name || "",
        phone_number: profile.phone_number || "",
        // @ts-ignore - state might be in profile even if not in type
        state: profile.state || "",
        // @ts-ignore
        bank_name: profile.bank_name || "",
        // @ts-ignore
        bank_account_number: profile.bank_account_number || 0,
        // @ts-ignore
        store_name: profile.store_name || "",
        business_name: profile.business_name || "",
        business_address: profile.business_address || "",
        // @ts-ignore
        business_registration_number:
          profile.business_registration_number || "",
        opening_hours: profile.opening_hours || "",
        closing_hours: profile.closing_hours || "",
        // @ts-ignore
        pickup_and_delivery_charge: profile.pickup_and_delivery_charge || 0,
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

  const onSubmit = (data: ProfileUpdateFormData) => {
    // Filter data based on user type to avoid sending irrelevant fields
    const updateData: UserProfileUpdate = {
      full_name: data.full_name,
      phone_number: data.phone_number,
      state: data.state,
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
      updateData.opening_hours = data.opening_hours;
      updateData.closing_hours = data.closing_hours;
      updateData.pickup_and_delivery_charge =
        data.pickup_and_delivery_charge || undefined;
    }

    updateMutation.mutate(updateData);
  };

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission denied",
          "Allow location access to use this feature",
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        const formattedAddress = `${address.name || ""}${address.street ? ", " + address.street : ""}${address.city ? ", " + address.city : ""}${address.region ? ", " + address.region : ""}`;
        setValue("business_address", formattedAddress);
      }
    } catch (error) {
      console.error("Error getting location:", error);
      showError("Location Error", "Failed to get current location");
    } finally {
      setIsGettingLocation(false);
    }
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
        <View className="w-[90%] self-center">
          <Text className="text-secondary font-poppins-semibold text-base my-4">
            Proile Information
          </Text>
        </View>

        <View className="gap-5">
          {/* COMMON FIELDS */}
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
                width="90%"
                editable={!isPending}
              />
            )}
          />

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
                width="90%"
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
                items={states || []}
                onValueChange={onChange}
                value={value}
                error={errors.state?.message}
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
                  width="90%"
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
                render={({ field: { onChange, value } }) => (
                  <AppTextInput
                    label="Business Name"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter business name"
                    errorMessage={errors.business_name?.message}
                    width="90%"
                    editable={!isPending}
                  />
                )}
              />

              <Controller
                control={control}
                name="business_address"
                render={({ field: { onChange, value } }) => (
                  <View className="flex-row items-end ">
                    <View className="w-[80%]">
                      <GoogleTextInput
                        label="Business Address"
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
                    <View className="w-[20%]">
                      <CurrentLocationButton
                        onLocationSet={(address, coords) => {
                          onChange(address);
                        }}
                      />
                    </View>
                  </View>
                )}
              />

              <Controller
                control={control}
                name="business_registration_number"
                render={({ field: { onChange, value } }) => (
                  <AppTextInput
                    label="Business Reg. Number (Optional)"
                    value={value}
                    onChangeText={onChange}
                    placeholder="CAC Number"
                    errorMessage={errors.business_registration_number?.message}
                    width="90%"
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
                    render={({ field: { onChange, value } }) => (
                      <AppTextInput
                        label="Opening Time"
                        value={value}
                        onChangeText={onChange}
                        placeholder="e.g. 08:00 AM"
                        errorMessage={errors.opening_hours?.message}
                        width="90%"
                        editable={!isPending}
                      />
                    )}
                  />
                </View>
                <View className="flex-1">
                  <Controller
                    control={control}
                    name="closing_hours"
                    render={({ field: { onChange, value } }) => (
                      <AppTextInput
                        label="Closing Time"
                        value={value}
                        onChangeText={onChange}
                        placeholder="e.g. 09:00 PM"
                        errorMessage={errors.closing_hours?.message}
                        width="90%"
                        editable={!isPending}
                      />
                    )}
                  />
                </View>
              </View>

              <Controller
                control={control}
                name="pickup_and_delivery_charge"
                render={({ field: { onChange, value } }) => (
                  <AppTextInput
                    label="Base Delivery Charge (₦)"
                    value={value?.toString()}
                    onChangeText={onChange}
                    placeholder="0"
                    keyboardType="numeric"
                    errorMessage={errors.pickup_and_delivery_charge?.message}
                    width="90%"
                    editable={!isPending}
                  />
                )}
              />
            </View>
          )}

          {/* BANKING INFO */}
          <View className="w-[90%] self-center">
            <Text className="text-secondary font-poppins-semibold text-base mt-4">
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
                width="90%"
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
                value={value?.toString()}
                onChangeText={onChange}
                placeholder="10-digit account number"
                keyboardType="numeric"
                errorMessage={errors.bank_account_number?.message}
                width="90%"
                editable={!isPending}
              />
            )}
          />
        </View>

        <View className="mt-10 mb-10">
          <AppButton
            className="self-center"
            width={"90%"}
            text="Update Profile"
            onPress={handleSubmit(onSubmit)}
            disabled={isPending}
            icon={isPending ? <ActivityIndicator color="white" /> : undefined}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default UpdateProfile;
