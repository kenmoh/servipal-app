import {
  getReservationSettings,
  upsertReservationSettings,
} from "@/api/reservation";
import { updateCurrentUserProfile } from "@/api/user";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { useUserStore } from "@/store/userStore";
import { ReservationSettingsInput } from "@/types/reservation-types";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useRef } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import ReservationFormSheet from "./reservation-form-sheet";

export default function ReservationSettingsPage() {
  const settingsSheetRef = useRef<BottomSheetModal>(null);
  const { profile, setProfile } = useUserStore();

  const { data, isLoading } = useQuery({
    queryKey: ["reservation-settings"],
    queryFn: getReservationSettings,
  });

  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { mutate: toggleEnableReservation } = useMutation({
    mutationFn: (newValue: boolean) =>
      updateCurrentUserProfile({ enable_reservation: newValue }),
    onSuccess: (updatedProfile) => {
      setProfile(updatedProfile);
      showSuccess(
        "Success",
        `Reservations ${updatedProfile.enable_reservation ? "enabled" : "disabled"}`,
      );
    },
    onError: (error: Error) => {
      showError("Error", error.message || "Failed to update profile");
    },
  });

  const { mutate: toggleAutoConfirm } = useMutation({
    mutationFn: (newValue: boolean) =>
      upsertReservationSettings({
        ...data,
        auto_confirm: newValue,
      } as ReservationSettingsInput),
    onSuccess: () => {
      showSuccess("Success", "Auto-confirm updated");
      queryClient.invalidateQueries({ queryKey: ["reservation-settings"] });
    },
    onError: (error: Error) => {
      showError("Error", error.message || "Failed to update setting");
    },
  });

  if (isLoading) return <LoadingIndicator />;

  const settings = data;

  return (
    <BottomSheetModalProvider>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ padding: 16 }}
      >
        <View className="bg-surface-elevated rounded-2xl p-5 border border-border-subtle shadow-sm">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full bg-orange-500/10 items-center justify-center">
                <Ionicons name="calendar-outline" size={24} color="#FF6600" />
              </View>
              <View>
                <Text className="text-primary font-poppins-semibold text-lg">
                  Enable Reservations
                </Text>
                <Text className="text-muted text-xs">
                  Make your store bookable by customers
                </Text>
              </View>
            </View>
            <Switch
              value={profile?.enable_reservation}
              onValueChange={toggleEnableReservation}
              trackColor={{ false: "#ccc", true: "#FF6600" }}
              thumbColor="#fff"
            />
          </View>

          <HDivider />

          <View className="flex-row items-center gap-3 my-6">
            <View className="w-12 h-12 rounded-full bg-orange-500/10 items-center justify-center">
              <Ionicons name="options-outline" size={24} color="#FF6600" />
            </View>
            <View>
              <Text className="text-primary font-poppins-semibold text-lg">
                Reservation Rules
              </Text>
              <Text className="text-muted text-xs">
                Default settings for all bookings
              </Text>
            </View>
          </View>

          <View className="gap-5">
            <SettingItem
              icon="people-outline"
              label="Minimum Party Size"
              value={`${settings?.min_party_size || 0}`}
            />
            <HDivider />
            <SettingItem
              icon="people-outline"
              label="Maxiumm Party Size"
              value={`${settings?.max_party_size || 0}`}
            />
            <HDivider />
            <SettingItem
              icon="card-outline"
              label="Min. Deposit/Adult"
              value={`₦ ${settings?.min_deposit_adult || 0}`}
            />
            <HDivider />
            <SettingItem
              icon="time-outline"
              label="Cancellation Window"
              value={`${settings?.cancellation_window_minutes ?? 60} Minutes`}
            />
            <HDivider />
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="gray"
                />
                <Text className="text-secondary font-poppins-medium text-sm">
                  Auto-Confirm
                </Text>
              </View>
              <Switch
                value={settings?.auto_confirm}
                onValueChange={toggleAutoConfirm}
                trackColor={{ false: "#ccc", true: "#FF6600" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View className="mt-12 mb-3">
            <AppButton
              borderRadius={50}
              text="Update Settings"
              onPress={() => settingsSheetRef.current?.present()}
            />
          </View>
        </View>

        <View className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-200">
          <View className="flex-row gap-3">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#B45309"
            />
            <View className="flex-1">
              <Text className="text-amber-800 font-poppins-semibold text-sm">
                Pro Tip
              </Text>
              <Text className="text-amber-700 text-xs leading-5">
                These settings apply to all days. Use "Custom Rules" (accessible
                from the dashboard) to override these settings for specific days
                or event party sizes.
              </Text>
            </View>
          </View>
        </View>

        <ReservationFormSheet ref={settingsSheetRef} initialData={settings} />
      </ScrollView>
    </BottomSheetModalProvider>
  );
}

function SettingItem({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={20} color="gray" />
        <Text className="text-secondary font-poppins-medium text-sm">
          {label}
        </Text>
      </View>
      <Text className="text-primary font-poppins-semibold text-sm">
        {value}
      </Text>
    </View>
  );
}
