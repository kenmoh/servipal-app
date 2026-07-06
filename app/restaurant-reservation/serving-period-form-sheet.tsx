import { createServingPeriod, updateServingPeriod } from "@/api/reservation";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  CreateServingPeriod,
  GetServingPeriod,
  ServingPeriod,
  UpdateServingPeriod,
} from "@/types/reservation-types";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { HEADER_BG_DARK, HEADER_BG_LIGHT, INPUT_BG_DARK, INPUT_BG_LIGHT } from "@/constants/theme";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface ServingPeriodFormSheetProps {
  onClose?: () => void;
  initialData?: GetServingPeriod | null;
}

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PERIOD_TYPES: ServingPeriod[] = ["BREAKFAST", "LUNCH", "DINNER"];

const ServingPeriodFormSheet = forwardRef<BottomSheetModal, ServingPeriodFormSheetProps>(
  ({ onClose, initialData }, ref) => {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [period, setPeriod] = useState<ServingPeriod>("LUNCH");
  const [startTime, setStartTime] = useState("09:00:00");
  const [endTime, setEndTime] = useState("22:00:00");
  const [capacity, setCapacity] = useState("20");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setDayOfWeek(initialData.day_of_week);
      setPeriod(initialData.period);
      setStartTime(initialData.start_time);
      setEndTime(initialData.end_time);
      setCapacity(initialData.capacity.toString());
      setIsActive(initialData.is_active);
    } else {
      // Reset for new
      setDayOfWeek(1);
      setPeriod("LUNCH");
      setStartTime("09:00:00");
      setEndTime("22:00:00");
      setCapacity("20");
      setIsActive(true);
    }
  }, [initialData]);

  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [pickingType, setPickingType] = useState<"start" | "end">("start");

  const theme = useColorScheme();
  const isDark = theme === "dark";
  const sheetBackground = isDark ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const surfaceColor = isDark ? INPUT_BG_DARK : INPUT_BG_LIGHT;
  const borderColor = isDark ? "#374151" : "#e5e7eb";
  const textPrimary = isDark ? "#f9fafb" : "#111827";
  const textSecondary = isDark ? "#d1d5db" : "#6b7280";
  const mutedText = isDark ? "#9ca3af" : "#6b7280";

  const bottomSheetRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => bottomSheetRef.current as BottomSheetModal, []);

  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.dismiss();
    onClose?.();
  }, [onClose]);

  const handleSheetDismiss = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        onPress={handleClose}
      />
    ),
    [handleClose],
  );

  const { mutate: performSave, isPending } = useMutation({
    mutationFn: async () => {
      if (initialData) {
        const payload: UpdateServingPeriod = {
          id: initialData.id,
          period: period,
          start_time: startTime,
          end_time: endTime,
          capacity: parseInt(capacity) || 0,
          is_active: isActive,
        };
        return updateServingPeriod(payload);
      } else {
        const payload: CreateServingPeriod = {
          day_of_week: dayOfWeek,
          period: period,
          start_time: startTime,
          end_time: endTime,
          capacity: parseInt(capacity) || 0,
        };
        return createServingPeriod(payload);
      }
    },
    onSuccess: () => {
      showSuccess(
        "Success",
        initialData
          ? "Serving period updated successfully"
          : "Serving period created successfully",
      );
      queryClient.invalidateQueries({ queryKey: ["vendor-serving-periods"] });
      handleClose();
    },
    onError: (error: Error) => {
      showError(
        "Error",
        error.message ||
          (initialData
            ? "Failed to update serving period"
            : "Failed to create serving period"),
      );
    },
  });

  const handleConfirmTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const formatted = `${hours}:${minutes}:00`;

    if (pickingType === "start") setStartTime(formatted);
    else setEndTime(formatted);

    setTimePickerVisible(false);
  };

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={["90%"]}
      backdropComponent={renderBackdrop}
      onDismiss={handleSheetDismiss}
      backgroundStyle={{ backgroundColor: sheetBackground }}
      handleIndicatorStyle={{ backgroundColor: isDark ? "#555" : "#ccc" }}
    >
        <BottomSheetView
          style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 40, backgroundColor: sheetBackground }}
        >
          <View style={{ paddingVertical: 20 }}>
            <Text style={{ color: textPrimary }} className="text-xl font-poppins-semibold mb-2">
              {initialData ? "Edit Serving Period" : "Add Serving Period"}
            </Text>
          </View>

          <ScrollView className="pb-10" showsVerticalScrollIndicator={false}>
            <View className="gap-6">
            {/* Day Selection */}
            <View>
              <Text style={{ color: textSecondary }} className="font-poppins-medium text-xs mb-3 uppercase ml-1">
                Select Day
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DAYS.map((day, index) => {
                  const selected = dayOfWeek === index;
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => setDayOfWeek(index)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        borderWidth: 1,
                        marginRight: 8,
                        marginBottom: 8,
                        backgroundColor: selected
                          ? "rgba(249, 115, 22, 0.18)"
                          : surfaceColor,
                        borderColor: selected ? "#f97316" : borderColor,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Poppins-Medium",
                          color: selected ? "#fff" : textSecondary,
                        }}
                      >
                        {day.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Period Type */}
            <View>
              <Text style={{ color: textSecondary }} className="font-poppins-medium text-xs mb-3 uppercase ml-1">
                Serving Period
              </Text>
              <View className="flex-row gap-2">
                {PERIOD_TYPES.map((p) => {
                  const selected = period === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setPeriod(p)}
                      style={{
                        flex: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        alignItems: "center",
                        backgroundColor: selected
                          ? "rgba(249, 115, 22, 0.18)"
                          : surfaceColor,
                        borderColor: selected ? "#f97316" : borderColor,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Poppins-Medium",
                          color: selected ? "#fff" : textSecondary,
                        }}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Time Pickers */}
            <View className="flex-row gap-4">
              <View className="flex-1">
                  <Text style={{ color: textSecondary }} className="font-poppins-medium text-xs mb-2 uppercase ml-1">
                  Start Time
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setPickingType("start");
                    setTimePickerVisible(true);
                  }}
                  style={{
                    backgroundColor: surfaceColor,
                    borderColor,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: textPrimary, fontFamily: "Poppins-Regular" }}>
                    {startTime.slice(0, 5)}
                  </Text>
                  <Ionicons name="time-outline" size={20} color={textSecondary} />
                </TouchableOpacity>
              </View>
              <View className="flex-1">
                  <Text style={{ color: textSecondary }} className="font-poppins-medium text-xs mb-2 uppercase ml-1">
                  End Time
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setPickingType("end");
                    setTimePickerVisible(true);
                  }}
                  style={{
                    backgroundColor: surfaceColor,
                    borderColor,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 16,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: textPrimary, fontFamily: "Poppins-Regular" }}>
                    {endTime.slice(0, 5)}
                  </Text>
                  <Ionicons name="time-outline" size={20} color={textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Capacity */}
            <View>
              <Text style={{ color: textSecondary }} className="font-poppins-medium text-xs mb-2 uppercase ml-1">
                Total Capacity (Seats)
              </Text>
              <AppTextInput
                placeholder="e.g. 20"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
                backgroundColor={surfaceColor}
                // textColor={textPrimary}
                placeholderColor={mutedText}
                style={{ borderWidth: 1, borderColor }}
              />
            </View>

            {/* Status Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: surfaceColor,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor,
              }}
            >
              <View>
                <Text style={{ color: textPrimary }} className="font-poppins-semibold text-sm">
                  Active Status
                </Text>
                <Text style={{ color: textSecondary }} className="font-poppins text-xs mt-0.5">
                  {isActive
                    ? "This period is active and accepting bookings"
                    : "This period is currently disabled"}
                </Text>
              </View>
              <Pressable
                onPress={() => setIsActive((value) => !value)}
                className={`w-14 h-8 rounded-full p-1 flex-row items-center ${
                  isActive ? "bg-button-primary" : "bg-gray-300"
                }`}
              >
                <View
                  className={`w-6 h-6 rounded-full bg-white shadow-sm ${
                    isActive ? "ml-auto" : "mr-auto"
                  }`}
                />
              </Pressable>
            </View>

            <View className="mt-8">
              <AppButton
                text={
                  isPending
                    ? "Saving..."
                    : initialData
                      ? "Update Serving Period"
                      : "Save Serving Period"
                }
                onPress={() => performSave()}
                disabled={isPending}
                height={55}
                borderRadius={28}
              />
            </View>
          </View>
        </ScrollView>

        <DateTimePickerModal
          isVisible={isTimePickerVisible}
          mode="time"
          onConfirm={handleConfirmTime}
          onCancel={() => setTimePickerVisible(false)}
          date={new Date()}
        />
        </BottomSheetView>
      </BottomSheetModal>
  );
});

export default ServingPeriodFormSheet;


