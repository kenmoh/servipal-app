import {
  createReservationRules,
  updateReservationRules,
} from "@/api/reservation";
import AppPicker from "@/components/AppPicker";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import {
  ReservationRulesInput,
  ReservationRulesOutput,
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
  initialData?: ReservationRulesOutput | null;
  onSuccess?: () => void;
}

const DAYS = [
  { label: "Every Day", value: -1 },
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

const RuleFormSheet = forwardRef<BottomSheetModal, Props>(
  ({ initialData, onSuccess }, ref) => {
    const theme = useColorScheme();
    const { showSuccess, showError } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<ReservationRulesInput>({
      min_party_size: undefined,
      max_party_size: undefined,
      day_of_week: -1,
      min_deposit_adult: 0,
      cancellation_fee: 0,
      no_show_fee: 0,
      priority: 0,
    });

    useEffect(() => {
      if (initialData) {
        setFormData({
          min_party_size: initialData.min_party_size,
          max_party_size: initialData.max_party_size,
          day_of_week: initialData.day_of_week ?? -1,
          min_deposit_adult: initialData.min_deposit_adult,
          cancellation_fee: initialData.cancellation_fee,
          no_show_fee: initialData.no_show_fee,
          priority: initialData.priority,
        });
      } else {
        setFormData({
          min_party_size: undefined,
          max_party_size: undefined,
          day_of_week: -1,
          min_deposit_adult: 0,
          cancellation_fee: 0,
          no_show_fee: 0,
          priority: 0,
        });
      }
    }, [initialData]);

    const snapPoints = useMemo(() => ["90%"], []);

    const { mutate: saveRule, isPending } = useMutation({
      mutationFn: (data: ReservationRulesInput) => {
        const payload = { ...data };
        if (payload.day_of_week === -1) delete payload.day_of_week;

        if (initialData?.id) {
          return updateReservationRules(initialData.id, payload);
        }
        return createReservationRules(payload);
      },
      onSuccess: () => {
        showSuccess(
          "Success",
          `Rule ${initialData?.id ? "updated" : "created"} successfully`,
        );
        queryClient.invalidateQueries({ queryKey: ["reservation-rules"] });
        onSuccess?.();
        // @ts-ignore
        ref.current?.dismiss();
      },
      onError: (error: Error) => {
        showError("Error", error.message || "Failed to save rule");
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
      saveRule(formData);
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
          <Text className="text-2xl font-poppins-bold text-primary mb-2">
            {initialData ? "Edit Rule" : "New Rule"}
          </Text>
          <Text className="text-muted text-xs mb-6">
            Rules with higher priority will override global settings.
          </Text>

          <View className="gap-6 pb-10">
            <View>
              <Text className="text-secondary font-poppins-medium mb-2">
                Day of Week
              </Text>
              <AppPicker
                items={DAYS.map((d) => ({
                  id: d.value.toString(),
                  name: d.label,
                }))}
                value={formData.day_of_week?.toString() || "-1"}
                onValueChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    day_of_week: val ? parseInt(val) : -1,
                  }))
                }
                placeholder="Select Day"
                width="100%"
              />
            </View>

            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-secondary font-poppins-medium mb-2">
                  Min Party Size
                </Text>
                <AppTextInput
                  placeholder="0"
                  keyboardType="numeric"
                  value={formData.min_party_size?.toString()}
                  onChangeText={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      min_party_size: val ? parseInt(val) : undefined,
                    }))
                  }
                />
              </View>
              <View className="flex-1">
                <Text className="text-secondary font-poppins-medium mb-2">
                  Max Party Size
                </Text>
                <AppTextInput
                  placeholder="0"
                  keyboardType="numeric"
                  value={formData.max_party_size?.toString()}
                  onChangeText={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      max_party_size: val ? parseInt(val) : undefined,
                    }))
                  }
                />
              </View>
            </View>

            <View>
              <Text className="text-secondary font-poppins-medium mb-2">
                Priority
              </Text>
              <AppTextInput
                placeholder="0"
                keyboardType="numeric"
                value={formData.priority?.toString()}
                onChangeText={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: val === "" ? 0 : parseInt(val) || 0,
                  }))
                }
              />
              <Text className="text-muted text-[10px] mt-1">
                Higher numbers have higher precedence
              </Text>
            </View>

            <View className="h-px bg-border-subtle my-2" />

            <View>
              <Text className="text-secondary font-poppins-medium mb-2">
                Override Min. Deposit/Adult (₦)
              </Text>
              <AppTextInput
                placeholder="0.00"
                keyboardType="numeric"
                value={formData.min_deposit_adult?.toString()}
                onChangeText={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    min_deposit_adult: val === "" ? undefined : parseFloat(val),
                  }))
                }
              />
            </View>

            <View>
              <Text className="text-secondary font-poppins-medium mb-2">
                No-Show Fee (₦)
              </Text>
              <AppTextInput
                placeholder="0.00"
                keyboardType="numeric"
                value={formData.no_show_fee?.toString()}
                onChangeText={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    no_show_fee: val === "" ? undefined : parseFloat(val),
                  }))
                }
              />
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
                    cancellation_fee: val === "" ? undefined : parseFloat(val),
                  }))
                }
              />
            </View>

            <AppButton
              text={initialData ? "Update Rule" : "Create Rule"}
              onPress={handleSave}
              //   loading={isPending}
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

export default RuleFormSheet;
