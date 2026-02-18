import { useUserStore } from "@/store/userStore";
import { RiderResponse } from "@/types/user-types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
    <Pressable
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
      className="bg-surface-profile active:opacity-60 rounded-2xl gap-1 border border-border-subtle w-[100%] self-center my-1 p-4"
    >
      <View className="flex-row justify-between items-center mb-2">
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
    </Pressable>
  );
};

export default RiderCard;

const styles = StyleSheet.create({});
