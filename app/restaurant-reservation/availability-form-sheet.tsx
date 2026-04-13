import {
  createAvailability,
  updateAvailability,
} from "@/api/reservation";
import AppModal from "@/components/AppModal";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { RestaurantAvailability } from "@/types/reservation-types";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface AvailabilityFormSheetProps {
  isVisible: boolean;
  onClose: () => void;
  availability?: RestaurantAvailability | null;
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

export default function AvailabilityFormSheet({
  isVisible,
  onClose,
  availability,
}: AvailabilityFormSheetProps) {
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [openTime, setOpenTime] = useState("09:00:00");
  const [closeTime, setCloseTime] = useState("22:00:00");
  const [slotInterval, setSlotInterval] = useState("30");
  const [reservationDuration, setReservationDuration] = useState("60");
  const [bufferMinutes, setBufferMinutes] = useState("15");
  const [isActive, setIsActive] = useState(true);

  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [pickingType, setPickingType] = useState<"open" | "close">("open");

  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (availability) {
      setDayOfWeek(availability.day_of_week);
      setOpenTime(availability.open_time);
      setCloseTime(availability.close_time);
      setSlotInterval(availability.slot_interval?.toString() || "30");
      setReservationDuration(
        availability.reservation_duration?.toString() || "60",
      );
      setBufferMinutes(availability.buffer_minutes?.toString() || "15");
      setIsActive(availability.is_active ?? true);
    } else {
      setDayOfWeek(1);
      setOpenTime("09:00:00");
      setCloseTime("22:00:00");
      setSlotInterval("30");
      setReservationDuration("60");
      setBufferMinutes("15");
      setIsActive(true);
    }
  }, [availability, isVisible]);

  const { mutate: performSave, isPending } = useMutation({
    mutationFn: async () => {
      const payload = {
        day_of_week: dayOfWeek,
        open_time: openTime,
        close_time: closeTime,
        slot_interval: parseInt(slotInterval),
        reservation_duration: parseInt(reservationDuration),
        buffer_minutes: parseInt(bufferMinutes),
        is_active: isActive,
      };

      if (availability) {
        return updateAvailability(availability.id, payload);
      } else {
        return createAvailability(payload);
      }
    },
    onSuccess: () => {
      showSuccess(
        "Success",
        `Availability ${availability ? "updated" : "created"} successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ["vendor-availability"] });
      onClose();
    },
    onError: (error: Error) => {
      showError("Error", error.message || "Failed to save availability");
    },
  });

  const handleConfirmTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const formatted = `${hours}:${minutes}:00`;

    if (pickingType === "open") setOpenTime(formatted);
    else setCloseTime(formatted);

    setTimePickerVisible(false);
  };

  return (
    <AppModal
      visible={isVisible}
      onClose={onClose}
      title={availability ? "Edit Availability" : "Add Availability"}
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
                  className={`px-3 py-2 rounded-xl border ${
                    dayOfWeek === index
                      ? "bg-orange-500 border-orange-500"
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

          {/* Time Pickers */}
          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-secondary font-poppins-medium text-xs mb-2 uppercase ml-1">
                Open Time
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPickingType("open");
                  setTimePickerVisible(true);
                }}
                className="bg-input p-4 rounded-2xl border border-border-subtle flex-row justify-between items-center"
              >
                <Text className="text-primary font-poppins">
                  {openTime.slice(0, 5)}
                </Text>
                <Ionicons name="time-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <View className="flex-1">
              <Text className="text-secondary font-poppins-medium text-xs mb-2 uppercase ml-1">
                Close Time
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPickingType("close");
                  setTimePickerVisible(true);
                }}
                className="bg-input p-4 rounded-2xl border border-border-subtle flex-row justify-between items-center"
              >
                <Text className="text-primary font-poppins">
                  {closeTime.slice(0, 5)}
                </Text>
                <Ionicons name="time-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Configuration */}
          <View className="gap-3">
            <View>
              <Text className="text-secondary font-poppins-medium text-xs mb-2 uppercase ml-1">
                Slot Interval (Minutes)
              </Text>
              <AppTextInput
                placeholder="e.g. 30"
                value={slotInterval}
                onChangeText={setSlotInterval}
                keyboardType="numeric"
              />
            </View>
            <View>
              <Text className="text-secondary font-poppins-medium text-xs mb-2 uppercase ml-1">
                Avg. Reservation Duration (Minutes)
              </Text>
              <AppTextInput
                placeholder="e.g. 60"
                value={reservationDuration}
                onChangeText={setReservationDuration}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View className="flex-row items-center justify-between bg-input p-4 rounded-2xl border border-border-subtle">
            <View>
              <Text className="text-primary font-poppins-semibold">
                Status
              </Text>
              <Text className="text-muted text-xs font-poppins">
                Enable or disable this time slot
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: "#767577", true: "#FF8C00" }}
              thumbColor={isActive ? "#fff" : "#f4f3f4"}
            />
          </View>

          <View className="mt-4">
            <AppButton
              text={
                isPending
                  ? "Saving..."
                  : availability
                  ? "Update Availability"
                  : "Save Availability"
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
