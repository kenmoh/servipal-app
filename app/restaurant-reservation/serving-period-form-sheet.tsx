import { createServingPeriod, updateServingPeriod } from "@/api/reservation";
import AppModal from "@/components/AppModal";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import {
  CreateServingPeriod,
  GetServingPeriod,
  ServingPeriod,
  UpdateServingPeriod,
} from "@/types/reservation-types";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface ServingPeriodFormSheetProps {
  isVisible: boolean;
  onClose: () => void;
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

export default function ServingPeriodFormSheet({
  isVisible,
  onClose,
  initialData,
}: ServingPeriodFormSheetProps) {
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
  }, [initialData, isVisible]);

  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [pickingType, setPickingType] = useState<"start" | "end">("start");

  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

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
      onClose();
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
    <AppModal
      visible={isVisible}
      onClose={onClose}
      title={initialData ? "Edit Serving Period" : "Add Serving Period"}
    >
      <ScrollView className="pb-10" showsVerticalScrollIndicator={false}>
        <View className="gap-6">
          {/* Day Selection */}
          <View>
            <Text className="text-secondary font-poppins-medium text-xs mb-3 uppercase ml-1">
              Select Day
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DAYS.map((day, index) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => setDayOfWeek(index)}
                  className={`px-3 py-2 rounded-full border ${
                    dayOfWeek === index
                      ? "bg-orange-500/20 border-button-primary"
                      : "bg-input border-border-subtle"
                  }`}
                >
                  <Text
                    className={`font-poppins-medium text-xs ${
                      dayOfWeek === index ? "text-white" : "text-secondary"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Period Type */}
          <View>
            <Text className="text-secondary font-poppins-medium text-xs mb-3 uppercase ml-1">
              Serving Period
            </Text>
            <View className="flex-row gap-2">
              {PERIOD_TYPES.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  className={`flex-1 px-3 py-3 rounded-full border items-center ${
                    period === p
                      ? "bg-orange-500/20 border-button-primary"
                      : "bg-input border-border-subtle"
                  }`}
                >
                  <Text
                    className={`font-poppins-medium text-xs ${
                      period === p ? "text-white" : "text-secondary"
                    }`}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Pickers */}
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-secondary font-poppins-medium text-xs mb-2 uppercase ml-1">
                Start Time
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPickingType("start");
                  setTimePickerVisible(true);
                }}
                className="bg-input p-4 rounded-2xl border border-border-subtle flex-row justify-between items-center"
              >
                <Text className="text-primary font-poppins">
                  {startTime.slice(0, 5)}
                </Text>
                <Ionicons name="time-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <View className="flex-1">
              <Text className="text-secondary font-poppins-medium text-xs mb-2 uppercase ml-1">
                End Time
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPickingType("end");
                  setTimePickerVisible(true);
                }}
                className="bg-input p-4 rounded-2xl border border-border-subtle flex-row justify-between items-center"
              >
                <Text className="text-primary font-poppins">
                  {endTime.slice(0, 5)}
                </Text>
                <Ionicons name="time-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Capacity */}
          <View>
            <Text className="text-secondary font-poppins-medium text-xs mb-2 uppercase ml-1">
              Total Capacity (Seats)
            </Text>
            <AppTextInput
              placeholder="e.g. 20"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
            />
          </View>

          {/* Status Toggle */}
          <View className="flex-row items-center justify-between bg-input p-4 rounded-2xl border border-border-subtle">
            <View>
              <Text className="text-primary font-poppins-semibold text-sm">
                Active Status
              </Text>
              <Text className="text-secondary font-poppins text-xs mt-0.5">
                {isActive
                  ? "This period is active and accepting bookings"
                  : "This period is currently disabled"}
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: "#767577", true: "#FF8C00" }}
              thumbColor={isActive ? "#f4f3f4" : "#f4f3f4"}
            />
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
    </AppModal>
  );
}
