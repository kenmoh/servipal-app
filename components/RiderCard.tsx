import { useUserStore } from "@/store/userStore";
import { RiderResponse } from "@/types/user-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { deleteRider } from "@/api/user";
import { AntDesign } from "@expo/vector-icons";
import { Image } from "expo-image";
import HDivider from "./HDivider";
import { useToast } from "./ToastProvider";

const RiderCard = ({ rider }: { rider: RiderResponse }) => {
  const { user } = useUserStore();
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();

  const { mutate: deleteRiderMutation, isPending } = useMutation({
    mutationFn: () => deleteRider(rider?.id),
    onSuccess: () => {
      // Optimistically update cache
      queryClient.setQueryData(
        ["riders", user?.id],
        (oldData: RiderResponse[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter((r) => r.id !== rider.id);
        },
      );

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["riders", user?.id],
        exact: true,
      });

      showSuccess("Rider deleted", "Rider deleted successfully.");
    },
    onError: (error) => {
      showError("Error deleting rider", error.message);
    },
  });

  return (
    <View className="bg-surface-profile rounded-xl border border-border-subtle w-[95%] self-center my-2 p-4">
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center gap-3">
          <View className="w-16 h-16 rounded-full overflow-hidden bg-blue-500">
            <Image
              source={
                rider?.profile_image_url
                  ? { uri: rider.profile_image_url }
                  : require("@/assets/images/profile.jpg")
              }
              style={{ width: 64, height: 64, borderRadius: 32 }}
              contentFit="cover"
            />
          </View>
          <View>
            <Text className="text-primary font-bold text-base">
              {rider.full_name}
            </Text>
            <Text className="text-muted text-sm">{rider.phone_number}</Text>
          </View>
        </View>
        <View className="gap-4 items-center">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/dispatch/add-rider",
                params: {
                  fullName: rider.full_name,
                  phoneNumber: rider.phone_number,
                  email: rider.email,
                  isEditing: "true",
                  bikeNumber: rider.bike_number,
                  id: rider.id,
                },
              })
            }
          >
            <AntDesign name="edit" color="#9BA1A6" size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteRiderMutation()}>
            {isPending ? (
              <ActivityIndicator color="#9BA1A6" size="small" />
            ) : (
              <AntDesign name="delete" color="#9BA1A6" size={20} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <HDivider />
      <View className="flex-row justify-between w-full py-2">
        <View className="items-center">
          <Text className="text-primary font-poppins text-base">
            {rider?.total_delivery_count}
          </Text>
          <Text className="text-muted text-xs font-poppins">Delivered</Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-poppins text-base">
            {rider?.daily_delivery_count}
          </Text>
          <Text className="text-muted text-xs font-poppins">Completed</Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-poppins text-base">
            {rider?.average_rating}
          </Text>
          <Text className="text-muted text-xs font-poppins">Pending</Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-poppins text-base">
            {rider?.bike_number}
          </Text>
          <Text className="text-muted text-xs font-poppins">Bike No.</Text>
        </View>
      </View>
    </View>
  );
};

export default RiderCard;

const styles = StyleSheet.create({});
