import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";
import {
  useAvailabilityStore,
  DEFAULT_DAY_CONFIG,
  DayConfig,
} from "@/store/availabilityStore";
import {
  generateAvailabilityInputs,
  validateAvailabilityForm,
  getDayName,
} from "@/utils/availability";
import { useColorScheme } from "@/hooks/use-color-scheme";
import DateTimePicker from "react-native-modal-datetime-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
import Fontisto from "@expo/vector-icons/Fontisto";

const DAYS_OF_WEEK = [
  { id: 0, name: "Sun" },
  { id: 1, name: "Mon" },
  { id: 2, name: "Tue" },
  { id: 3, name: "Wed" },
  { id: 4, name: "Thu" },
  { id: 5, name: "Fri" },
  { id: 6, name: "Sat" },
];

const VendorAvailability = () => {
  const { vendorId } = useLocalSearchParams<{ vendorId?: string }>();
  const { user } = useUserStore();
  const { formData, setFormData, setDayConfig, setGeneratedSlots } =
    useAvailabilityStore();
  const theme = useColorScheme();
  const nativeTheme = useNativeColorScheme();
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Time picker state — tracks which day + field is being edited
  const [timePickerTarget, setTimePickerTarget] = useState<{
    day: number;
    field: "startTime" | "endTime";
  } | null>(null);

  const selectedDays = formData.selectedDays;
  const isExpressEnabled = formData.isExpressEnabled;

  const toggleDay = (dayId: number) => {
    const isSelected = selectedDays.includes(dayId);
    let updatedDays: number[];
    const updatedConfigs = { ...formData.dayConfigs };

    if (isSelected) {
      updatedDays = selectedDays.filter((d) => d !== dayId);
      delete updatedConfigs[dayId];
      if (expandedDay === dayId) setExpandedDay(null);
    } else {
      updatedDays = [...selectedDays, dayId];
      updatedConfigs[dayId] = { ...DEFAULT_DAY_CONFIG };
      setExpandedDay(dayId);
    }

    setFormData({ selectedDays: updatedDays, dayConfigs: updatedConfigs });
  };

  const getDayConfig = (day: number): DayConfig => {
    return formData.dayConfigs[day] || DEFAULT_DAY_CONFIG;
  };

  const handleTimeConfirm = (time: Date) => {
    if (!timePickerTarget) return;
    const hours = String(time.getHours()).padStart(2, "0");
    const minutes = String(time.getMinutes()).padStart(2, "0");
    setDayConfig(timePickerTarget.day, {
      [timePickerTarget.field]: `${hours}:${minutes}`,
    });
    setTimePickerTarget(null);
  };

  const onSubmit = async () => {
    setValidationErrors([]);
    const validation = validateAvailabilityForm(
      selectedDays,
      formData.dayConfigs,
      isExpressEnabled,
      formData.expressFee,
    );

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      const slots = generateAvailabilityInputs(
        vendorId || user?.id || "",
        "VENDOR_DELIVERY",
        selectedDays.sort((a, b) => a - b),
        formData.dayConfigs,
        isExpressEnabled,
        formData.expressFee,
      );

      setGeneratedSlots(slots);
      router.push("/laundry-store/confirm-availability");
    } catch (error) {
      setValidationErrors(["Failed to generate availability slots"]);
    } finally {
      setIsLoading(false);
    }
  };

  const bgColor = nativeTheme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Manage Availability",
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: nativeTheme === "dark" ? "white" : "black",
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="p-4 gap-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 gap-2">
              {validationErrors.map((error, idx) => (
                <Text key={idx} className="text-red-600 text-sm font-poppins">
                  • {error}
                </Text>
              ))}
            </View>
          )}

          {/* Days of Week Section */}
          <View className="gap-3">
            <Text className="text-md font-poppins-semibold text-primary">
              Days of Operation
            </Text>
            <Text className="text-xs text-muted font-poppins">
              Select days then configure each individually
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day.id);
                return (
                  <TouchableOpacity
                    key={day.id}
                    onPress={() => toggleDay(day.id)}
                    className={`rounded-full px-6 py-2 ${
                      isSelected ? "bg-orange-500/10" : "bg-input"
                    }`}
                    style={[
                      nativeTheme === "dark" && {
                        borderColor: isSelected ? "orange" : "#444",
                      },
                    ]}
                  >
                    <Text
                      className={`font-poppins-semibold text-sm ${
                        isSelected ? "text-orange-600" : "text-primary"
                      }`}
                      style={[
                        nativeTheme === "dark" && {
                          color: isSelected ? "orange" : "white",
                        },
                      ]}
                    >
                      {day.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Per-Day Configuration Cards */}
          {selectedDays
            .slice()
            .sort((a, b) => a - b)
            .map((dayId) => {
              const config = getDayConfig(dayId);
              const isExpanded = expandedDay === dayId;

              return (
                <View
                  key={dayId}
                  className="rounded-xl overflow-hidden border border-gray-200"
                  style={[
                    nativeTheme === "dark" && {
                      borderColor: "#333",
                    },
                  ]}
                >
                  {/* Day Header (tap to expand/collapse) */}
                  <TouchableOpacity
                    onPress={() =>
                      setExpandedDay(isExpanded ? null : dayId)
                    }
                    activeOpacity={0.7}
                    className="bg-gray-50 px-4 py-3 flex-row items-center justify-between"
                    style={[
                      nativeTheme === "dark" && {
                        backgroundColor: "rgba(30, 33, 39, 0.5)",
                      },
                    ]}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center"
                        style={[
                          nativeTheme === "dark" && {
                            backgroundColor: "rgba(255, 165, 0, 0.2)",
                          },
                        ]}
                      >
                        <Text
                          className="font-poppins-semibold text-xs text-orange-600"
                          style={[
                            nativeTheme === "dark" && { color: "orange" },
                          ]}
                        >
                          {DAYS_OF_WEEK.find((d) => d.id === dayId)?.name}
                        </Text>
                      </View>
                      <View>
                        <Text className="font-poppins-semibold text-primary text-sm">
                          {getDayName(dayId)}
                        </Text>
                        <Text className="text-muted text-xs font-poppins">
                          {config.startTime} - {config.endTime} •{" "}
                          {config.slotInterval}min • {config.capacity} orders
                        </Text>
                      </View>
                    </View>
                    <MaterialIcons
                      name={isExpanded ? "expand-less" : "expand-more"}
                      size={24}
                      color={nativeTheme === "dark" ? "white" : "black"}
                    />
                  </TouchableOpacity>

                  {/* Expanded Day Config */}
                  {isExpanded && (
                    <View
                      className="p-4 gap-4 border-t border-gray-200"
                      style={[
                        nativeTheme === "dark" && {
                          borderColor: "#333",
                        },
                      ]}
                    >
                      {/* Operating Hours */}
                      <View className="gap-2">
                        <Text className="text-xs font-poppins-medium text-muted">
                          Operating Hours
                        </Text>
                        <View className="flex-row gap-3">
                          <TouchableOpacity
                            onPress={() =>
                              setTimePickerTarget({
                                day: dayId,
                                field: "startTime",
                              })
                            }
                            activeOpacity={0.7}
                            style={{ flex: 1, minWidth: 140 }}
                          >
                            <View
                              className="bg-input rounded-xl p-3 border border-transparent"
                              pointerEvents="none"
                            >
                              <Text className="text-xs text-muted font-poppins-medium mb-1">
                                Start
                              </Text>
                              <View className="flex-row items-center gap-2">
                                <Fontisto
                                  name="clock"
                                  size={14}
                                  color="orange"
                                />
                                <Text className="text-base font-poppins-semibold text-primary">
                                  {config.startTime}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setTimePickerTarget({
                                day: dayId,
                                field: "endTime",
                              })
                            }
                            activeOpacity={0.7}
                            style={{ flex: 1, minWidth: 140 }}
                          >
                            <View
                              className="bg-input rounded-xl p-3 border border-transparent"
                              pointerEvents="none"
                            >
                              <Text className="text-xs text-muted font-poppins-medium mb-1">
                                End
                              </Text>
                              <View className="flex-row items-center gap-2">
                                <Fontisto
                                  name="clock"
                                  size={14}
                                  color="orange"
                                />
                                <Text className="text-base font-poppins-semibold text-primary">
                                  {config.endTime}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Slot Configuration */}
                      <View className="gap-2">
                        <Text className="text-xs font-poppins-medium text-muted">
                          Slot Configuration
                        </Text>
                        <View className="flex-row gap-3">
                          <View className="flex-1">
                            <AppTextInput
                              label="Interval (min)"
                              placeholder="30"
                              keyboardType="number-pad"
                              onChangeText={(text) =>
                                setDayConfig(dayId, {
                                  slotInterval: Number(text) || 0,
                                })
                              }
                              value={config.slotInterval?.toString()}
                              width="100%"
                            />
                          </View>
                          <View className="flex-1">
                            <AppTextInput
                              label="Capacity"
                              placeholder="5"
                              keyboardType="number-pad"
                              onChangeText={(text) =>
                                setDayConfig(dayId, {
                                  capacity: Number(text) || 0,
                                })
                              }
                              value={config.capacity?.toString()}
                              width="100%"
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

          {/* Express Option Section */}
          <View
            className="gap-3 bg-gray-50 rounded-lg p-4"
            style={[
              nativeTheme === "dark" && {
                backgroundColor: "rgba(30, 33, 39, 0.5)",
              },
            ]}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-poppins-semibold text-primary">
                Enable Express Service
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setFormData({ isExpressEnabled: !isExpressEnabled })
                }
                className={`w-12 h-6 rounded-full ${
                  isExpressEnabled ? "bg-orange-500" : "bg-gray-300"
                } flex-row items-center px-1`}
                style={[
                  nativeTheme === "dark" && {
                    backgroundColor: isExpressEnabled ? "orange" : "#333",
                  },
                ]}
              >
                <View
                  className={`w-5 h-5 rounded-full bg-white ${
                    isExpressEnabled ? "ml-auto" : ""
                  }`}
                />
              </TouchableOpacity>
            </View>
            {isExpressEnabled && (
              <AppTextInput
                label="Express Fee"
                placeholder="0.00"
                keyboardType="decimal-pad"
                onChangeText={(text) =>
                  setFormData({ expressFee: Number(text) || 0 })
                }
                value={formData.expressFee?.toString()}
                width="100%"
              />
            )}
          </View>

          {/* Summary Preview */}
          {selectedDays.length > 0 && (
            <View
              className="bg-blue-50 rounded-lg p-4 gap-2"
              style={[
                nativeTheme === "dark" && {
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                },
              ]}
            >
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="info" size={18} color="blue" />
                <Text
                  className="text-blue-900 font-poppins-medium text-sm flex-1"
                  style={[
                    nativeTheme === "dark" && {
                      color: "rgba(147, 197, 253, 0.8)",
                    },
                  ]}
                >
                  You will create {selectedDays.length} availability slot
                  {selectedDays.length > 1 ? "s" : ""}
                </Text>
              </View>
              <Text
                className="text-blue-800 text-xs font-poppins"
                style={[
                  nativeTheme === "dark" && {
                    color: "rgba(147, 197, 253, 0.7)",
                  },
                ]}
              >
                {selectedDays
                  .slice()
                  .sort((a, b) => a - b)
                  .map((d) => getDayName(d))
                  .join(", ")}
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <AppButton
            text={isLoading ? "" : "Preview & Confirm"}
            onPress={onSubmit}
            disabled={isLoading}
            borderRadius={50}
            width="100%"
            height={50}
            icon={isLoading && <ActivityIndicator color="white" />}
          />
        </View>
      </ScrollView>

      {/* Time Picker */}
      <DateTimePicker
        isVisible={timePickerTarget !== null}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={() => setTimePickerTarget(null)}
        display="spinner"
      />
    </>
  );
};

export default VendorAvailability;
