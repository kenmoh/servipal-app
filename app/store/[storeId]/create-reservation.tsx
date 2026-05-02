import {
  createReservationIntent,
  getReservationPolicy,
  getVendorServingPeriods,
} from "@/api/reservation";
import { fetchProfileWithReviews } from "@/api/user";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { useUserStore } from "@/store/userStore";
import {
  CreateReservationIntent,
  GetServingPeriod,
} from "@/types/reservation-types";
import { formatReservationDate, generateIdempotencyKey } from "@/utils/utils";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
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

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateCopy = new Date(d);
    if (dateCopy >= now) {
      dates.push(dateCopy);
    }
  }
  return dates;
};

const toYMD = (d: Date) => {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const posthog = usePostHog();
  const [idempotencyKey] = useState(generateIdempotencyKey());

  const isOwnStore = storeId === currentUserProfile?.id;

  // State
  const [baseDate, setBaseDate] = useState(new Date());
  const bookingDates = useMemo(() => buildDates(baseDate), [baseDate]);
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));

  // Custom Time and Serving Period
  type ServingPeriod = "Breakfast" | "Lunch" | "Dinner";
  const [servingPeriod, setServingPeriod] = useState<ServingPeriod | null>(
    null,
  );
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Party Size Controls
  const [numberOfAdults, setNumberOfAdults] = useState(2);
  const [numberOfChildren, setNumberOfChildren] = useState(0);
  const [isCustomAdults, setIsCustomAdults] = useState(false);
  const [isCustomChildren, setIsCustomChildren] = useState(false);

  // Uncap the total party size based on input math directly
  const partySize = useMemo(() => {
    return (numberOfAdults || 0) + (numberOfChildren || 0);
  }, [numberOfAdults, numberOfChildren]);

  const [notes, setNotes] = useState("");
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Fetch Vendor Profile (to get name)
  const { data: vendorProfile, isLoading: isFetchingProfile } = useQuery({
    queryKey: ["vendorProfile", storeId],
    queryFn: () => fetchProfileWithReviews(storeId!),
    enabled: !!storeId,
  });

  // Fetch Serving Periods
  const { data: servingPeriods } = useQuery({
    queryKey: ["vendor-serving-periods", storeId],
    queryFn: () => getVendorServingPeriods(storeId!),
    enabled: !!storeId,
  });

  const dayOfWeek = useMemo(() => {
    if (!selectedDate) return 0;
    const [py, pm, pd] = selectedDate.split("-").map(Number);
    const dateObj = new Date(py, pm - 1, pd);
    return dateObj.getDay();
  }, [selectedDate]);

  // Fetch Reservation Policy
  const { data: policy, isLoading: isLoadingPolicy } = useQuery({
    queryKey: ["reservation-policy", storeId, dayOfWeek, partySize],
    queryFn: () =>
      getReservationPolicy({
        vendorId: storeId!,
        dayOfWeek,
        partySize,
      }),
    enabled: !!storeId && !!selectedDate && partySize > 0,
  });

  // Find active serving period details
  const { activeServingPeriodRecord, availablePeriodsForDay } = useMemo(() => {
    if (!servingPeriods || !selectedDate)
      return { activeServingPeriodRecord: null, availablePeriodsForDay: [] };

    const [py, pm, pd] = selectedDate.split("-").map(Number);
    const dateObj = new Date(py, pm - 1, pd);
    const dayOfWeek = dateObj.getDay();

    const isToday = selectedDate === toYMD(new Date());
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:00`;

    const dayPeriods = servingPeriods.filter((p) => {
      if (p.day_of_week !== dayOfWeek) return false;

      // If it's today, hide periods that have already ended
      if (isToday) {
        return p.end_time > currentTimeStr;
      }

      return true;
    });

    const match = dayPeriods.find(
      (p) => p.period.toUpperCase() === servingPeriod?.toUpperCase(),
    );

    return {
      activeServingPeriodRecord: match || null,
      availablePeriodsForDay: dayPeriods.map((p) => p.period),
    };
  }, [servingPeriods, selectedDate, servingPeriod]);

  // Auto-select first available period when date changes if current is invalid
  useEffect(() => {
    if (availablePeriodsForDay.length > 0) {
      const isCurrentValid = availablePeriodsForDay.some(
        (p) => p.toUpperCase() === servingPeriod?.toUpperCase(),
      );
      if (!isCurrentValid) {
        const first = availablePeriodsForDay[0];
        // Convert "BREAKFAST" to "Breakfast" etc if needed, or just use as is
        const formatted =
          first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
        setServingPeriod(formatted as ServingPeriod);
      }
    } else if (servingPeriods && availablePeriodsForDay.length === 0) {
      setServingPeriod(null);
    }
  }, [availablePeriodsForDay]);

  // Create Reservation Mutation
  const { mutate: performCreate, isPending } = useMutation({
    mutationFn: (data: CreateReservationIntent) =>
      createReservationIntent(data),
    onSuccess: (data) => {
      posthog.capture("reservation_created", {
        vendor_id: storeId,
        party_size: partySize,
        serving_period: servingPeriod,
        reservation_date: selectedDate,
        deposit_amount: (policy?.min_deposit_adult || 0) * numberOfAdults,
      });
      showSuccess("Success", "Your reservation has been requested!");
      queryClient.invalidateQueries({ queryKey: ["customer-reservations"] });
      router.push({
        pathname: "/payment",
        params: {
          logo: data.customization.logo,
          email: data.customer.email,
          phonenumber: data.customer.phone_number,
          fullName: data.customer.full_name,
          description: data.customization.description,
          title: data.customization.title,
          txRef: data.tx_ref,
          amount: data.amount,
          publicKey: data.public_key,
          serviceType: "RESERVATION",
        },
      });
    },
    onError: (error: Error) => {
      posthog.capture("reservation_failed", {
        vendor_id: storeId,
        error_message: error.message,
      });
      showError("Error", error.message || "Failed to create reservation");
    },
  });

  const handleCreate = () => {
    if (!selectedDate || !selectedTime || !servingPeriod) {
      showError("Validation Error", "Please select serving period and time");
      return;
    }
    if (partySize <= 0) {
      showError("Validation Error", "Party size must be at least 1");
      return;
    }

    // Must construct the reservation_time by combining selectedDate and selectedTime
    const datePart = selectedDate; // "YYYY-MM-DD"
    const reservationTimeStr = format(selectedTime, "HH:mm:ss");

    const depositRequired = (policy?.min_deposit_adult || 0) * numberOfAdults;

    performCreate({
      vendor_id: storeId!,
      customer_id: currentUserProfile?.id || "",
      reservation_time: reservationTimeStr,
      reservation_date: selectedDate,
      serving_period: servingPeriod!,
      party_size: partySize,
      notes: notes,
      number_of_adults: numberOfAdults,
      number_of_children: numberOfChildren,
      min_deposit_adult: policy?.min_deposit_adult || 0,
      day_of_week: dayOfWeek.toString(),
      business_name: vendorProfile?.business_name || "Restaurant",
      idempotencyKey,
    });
  };

  const renderDateCard = useCallback(
    (d: Date) => {
      const key = toYMD(d);
      const isActive = selectedDate === key;
      return (
        <TouchableOpacity
          key={key}
          onPress={() => setSelectedDate(key)}
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

  if (!vendorProfile && isFetchingProfile) return <LoadingIndicator />;

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

          {/* Section 2: Time and Serving Period */}
          <View>
            <Text className="text-primary font-poppins-semibold text-base mb-4 px-6">
              Serving Period
            </Text>
            <View className="flex-row px-5 gap-3">
              {availablePeriodsForDay.length > 0 ? (
                availablePeriodsForDay.map((pType) => {
                  const label =
                    pType.charAt(0).toUpperCase() +
                    pType.slice(1).toLowerCase();
                  return (
                    <TouchableOpacity
                      key={pType}
                      onPress={() => setServingPeriod(label as ServingPeriod)}
                      className={`flex-1 py-3 rounded-full border items-center justify-center ${
                        servingPeriod === label
                          ? "bg-orange-400/10 border-button-primary"
                          : "bg-input border-border-subtle"
                      }`}
                    >
                      <Text
                        className={`text-sm font-poppins-semibold ${servingPeriod === label ? "text-button-primary" : "text-primary"}`}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="flex-1 bg-input p-4 rounded-xl border border-border-subtle items-center">
                  <Text className="text-secondary font-poppins text-xs italic text-center">
                    No serving periods available for this day.
                  </Text>
                </View>
              )}
            </View>

            {activeServingPeriodRecord && (
              <View className="px-6 mt-3 flex-row items-center gap-2">
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color="#666"
                />
                <Text className="text-secondary font-poppins text-[11px]">
                  Available: {activeServingPeriodRecord.start_time.slice(0, 5)}{" "}
                  - {activeServingPeriodRecord.end_time.slice(0, 5)}
                  {"  "}|{"  "}Max Seating: {activeServingPeriodRecord.capacity}
                </Text>
              </View>
            )}

            <View className="px-5 mt-6">
              <Text className="text-primary font-poppins-semibold text-base mb-3 ml-1">
                Select Time
              </Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                className="bg-input border border-border-subtle rounded-full px-5 py-4 flex-row justify-between items-center"
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name="time-outline" size={20} color="#FF8C00" />
                  <Text
                    className={`font-poppins-medium text-base ${selectedTime ? "text-primary" : "text-gray-400"}`}
                  >
                    {selectedTime
                      ? format(selectedTime, "h:mm a")
                      : "Choose a time"}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="gray" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 3: Party Size Breakdown */}
          <View>
            <View className="px-5 mb-6">
              <Text className="text-primary font-poppins-semibold text-base">
                Party Size
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                <Ionicons name="people" size={14} color="#FF8C00" />
                <Text className="text-secondary font-poppins-medium text-xs">
                  {partySize} {partySize === 1 ? "Guest" : "Guests"} (
                  {numberOfAdults} {numberOfAdults === 1 ? "Adult" : "Adults"},{" "}
                  {numberOfChildren}{" "}
                  {numberOfChildren === 1 ? "Child" : "Children"})
                </Text>
              </View>
            </View>

            {/* Adults Selector */}
            <View className="mb-6">
              <Text className="text-secondary font-poppins-medium text-xs ml-6 mb-3">
                Adults
              </Text>
              {isCustomAdults ? (
                <View className="px-5 flex-row items-center gap-3 w-full">
                  <View className="flex-1">
                    <AppTextInput
                      placeholder="Enter number of adults"
                      keyboardType="numeric"
                      value={numberOfAdults ? numberOfAdults.toString() : ""}
                      onChangeText={(t) => setNumberOfAdults(parseInt(t) || 0)}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setIsCustomAdults(false);
                      setNumberOfAdults(2);
                    }}
                    className="h-12 w-12 bg-input border border-border-subtle rounded-xl items-center justify-center"
                  >
                    <Ionicons name="close" size={20} color="gray" />
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                >
                  <View className="flex-row gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((size) => (
                      <TouchableOpacity
                        key={`adult-${size}`}
                        onPress={() => setNumberOfAdults(size)}
                        className={`w-12 h-12 rounded-full items-center justify-center border ${
                          numberOfAdults === size
                            ? "bg-orange-400/10 border-button-primary"
                            : "bg-input border-border-subtle"
                        }`}
                      >
                        <Text
                          className={`font-poppins-bold ${numberOfAdults === size ? "text-white" : "text-primary"}`}
                        >
                          {size}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => setIsCustomAdults(true)}
                      className={`h-12 w-12 rounded-full items-center justify-center border bg-input border-border-subtle`}
                    >
                      <Text className={`font-poppins-bold text-primary`}>
                        10+
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>

            {/* Children Selector */}
            <View>
              <Text className="text-secondary font-poppins-medium text-xs ml-6 mb-3">
                Children
              </Text>
              {isCustomChildren ? (
                <View className="px-5 flex-row items-center gap-3 w-full">
                  <View className="flex-1">
                    <AppTextInput
                      placeholder="Enter number of children"
                      keyboardType="numeric"
                      value={
                        numberOfChildren ? numberOfChildren.toString() : ""
                      }
                      onChangeText={(t) =>
                        setNumberOfChildren(parseInt(t) || 0)
                      }
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setIsCustomChildren(false);
                      setNumberOfChildren(0);
                    }}
                    className="h-12 w-12 bg-input border border-border-subtle rounded-xl items-center justify-center"
                  >
                    <Ionicons name="close" size={20} color="gray" />
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                >
                  <View className="flex-row gap-3">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((size) => (
                      <TouchableOpacity
                        key={`child-${size}`}
                        onPress={() => setNumberOfChildren(size)}
                        className={`w-12 h-12 rounded-full items-center justify-center border ${
                          numberOfChildren === size
                            ? "bg-orange-400/10 border-button-primary"
                            : "bg-input border-border-subtle"
                        }`}
                      >
                        <Text
                          className={`font-poppins-bold ${numberOfChildren === size ? "text-white" : "text-primary"}`}
                        >
                          {size}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => setIsCustomChildren(true)}
                      className={`h-12 w-12 rounded-full items-center justify-center border bg-input border-border-subtle`}
                    >
                      <Text className={`font-poppins-bold text-primary`}>
                        10+
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </View>

          {/* Section 4: Reservation Summary */}
          <View className="px-5">
            {selectedDate && servingPeriod && selectedTime && (
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
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#FF8C00"
                    />
                    <Text className="text-secondary font-poppins text-sm border-b border-transparent">
                      Arrival Date:{" "}
                      <Text className="font-poppins-bold text-primary">
                        {formatReservationDate(selectedDate)}
                      </Text>
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="time-outline" size={18} color="#FF8C00" />
                    <View>
                      <Text className="text-secondary font-poppins text-sm">
                        Time:{" "}
                        <Text className="font-poppins-bold text-primary">
                          {format(selectedTime, "h:mm a")} ({servingPeriod})
                        </Text>
                      </Text>
                      {activeServingPeriodRecord && (
                        <Text className="text-muted text-[10px] font-poppins mt-0.5">
                          Operating Hours:{" "}
                          {activeServingPeriodRecord.start_time.slice(0, 5)} -{" "}
                          {activeServingPeriodRecord.end_time.slice(0, 5)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Ionicons name="people-outline" size={18} color="#FF8C00" />
                    <View className="flex-1">
                      <Text className="text-secondary font-poppins text-sm">
                        Your Selection:{" "}
                        <Text className="font-poppins-bold text-primary">
                          {partySize} Guests
                        </Text>
                      </Text>
                      {activeServingPeriodRecord && (
                        <Text className="text-muted text-[10px] font-poppins mt-0.5">
                          Max Period Seating:{" "}
                          {activeServingPeriodRecord.capacity}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Policy Driven Info */}
                  {policy && (
                    <View className="mt-4 pt-4 border-t border-orange-200/50 dark:border-orange-800/30 gap-4">
                      {policy.min_deposit_adult > 0 && (
                        <View className="flex-row items-center gap-3">
                          <Ionicons
                            name="card-outline"
                            size={18}
                            color="#FF8C00"
                          />
                          <View>
                            <Text className="text-secondary font-poppins text-sm">
                              Required Deposit:{" "}
                              <Text className="font-poppins-bold text-primary">
                                ₦
                                {(
                                  policy.min_deposit_adult * numberOfAdults
                                ).toLocaleString()}{" "}
                              </Text>
                            </Text>
                            <Text className="text-muted text-[10px] font-poppins mt-0.5">
                              ₦{policy.min_deposit_adult.toLocaleString()} per
                              adult
                            </Text>
                          </View>
                        </View>
                      )}

                      {(policy.cancellation_fee > 0 ||
                        policy.no_show_fee > 0) && (
                        <View className="flex-row items-center gap-3">
                          <Ionicons
                            name="alert-circle-outline"
                            size={18}
                            color="#FF8C00"
                          />
                          <View className="flex-1">
                            <Text className="text-secondary font-poppins text-[13px]">
                              Policies:{" "}
                            </Text>
                            <View className="flex-row flex-wrap gap-2 mt-1">
                              {policy.cancellation_fee > 0 && (
                                <Text className="text-muted text-[10px] font-poppins">
                                  • Cancellation: ₦
                                  {policy.cancellation_fee.toLocaleString()}{" "}
                                  (within {policy.cancellation_window_minutes}{" "}
                                  minutes after reservation time)
                                </Text>
                              )}
                              {policy.no_show_fee > 0 && (
                                <Text className="text-muted text-[10px] font-poppins">
                                  • No-Show: ₦
                                  {policy.no_show_fee.toLocaleString()}
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      )}

                      <View className="flex-row items-center gap-3">
                        <Ionicons
                          name="list-outline"
                          size={18}
                          color="#FF8C00"
                        />
                        <Text className="text-muted text-[10px] font-poppins flex-1">
                          Booking limits: {policy.min_party_size} -{" "}
                          {policy.max_party_size} guests
                        </Text>
                      </View>

                      {policy.terms && (
                        <View className="bg-orange-100/50 dark:bg-orange-950/40 p-3 rounded-xl border border-orange-200/30">
                          <Text className="text-secondary font-poppins-italic text-[11px] leading-4">
                            {policy.terms}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
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
          text={isPending ? "Confirming..." : "Reserve Table"}
          onPress={handleCreate}
          disabled={
            !selectedTime ||
            !servingPeriod ||
            isPending ||
            isOwnStore ||
            partySize <= 0 ||
            !!(
              policy &&
              (partySize < policy.min_party_size ||
                partySize > policy.max_party_size)
            )
          }
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

      {/* Modals */}
      <DateTimePickerModal
        isVisible={showMonthPicker}
        mode="date"
        onConfirm={(date) => {
          setBaseDate(date);
          setShowMonthPicker(false);
          const newYMD = toYMD(date);
          if (date.getMonth() !== new Date(selectedDate).getMonth()) {
            const isCurrentMonth =
              date.getMonth() === new Date().getMonth() &&
              date.getFullYear() === new Date().getFullYear();
            if (isCurrentMonth) {
              setSelectedDate(toYMD(new Date()));
            } else {
              const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
              setSelectedDate(toYMD(firstDay));
            }
          }
        }}
        onCancel={() => setShowMonthPicker(false)}
        minimumDate={new Date()}
      />

      <DateTimePickerModal
        isVisible={showTimePicker}
        mode="time"
        onConfirm={(time) => {
          setSelectedTime(time);
          setShowTimePicker(false);
        }}
        onCancel={() => setShowTimePicker(false)}
      />
    </View>
  );
}
