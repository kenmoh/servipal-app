import {
  deleteReservationRules,
  getvendorReservationRules,
} from "@/api/reservation";
import HDivider from "@/components/HDivider";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { ReservationRulesOutput } from "@/types/reservation-types";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useRef, useState } from "react";
import { Alert, FlatList, Text, TouchableOpacity, View } from "react-native";
import RuleFormSheet from "./rule-form-sheet";
import { router, Stack } from "expo-router";

const DAY_MAP: { [key: number]: string } = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export default function ReservationRulesPage() {
  const ruleSheetRef = useRef<BottomSheetModal>(null);
  const [selectedRule, setSelectedRule] =
    useState<ReservationRulesOutput | null>(null);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["reservation-rules"],
    queryFn: getvendorReservationRules,
  });

  const { mutate: deleteRule } = useMutation({
    mutationFn: (id: string) => deleteReservationRules(id),
    onSuccess: () => {
      showSuccess("Deleted", "Rule removed successfully");
      queryClient.invalidateQueries({ queryKey: ["reservation-rules"] });
    },
    onError: (error: Error) => {
      showError("Error", error.message || "Failed to delete rule");
    },
  });

  const handleEdit = (rule: ReservationRulesOutput) => {
    setSelectedRule(rule);
    ruleSheetRef.current?.present();
  };

  const handleAdd = () => {
    setSelectedRule(null);
    ruleSheetRef.current?.present();
  };

  const confirmDelete = (id: string) => {
    Alert.alert("Delete Rule", "Are you sure you want to delete this rule?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteRule(id) },
    ]);
  };

  if (isLoading) return <LoadingIndicator />;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={handleAdd}
              className="bg-input w-12 h-12 items-center justify-center rounded-full"
            >
              <Ionicons name="add" size={24} color={"#ccc"} />
            </TouchableOpacity>
          ),
        }}
      />
      <BottomSheetModalProvider>
        <View className="flex-1 bg-background">
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListHeaderComponent={
              <View className="mb-6">
                <Text className="text-secondary font-poppins-regular text-sm">
                  Create specific logic for certain days or party sizes.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View className="bg-input rounded-2xl p-4 mb-4">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="bg-orange-500/10 rounded-full px-4 py-1">
                    <Text className="text-button-primary text-[10px] font-poppins-bold uppercase">
                      Priority {item.priority}
                    </Text>
                  </View>
                  <View className="flex-row gap-4">
                    <TouchableOpacity onPress={() => handleEdit(item)}>
                      <Ionicons name="pencil-outline" size={18} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#FF3B30"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="text-primary font-poppins-semibold text-base mb-1">
                  {item.day_of_week !== undefined && item.day_of_week !== null
                    ? `${DAY_MAP[item.day_of_week]} Reservations`
                    : "All Day Rule"}
                </Text>

                <View className="flex-row gap-4 mt-2">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="people-outline" size={14} color="gray" />
                    <Text className="text-muted text-xs">
                      {item.min_party_size ?? 1}-{item.max_party_size ?? "∞"}{" "}
                      People
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="card-outline" size={14} color="gray" />
                    <Text className="text-muted text-xs">
                      ₦{item.min_deposit_adult ?? 0} Deposit
                    </Text>
                  </View>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center pt-20">
                <View className="w-20 h-20 rounded-full bg-input items-center justify-center mb-4">
                  <Ionicons
                    name="document-text-outline"
                    size={32}
                    color="#ccc"
                  />
                </View>
                <Text className="text-muted font-poppins-medium">
                  No custom rules yet
                </Text>
              </View>
            }
          />

          <RuleFormSheet ref={ruleSheetRef} initialData={selectedRule} />
        </View>
      </BottomSheetModalProvider>
    </>
  );
}
