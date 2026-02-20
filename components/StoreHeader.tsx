import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Fontisto from "@expo/vector-icons/Fontisto";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { fetchProfileWithReviews } from "@/api/user";
import BackButton from "@/components/BackButton";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useUserStore } from "@/store/userStore";
import { UserProfile } from "@/types/user-types";
import { useQuery } from "@tanstack/react-query";
import HDivider from "./HDivider";

interface StoreHeaderProps {
  storeId: string;
}

const StoreHeader = ({ storeId }: StoreHeaderProps) => {
  const { profile: currentUserProfile } = useUserStore();

  const isOwnStore = storeId === currentUserProfile?.id;

  const { data: vendorProfile, isLoading } = useQuery({
    queryKey: ["vendorProfile", storeId],
    queryFn: () => fetchProfileWithReviews(storeId!),
    enabled: !!storeId && !isOwnStore,
  });

  const displayProfile = isOwnStore
    ? currentUserProfile
    : (vendorProfile as UserProfile);

  if (isLoading && !displayProfile) return <LoadingIndicator />;

  if (!displayProfile) {
    return (
      <View className="p-10 items-center justify-center">
        <Text className="text-primary font-poppins">Store not found</Text>
      </View>
    );
  }

  return (
    <>
      <View className="bg-background">
        <View className="bg-background">
          <Image
            source={{ uri: displayProfile?.backdrop_image_url! }}
            style={{
              height: 150,
              width: "100%",
              objectFit: "cover",
            }}
          />

          <BackButton />

          <View className="bg-background p-4">
            <View className="absolute top-[-35px] left-[20px]">
              <Image
                source={{ uri: displayProfile?.profile_image_url! }}
                style={{
                  height: 65,
                  width: 65,
                  borderRadius: 10,
                  objectFit: "cover",
                }}
              />
            </View>

            <View className="mt-3">
              <View className="flex-row gap-2 items-center mt-4">
                <FontAwesome6 name="landmark" color="gray" size={12} />
                <Text className="text-primary text-sm font-poppins-semibold uppercase">
                  {displayProfile?.business_name}
                </Text>
              </View>
              <View className="flex-row items-center gap-2 mt-2">
                <Feather name="map-pin" color="gray" size={12} />
                <Text className="font-poppins text-primary text-sm flex-shrink">
                  {displayProfile?.business_address}
                </Text>
              </View>
              <View className="flex-row justify-between items-center mt-2">
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/review/user-reviews/[id]",
                      params: { id: storeId },
                    })
                  }
                  className="flex-row active:opacity-80 items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full"
                >
                  <View className="flex-row items-center gap-1.5 pr-2 border-r border-gray-300 dark:border-gray-600">
                    <Ionicons name="star" size={14} color="#FFB800" />
                    <Text className="text-primary font-poppins-bold text-sm">
                      {Number(
                        displayProfile?.reviews?.stats?.average_rating || 0,
                      ).toFixed(1)}
                    </Text>
                  </View>
                  <Text className="text-secondary font-poppins text-xs ml-2">
                    {displayProfile?.reviews?.stats?.total_reviews || 0} reviews
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={12}
                    color="gray"
                    className="ml-1"
                  />
                </Pressable>

                {displayProfile?.can_pickup_and_dropoff && (
                  <Fontisto name="motorcycle" color={"orange"} size={20} />
                )}

                <View className="flex-row gap-2 items-baseline  bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                  <AntDesign name="clock-circle" color="gray" />
                  <Text className="text-gray-500  font-poppins text-sm">
                    {displayProfile?.opening_hour || "N/A"} -{" "}
                    {displayProfile?.closing_hour || "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
      <HDivider />
    </>
  );
};

export default StoreHeader;
