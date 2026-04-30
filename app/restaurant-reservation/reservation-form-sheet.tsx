import { upsertReservationSettings } from "@/api/reservation";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import {
  ReservationSettingsInput,
  ReservationSettingsOutput,
} from "@/types/reservation-types";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Text, useColorScheme, View } from "react-native";

interface Props {
  initialData?: ReservationSettingsOutput | null;
  onSuccess?: () => void;
}

const ReservationFormSheet = forwardRef<BottomSheetModal, Props>(
  ({ initialData, onSuccess }, ref) => {
    const theme = useColorScheme();
    const { showSuccess, showError } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<ReservationSettingsInput>({
      min_deposit_adult: 0,
      deposit_type: "FIXED",
      min_party_size: 1,
      max_party_size: 10,
      cancellation_fee: 0,
      auto_confirm: true,
      cancellation_window_minutes: 60,
    });

    useEffect(() => {
      if (initialData) {
        setFormData({
          min_deposit_adult: initialData.min_deposit_adult,
          deposit_type: initialData.deposit_type,
          min_party_size: initialData.min_party_size,
          max_party_size: initialData.max_party_size,
          cancellation_fee: initialData.cancellation_fee,
          auto_confirm: initialData.auto_confirm,
          cancellation_window_minutes: initialData.cancellation_window_minutes,
        });
      }
    }, [initialData]);

    const snapPoints = useMemo(() => ["100%"], []);

    const { mutate: saveSettings, isPending } = useMutation({
      mutationFn: (data: ReservationSettingsInput) =>
        upsertReservationSettings(data),
      onSuccess: () => {
        showSuccess("Success", "Settings updated successfully");
        queryClient.invalidateQueries({ queryKey: ["reservation-settings"] });
        onSuccess?.();
        // @ts-ignore
        ref.current?.dismiss();
      },
      onError: (error: Error) => {
        showError("Error", error.message || "Failed to save settings");
      },
    });

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
        />
      ),
      [],
    );

    const handleSave = () => {
      saveSettings(formData);
    };

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: "#ccc" }}
        backgroundStyle={{
          backgroundColor: theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
        }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 20 }}>
          <Text className="text-2xl font-poppins-bold text-primary mb-6">
            Settings
          </Text>

          <View className="gap-6">
            <View>
              <Text className="text-secondary font-poppins-medium mb-2">
                Deposit Amount (₦)
              </Text>
              <AppTextInput
                placeholder="0.00"
                keyboardType="numeric"
                value={formData.min_deposit_adult?.toString()}
                onChangeText={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    min_deposit: parseFloat(val) || 0,
                  }))
                }
              />
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-secondary font-poppins-medium mb-2">
                  Min Party
                </Text>
                <AppTextInput
                  placeholder="1"
                  keyboardType="numeric"
                  value={formData.min_party_size?.toString()}
                  onChangeText={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      min_party_size: parseInt(val) || 1,
                    }))
                  }
                />
              </View>
              <View className="flex-1">
                <Text className="text-secondary font-poppins-medium mb-2">
                  Max Party
                </Text>
                <AppTextInput
                  placeholder="10"
                  keyboardType="numeric"
                  value={formData.max_party_size?.toString()}
                  onChangeText={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      max_party_size: parseInt(val) || 1,
                    }))
                  }
                />
              </View>
            </View>

            <View>
              <Text className="text-secondary font-poppins-medium mb-2">
                Cancellation Fee (₦)
              </Text>
              <AppTextInput
                placeholder="0.00"
                keyboardType="numeric"
                value={formData.cancellation_fee?.toString()}
                onChangeText={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    cancellation_fee: parseFloat(val) || 0,
                  }))
                }
              />
            </View>

            <View>
              <Text className="text-secondary font-poppins-medium mb-2">
                Cancellation Window (minutes)
              </Text>
              <AppTextInput
                placeholder="60"
                keyboardType="numeric"
                value={formData.cancellation_window_minutes?.toString()}
                onChangeText={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    cancellation_window_minutes: parseInt(val) || 0,
                  }))
                }
              />
              <Text className="text-muted text-xs mt-1">
                Amount of time before the reservation where cancellation is free
              </Text>
            </View>

            <AppButton
              text="Save Settings"
              onPress={handleSave}
              borderRadius={50}
              //   icon{isPending ? }
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

export default ReservationFormSheet;
