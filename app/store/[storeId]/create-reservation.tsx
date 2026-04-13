import { createReservation, getAvailableSlots } from "@/api/reservation";
import { fetchProfileWithReviews } from "@/api/user";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useUserStore } from "@/store/userStore";
import { AvailableSlot } from "@/types/reservation-types";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

// ─── Helpers ────────────────────────────────────────────────────────────────
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const buildDates = (baseDate: Date = new Date()): Date[] => {
  const dates: Date[] = [];
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Get first day of the month
  const firstDay = new Date(year, month, 1);
  // Get last day of the month
  const lastDay = new Date(year, month + 1, 0);

  for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateCopy = new Date(d);
    // Only add dates that are today or in the future
    if (dateCopy >= now) {
      dates.push(dateCopy);
    }
  }
  return dates;
};

const toYMD = (d: Date) => d.toISOString().split("T")[0];

const formatSlotTime = (timeStr: string) => {
  if (!timeStr) return "";
  try {
    // timeStr is an ISO string like "2026-04-12T10:00:00"
    return format(new Date(timeStr), "h:mm a");
  } catch (e) {
    return timeStr;
  }
};

export default function CreateReservation() {
  const { storeId, name } = useLocalSearchParams<{
    storeId: string;
    name: string;
  }>();
  const router = useRouter();
  const { profile: currentUserProfile } = useUserStore();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const isOwnStore = storeId === currentUserProfile?.id;

  // State
  const [baseDate, setBaseDate] = useState(new Date());
  const bookingDates = useMemo(() => buildDates(baseDate), [baseDate]);
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const [partySize, setPartySize] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Fetch Vendor Profile (to get name)
  const { data: vendorProfile } = useQuery({
    queryKey: ["vendorProfile", storeId],
    queryFn: () => fetchProfileWithReviews(storeId!),
    enabled: !!storeId,
  });

  // Fetch Available Slots
  const {
    data: availableSlots,
    isLoading: loadingSlots,
    isFetching: isFetchingSlots,
  } = useQuery({
    queryKey: ["available-slots", storeId, selectedDate, partySize],
    queryFn: () =>
      getAvailableSlots({
        vendorId: storeId!,
        date: selectedDate,
        partySize: partySize,
      }),
    enabled: !!storeId && !!selectedDate,
  });

  // Create Reservation Mutation
  const { mutate: performCreate, isPending } = useMutation({
    mutationFn: (data: any) => createReservation(data),
    onSuccess: () => {
      showSuccess("Success", "Your reservation has been requested!");
      queryClient.invalidateQueries({ queryKey: ["customer-reservations"] });
      router.back();
    },
    onError: (error: Error) => {
      showError("Error", error.message || "Failed to create reservation");
    },
  });

  const handleCreate = () => {
    if (!selectedSlot) return;

    performCreate({
      vendor_id: storeId!,
      reservation_time: selectedSlot.slot_start,
      end_time: selectedSlot.slot_end,
      party_size: partySize,
      notes: notes,
      number_of_adult: partySize,
      number_of_children: 0,
      deposit_required: selectedSlot.min_deposit,
    });
  };

  const renderDateCard = useCallback(
    (d: Date) => {
      const key = toYMD(d);
      const isActive = selectedDate === key;
      return (
        <TouchableOpacity
          key={key}
          onPress={() => {
            setSelectedDate(key);
            setSelectedSlot(null);
          }}
          className={`px-4 py-3 rounded-2xl items-center mr-3 border ${
            isActive
              ? "bg-orange-400/10 border-button-primary"
              : "bg-input border-border-subtle"
          }`}
          style={{ minWidth: 75 }}
        >
          <Text
            className={`text-[10px] font-poppins-medium mb-1 ${isActive ? "text-white/80" : "text-gray-400"}`}
          >
            {DAY_LABELS[d.getDay()]}
          </Text>
          <Text
            className={`text-lg font-poppins-bold ${isActive ? "text-white" : "text-primary"}`}
          >
            {d.getDate()}{" "}
            <Text
              className={`text-xs font-poppins-medium ${isActive ? "text-white/90" : "text-secondary"}`}
            >
              {MONTH_LABELS[d.getMonth()]}
            </Text>
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedDate],
  );

  if (!vendorProfile && !isFetchingSlots) return <LoadingIndicator />;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Info */}
        <View className="mb-8 px-5">
          <Text className="text-primary font-poppins-bold text-2xl">
            {vendorProfile?.business_name || "Book a Table"}
          </Text>
          <Text className="text-secondary font-poppins text-sm mt-1">
            Choose your preferred date, party size, and time.
          </Text>
        </View>

        <View className="gap-8">
          {/* Section 1: Date Selection */}
          <View>
            <View className="flex-row items-center justify-between mb-4 px-6">
              <Text className="text-primary font-poppins-semibold text-base">
                Select Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowMonthPicker(true)}
                className="flex-row items-center bg-input px-3 py-1.5 rounded-full border border-border-subtle"
              >
                <Ionicons name="calendar-outline" size={14} color="#FF8C00" />
                <Text className="text-secondary font-poppins-medium text-xs ml-1.5">
                  {format(baseDate, "MMMM yyyy")}
                </Text>
              </TouchableOpacity>
            </View>
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              >
                {bookingDates.map(renderDateCard)}
              </ScrollView>
            </View>
          </View>

          {/* Section 2: Party Size Pills */}
          <View>
            <View className="px-5">
              <Text className="text-primary font-poppins-semibold mb-4 ml-1 text-base">
                Number of Guests
              </Text>
            </View>
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20 }}
              >
                <View className="flex-row gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                    <TouchableOpacity
                      key={size}
                      onPress={() => {
                        setPartySize(size);
                        setSelectedSlot(null);
                      }}
                      className={`w-12 h-12 rounded-full items-center justify-center border ${
                        partySize === size
                          ? "bg-orange-400/10 border-button-primary"
                          : "bg-input border-border-subtle"
                      }`}
                    >
                      <Text
                        className={`font-poppins-bold ${partySize === size ? "text-white" : "text-primary"}`}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => {
                      setPartySize(10);
                      setSelectedSlot(null);
                    }}
                    className={`px-4 h-12 rounded-full items-center justify-center border ${
                      partySize >= 9
                        ? "bg-button-primary border-button-primary"
                        : "bg-input border-border-subtle"
                    }`}
                  >
                    <Text
                      className={`font-poppins-bold ${partySize >= 9 ? "text-white" : "text-primary"}`}
                    >
                      8+
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Section 3: Available Time Slots */}
          <View>
            <View className="px-5">
              <View className="flex-row items-center justify-between mb-4 ml-1">
                <Text className="text-primary font-poppins-semibold text-base">
                  Available Times
                </Text>
                {(loadingSlots || isFetchingSlots) && (
                  <ActivityIndicator size="small" color="#FF8C00" />
                )}
              </View>
            </View>

            {availableSlots && availableSlots.length > 0 ? (
              <View className="flex-row flex-wrap gap-3">
                {availableSlots.map((slot, index) => {
                  const isSelected =
                    selectedSlot?.slot_start === slot.slot_start;
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedSlot(slot)}
                      className={`px-5 py-3 rounded-full border ${
                        isSelected
                          ? "bg-orange-400/10 border-button-primary"
                          : "bg-input border-border-subtle"
                      }`}
                      style={{ width: "30%" }}
                    >
                      <Text
                        className={`text-center font-poppins-semibold text-sm ${
                          isSelected ? "text-white" : "text-primary"
                        }`}
                      >
                        {formatSlotTime(slot.slot_start)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : !loadingSlots ? (
              <View className="bg-input p-6 rounded-2xl items-center border border-border-subtle border-dashed">
                <Ionicons name="time-outline" size={32} color="gray" />
                <Text className="text-secondary font-poppins text-sm mt-2">
                  No availability for this date or party size.
                </Text>
              </View>
            ) : null}
          </View>

          {/* Section 4: Reservation Info (Dynamic) */}
          <View className="px-5">
            {selectedSlot && (
              <View className="bg-orange-50 dark:bg-orange-950/20 p-5 rounded-3xl border border-orange-100 dark:border-orange-900/40">
                <View className="flex-row items-center gap-3 mb-4">
                  <View className="bg-orange-500 p-1.5 rounded-lg">
                    <Ionicons name="information" size={16} color="white" />
                  </View>
                  <Text className="text-primary font-poppins-bold text-base">
                    Booking Summary
                  </Text>
                </View>

                <View className="gap-4">
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="time-outline" size={18} color="#FF8C00" />
                    <Text className="text-secondary font-poppins text-sm">
                      Cancellation Window:{" "}
                      <Text className="font-poppins-bold text-primary">
                        {selectedSlot.cancellation_window_minutes} minutes
                      </Text>
                    </Text>
                  </View>

                  {selectedSlot.min_deposit ? (
                    <View className="flex-row items-center gap-3">
                      <Ionicons name="card-outline" size={18} color="#FF8C00" />
                      <Text className="text-secondary font-poppins text-sm">
                        Deposit:{" "}
                        <Text className="font-poppins-bold text-primary">
                          ₦{selectedSlot.min_deposit.toLocaleString()}
                        </Text>{" "}
                        (Refundable)
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center gap-3">
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#FF8C00"
                      />
                      <Text className="text-secondary font-poppins text-sm">
                        No deposit required for this booking.
                      </Text>
                    </View>
                  )}

                  {selectedSlot.cancellation_fee ? (
                    <View className="flex-row items-start gap-3">
                      <Ionicons
                        name="close-circle-outline"
                        size={18}
                        color="#FF8C00"
                      />
                      <Text className="text-secondary font-poppins text-sm flex-1 leading-5">
                        Cancellation Fee:{" "}
                        <Text className="font-poppins-bold text-primary">
                          ₦{selectedSlot.cancellation_fee.toLocaleString()}
                        </Text>{" "}
                        if cancelled after{" "}
                        {selectedSlot.cancellation_window_minutes || 60} mins.
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
          </View>

          {/* Notes Input */}
          <View className="px-5">
            <Text className="text-primary font-poppins-semibold mb-3 ml-1">
              Special Notes (Optional)
            </Text>
            <AppTextInput
              placeholder="Table near window, allergies, etc..."
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>
        </View>
      </ScrollView>

      {/* Fixed CTA Button Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-background border-t border-border-subtle p-5 pb-8">
        <AppButton
          text={
            isPending
              ? "Confirming..."
              : `Reserve Now ${selectedSlot?.min_deposit ? `(₦${selectedSlot.min_deposit.toLocaleString()})` : ""}`
          }
          onPress={handleCreate}
          disabled={!selectedSlot || isPending || isOwnStore}
          height={60}
          borderRadius={30}
          color="#FF8C00"
        />
        {isOwnStore && (
          <Text className="text-center text-xs text-red-500 font-poppins mt-2">
            You cannot book a table in your own restaurant.
          </Text>
        )}
      </View>
      {/* Month Picker Modal */}
      <DateTimePickerModal
        isVisible={showMonthPicker}
        mode="date"
        onConfirm={(date) => {
          setBaseDate(date);
          setShowMonthPicker(false);
          // If the current selected date is not in the new month, reset it
          const newYMD = toYMD(date);
          if (date.getMonth() !== new Date(selectedDate).getMonth()) {
            // Check if selected month is current month
            const isCurrentMonth =
              date.getMonth() === new Date().getMonth() &&
              date.getFullYear() === new Date().getFullYear();
            if (isCurrentMonth) {
              setSelectedDate(toYMD(new Date()));
            } else {
              // Set to first day of selected month
              const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
              setSelectedDate(toYMD(firstDay));
            }
          }
        }}
        onCancel={() => setShowMonthPicker(false)}
        minimumDate={new Date()}
      />
    </View>
  );
}
