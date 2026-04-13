import { AppButton } from "@/components/ui/app-button";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useAvailabilityStore } from "@/store/availabilityStore";
import { useUserStore } from "@/store/userStore";
import { useToast } from "@/components/ToastProvider";
import {
  generateTimeSlots,
  getDayName,
  getShortDayName,
} from "@/utils/availability";
import { DayConfig } from "@/store/availabilityStore";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { upsertVendorAvailabilityBulk } from "@/api/user";
import { router, Stack } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useColorScheme as useNativeColorScheme,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

const ConfirmAvailability = () => {
  const { generatedSlots, formData, resetFormData } = useAvailabilityStore();
  const { user } = useUserStore();
  const { showError, showSuccess } = useToast();
  const theme = useColorScheme();
  const nativeTheme = useNativeColorScheme();
  const [expandedDays, setExpandedDays] = useState<number[]>([]);

  // Mutation for upserting vendor availability
  const upsertMutation = useMutation({
    mutationFn: (slots: typeof generatedSlots) =>
      upsertVendorAvailabilityBulk(slots),
    onSuccess: () => {
      showSuccess("Success", "Availability published successfully");
      resetFormData();
      router.push("/laundry-store/vendor-availability");
    },
    onError: (error: any) => {
      showError("Error", error.message || "Failed to publish availability");
    },
  });

  const bgColor = nativeTheme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  // Group slots by day
  const slotsByDay = generatedSlots.reduce(
    (acc, slot) => {
      if (!acc[slot.day_of_week]) {
        acc[slot.day_of_week] = [];
      }
      acc[slot.day_of_week].push(slot);
      return acc;
    },
    {} as Record<number, typeof generatedSlots>,
  );

  const toggleDayExpansion = (dayOfWeek: number) => {
    setExpandedDays((prev) =>
      prev.includes(dayOfWeek)
        ? prev.filter((d) => d !== dayOfWeek)
        : [...prev, dayOfWeek],
    );
  };

  const getDayConfig = (dayOfWeek: number): DayConfig | null => {
    const slot = generatedSlots.find((s) => s.day_of_week === dayOfWeek);
    if (!slot) return null;
    return {
      startTime: slot.start_time.substring(0, 5),
      endTime: slot.end_time.substring(0, 5),
      slotInterval: slot.slot_interval,
      capacity: slot.capacity,
      isExpress: slot.is_express,
      expressFee: slot.express_fee || 0,
    };
  };

  const handleConfirm = async () => {
    if (!user?.id) {
      showError("Error", "User not authenticated");
      return;
    }

    try {
      upsertMutation.mutate(generatedSlots);
    } catch (error: any) {
      showError("Error", error.message || "Failed to save availability");
    }
  };

  if (generatedSlots.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            title: "Preview Availability",
            headerStyle: { backgroundColor: bgColor },
            headerTintColor: nativeTheme === "dark" ? "white" : "black",
          }}
        />
        <View className="flex-1 items-center justify-center bg-background">
          <Text className="text-center text-primary font-poppins-medium">
            No availability data to preview
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Preview Availability",
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: nativeTheme === "dark" ? "white" : "black",
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 gap-4">
          {/* Summary Card */}
          <View
            className="bg-orange-50 rounded-lg p-4 border border-orange-200"
            style={[
              nativeTheme === "dark" && {
                backgroundColor: "rgba(255, 165, 0, 0.1)",
                borderColor: "rgba(255, 165, 0, 0.3)",
              },
            ]}
          >
            <View className="flex-row items-start gap-3">
              <MaterialIcons name="check-circle" size={24} color="orange" />
              <View className="flex-1 gap-2">
                <Text
                  className="text-orange-900 font-poppins-semibold text-base"
                  style={[
                    nativeTheme === "dark" && {
                      color: "rgba(255, 193, 7, 0.9)",
                    },
                  ]}
                >
                  Ready to Publish
                </Text>
                <Text
                  className="text-orange-800 text-sm font-poppins"
                  style={[
                    nativeTheme === "dark" && {
                      color: "rgba(255, 193, 7, 0.7)",
                    },
                  ]}
                >
                  {generatedSlots.length} availability slot
                  {generatedSlots.length > 1 ? "s" : ""} will be created across{" "}
                  {Object.keys(slotsByDay).length} day
                  {Object.keys(slotsByDay).length > 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Configuration Summary */}
          <View className="gap-3">
            <Text className="text-lg font-poppins-semibold text-primary">
              Configuration
            </Text>
            <View
              className="rounded-lg p-4 gap-3 border border-gray-200"
              style={[
                nativeTheme === "dark" && {
                  borderColor: "#333",
                },
              ]}
            >
              {/* Service Type */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1">
                  <FontAwesome5 name="shipping-fast" size={16} color="orange" />
                  <Text className="text-primary font-poppins text-sm">
                    Service Type
                  </Text>
                </View>
                <Text className="text-primary font-poppins-semibold">
                  {formData.serviceType}
                </Text>
              </View>

              <View
                className="h-px bg-gray-200"
                style={[
                  nativeTheme === "dark" && {
                    backgroundColor: "#333",
                  },
                ]}
              />

              {/* Days */}
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 flex-1">
                  <MaterialIcons name="date-range" size={16} color="orange" />
                  <Text className="text-primary font-poppins text-sm">
                    Days
                  </Text>
                </View>
                <Text className="text-primary font-poppins-semibold">
                  {Object.keys(slotsByDay).length} day
                  {Object.keys(slotsByDay).length > 1 ? "s" : ""}
                </Text>
              </View>

              {/* Express Fee */}
              {formData.isExpressEnabled && (
                <>
                  <View
                    className="h-px bg-gray-200"
                    style={[
                      nativeTheme === "dark" && {
                        backgroundColor: "#333",
                      },
                    ]}
                  />
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2 flex-1">
                      <MaterialIcons
                        name="local-shipping"
                        size={16}
                        color="orange"
                      />
                      <Text className="text-primary font-poppins text-sm">
                        Express Fee
                      </Text>
                    </View>
                    <Text className="text-primary font-poppins-semibold">
                      ₦{formData.expressFee.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Availability by Day */}
          <View className="gap-3">
            <Text className="text-lg font-poppins-semibold text-primary">
              Availability Details
            </Text>
            {Object.entries(slotsByDay).map(([dayNum, slots]) => {
              const dayOfWeek = Number(dayNum);
              const isExpanded = expandedDays.includes(dayOfWeek);
              const slot = slots[0];

              return (
                <TouchableOpacity
                  key={dayOfWeek}
                  onPress={() => toggleDayExpansion(dayOfWeek)}
                  activeOpacity={0.7}
                  className="rounded-lg overflow-hidden border border-gray-200"
                  style={[
                    nativeTheme === "dark" && {
                      borderColor: "#333",
                    },
                  ]}
                >
                  {/* Day Header */}
                  <View
                    className="bg-gray-50 p-4 flex-row items-center justify-between"
                    style={[
                      nativeTheme === "dark" && {
                        backgroundColor: "rgba(30, 33, 39, 0.5)",
                      },
                    ]}
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View
                        className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center"
                        style={[
                          nativeTheme === "dark" && {
                            backgroundColor: "rgba(255, 165, 0, 0.2)",
                          },
                        ]}
                      >
                        <Text
                          className="font-poppins-semibold text-xs text-orange-600"
                          style={[
                            nativeTheme === "dark" && {
                              color: "orange",
                            },
                          ]}
                        >
                          {getShortDayName(dayOfWeek)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="font-poppins-semibold text-primary">
                            {getDayName(dayOfWeek)}
                          </Text>
                          {slot.is_express && (
                            <Text className="text-muted text-xs font-poppins">
                              ⚡
                            </Text>
                          )}
                        </View>
                        <Text className="text-muted text-xs font-poppins">
                          {slot.start_time.substring(0, 5)} -{" "}
                          {slot.end_time.substring(0, 5)}
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons
                      name={isExpanded ? "expand-less" : "expand-more"}
                      size={24}
                      color={nativeTheme === "dark" ? "white" : "black"}
                    />
                  </View>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <View
                      className="p-4 gap-3 border-t border-gray-200"
                      style={[
                        nativeTheme === "dark" && {
                          borderColor: "#333",
                        },
                      ]}
                    >
                      {/* Time Window Row */}
                      <View className="flex-row items-center justify-between">
                        <Text className="text-muted text-sm font-poppins">
                          Operating Hours
                        </Text>
                        <Text className="text-primary font-poppins-semibold text-sm">
                          {slot.start_time.substring(0, 5)} -{" "}
                          {slot.end_time.substring(0, 5)}
                        </Text>
                      </View>

                      {/* Slot Interval Row */}
                      <View className="flex-row items-center justify-between">
                        <Text className="text-muted text-sm font-poppins">
                          Slot Interval
                        </Text>
                        <Text className="text-primary font-poppins-semibold text-sm">
                          {slot.slot_interval} minutes
                        </Text>
                      </View>

                      {/* Capacity Row */}
                      <View className="flex-row items-center justify-between">
                        <Text className="text-muted text-sm font-poppins">
                          Orders per Slot
                        </Text>
                        <Text className="text-primary font-poppins-semibold text-sm">
                          {slot.capacity}
                        </Text>
                      </View>

                      {/* Express Fee Row */}
                      <View className="flex-row items-center justify-between">
                        <Text className="text-muted text-sm font-poppins">
                          Express Fee
                        </Text>
                        <Text className="text-primary font-poppins-semibold text-sm">
                          ₦{slot.express_fee}
                        </Text>
                      </View>

                      {/* Express Fee Row */}
                      {formData.isExpressEnabled && (
                        <View className="flex-row items-center justify-between">
                          <Text className="text-muted text-sm font-poppins">
                            Express Fee
                          </Text>
                          <Text className="text-primary font-poppins-semibold text-sm">
                            ₦{slot.express_fee?.toFixed(2) || "0.00"}
                          </Text>
                        </View>
                      )}

                      {/* Time Slots for this day */}
                      {(() => {
                        const dayConfig = getDayConfig(dayOfWeek);
                        if (!dayConfig) return null;
                        const dayTimeSlots = generateTimeSlots(
                          dayConfig.startTime,
                          dayConfig.endTime,
                          dayConfig.slotInterval,
                        );
                        return (
                          <View
                            className="mt-2 p-3 bg-blue-50 rounded-lg gap-2"
                            style={[
                              nativeTheme === "dark" && {
                                backgroundColor: "rgba(59, 130, 246, 0.1)",
                              },
                            ]}
                          >
                            <View className="flex-row items-center gap-2">
                              <MaterialIcons
                                name="info"
                                size={16}
                                color="blue"
                              />
                              <Text
                                className="text-blue-800 text-xs font-poppins flex-1"
                                style={[
                                  nativeTheme === "dark" && {
                                    color: "rgba(147, 197, 253, 0.8)",
                                  },
                                ]}
                              >
                                {dayTimeSlots.length} time slots will be
                                available
                              </Text>
                            </View>
                            <View className="flex-row flex-wrap gap-1">
                              {dayTimeSlots.slice(0, 6).map((time, idx) => (
                                <View
                                  key={idx}
                                  className="bg-blue-100 rounded-full px-2 py-1"
                                  style={[
                                    nativeTheme === "dark" && {
                                      backgroundColor:
                                        "rgba(59, 130, 246, 0.15)",
                                    },
                                  ]}
                                >
                                  <Text
                                    className="text-blue-800 text-xs font-poppins"
                                    style={[
                                      nativeTheme === "dark" && {
                                        color: "rgba(147, 197, 253, 0.8)",
                                      },
                                    ]}
                                  >
                                    {time}
                                  </Text>
                                </View>
                              ))}
                              {dayTimeSlots.length > 6 && (
                                <View
                                  className="bg-blue-100 rounded-full px-2 py-1"
                                  style={[
                                    nativeTheme === "dark" && {
                                      backgroundColor:
                                        "rgba(59, 130, 246, 0.15)",
                                    },
                                  ]}
                                >
                                  <Text
                                    className="text-blue-800 text-xs font-poppins"
                                    style={[
                                      nativeTheme === "dark" && {
                                        color: "rgba(147, 197, 253, 0.8)",
                                      },
                                    ]}
                                  >
                                    +{dayTimeSlots.length - 6} more
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })()}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View
        className="absolute bottom-0 mb-6 left-0 right-0 bg-background border-t border-gray-200 p-4 gap-3"
        style={[
          nativeTheme === "dark" && {
            borderColor: "#333",
          },
        ]}
      >
        <AppButton
          text={upsertMutation.isPending ? "" : "Confirm & Publish"}
          onPress={handleConfirm}
          disabled={upsertMutation.isPending}
          width="100%"
          height={50}
          borderRadius={50}
          icon={upsertMutation.isPending && <ActivityIndicator color="white" />}
        />
      </View>
    </>
  );
};

export default ConfirmAvailability;
