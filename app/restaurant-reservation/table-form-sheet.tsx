import {
  createRestaurantTable,
  updateRestaurantTable,
} from "@/api/reservation";
import AppModal from "@/components/AppModal";
import { useToast } from "@/components/ToastProvider";
import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { RestaurantTable } from "@/types/reservation-types";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Switch, Text, View } from "react-native";

interface TableFormSheetProps {
  isVisible: boolean;
  onClose: () => void;
  table?: RestaurantTable | null;
}

export default function TableFormSheet({
  isVisible,
  onClose,
  table,
}: TableFormSheetProps) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isActive, setIsActive] = useState(true);
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (table) {
      setName(table.name || "");
      setCapacity(table.capacity.toString());
      setIsActive(table.is_active ?? true);
    } else {
      setName("");
      setCapacity("");
      setIsActive(true);
    }
  }, [table, isVisible]);

  const { mutate: performSave, isPending } = useMutation({
    mutationFn: async () => {
      const cap = parseInt(capacity);
      if (isNaN(cap)) throw new Error("Capacity must be a number");

      if (table) {
        return updateRestaurantTable(table.id, {
          name,
          capacity: cap,
          is_active: isActive,
        });
      } else {
        return createRestaurantTable(name, cap);
      }
    },
    onSuccess: () => {
      showSuccess(
        "Success",
        `Table ${table ? "updated" : "created"} successfully`,
      );
      queryClient.invalidateQueries({ queryKey: ["vendor-tables"] });
      onClose();
    },
    onError: (error: Error) => {
      showError("Error", error.message || "Failed to save table");
    },
  });

  return (
    <AppModal
      visible={isVisible}
      onClose={onClose}
      title={table ? "Edit Table" : "Add New Table"}
    >
      <View className="pb-10">
        <View className="gap-6">
          <View>
            <Text className="text-secondary font-poppins-medium text-xs mb-2 uppercase ml-1">
              Table Name / Number
            </Text>
            <AppTextInput
              placeholder="e.g. Table 1, Window Side"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View>
            <Text className="text-secondary font-poppins-medium text-xs mb-2 uppercase ml-1">
              Capacity (Seats)
            </Text>
            <AppTextInput
              placeholder="e.g. 4"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
            />
          </View>

          <View className="flex-row items-center justify-between bg-input p-4 rounded-2xl border border-border-subtle">
            <View>
              <Text className="text-primary font-poppins-semibold">
                Active & Available
              </Text>
              <Text className="text-muted text-xs font-poppins">
                If off, this table won't be bookable
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
                  : table
                    ? "Update Table"
                    : "Create Table"
              }
              onPress={() => performSave()}
              disabled={!name || !capacity || isPending}
              height={55}
              borderRadius={28}
            />
          </View>
        </View>
      </View>
    </AppModal>
  );
}
