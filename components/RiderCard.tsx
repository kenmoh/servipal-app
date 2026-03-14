import { useUserStore } from "@/store/userStore";
import { RiderResponse } from "@/types/user-types";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { deleteRider } from "@/api/user";
import { blurhash } from "@/constants/state";
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
    <View className="bg-surface-profile rounded-2xl gap-1 border border-border-subtle w-[100%] self-center my-1 p-4">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center gap-3">
          <View className="w-16 h-16 rounded-full overflow-hidden bg-blue-500">
            <Image
              source={rider?.profile_image_url}
              placeholder={{ blurhash }}
              style={{ flex: 1, width: "100%", height: "100%" }}
              contentFit="cover"
              transition={1000}
            />
          </View>
          <View>
            <Text className="text-primary font-bold text-base">
              {rider.full_name}
            </Text>
            <Text className="text-muted text-sm">{rider.phone_number}</Text>
          </View>
        </View>

        <View className="flex-row gap-2">
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
            className="p-2 bg-surface-base rounded-full border border-border-subtle"
          >
            <Feather name="edit-3" size={18} color="#aaa" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/review/user-reviews/[id]",
                params: { id: rider.id },
              })
            }
            className="p-2 bg-surface-base rounded-full border border-border-subtle"
          >
            <Feather name="eye" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
      <HDivider />
      <View className="flex-row justify-between w-full py-2">
        <View className="items-center">
          <Text className="text-primary font-poppins text-base">
            {rider?.reviews?.stats?.total_reviews}
          </Text>
          <Text className="text-muted text-xs font-poppins">Delivered</Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-poppins text-base">
            {rider?.reviews?.stats?.total_reviews}
          </Text>
          <Text className="text-muted text-xs font-poppins">Completed</Text>
        </View>
        <View className="items-center">
          <Text className="text-primary font-poppins text-base">
            {rider?.reviews?.stats?.average_rating.toFixed(1)}
          </Text>
          <Text className="text-muted text-xs font-poppins">
            Average Rating
          </Text>
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
