import { blurhash } from "@/constants/state";
import { useUserStore } from "@/store/userStore";
import { RiderResponse } from "@/types/user-types";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import HDivider from "./HDivider";

const Rider = memo(
  ({ rider, onPress }: { onPress: () => void; rider: RiderResponse }) => {
    const { user } = useUserStore();

    const isDisabled =
      user?.user_metadata.user_type === "RIDER" ||
      user?.user_metadata.user_type === "DISPATCH";

    return (
      <>
        <TouchableOpacity
          disabled={isDisabled}
          activeOpacity={0.6}
          onPress={onPress}
          className="overflow-hidden  bg-input rounded-2xl h-[138px] border border-collapse-transparent border-border-subtle p-4 mb-2 shadow-sm w-[95%] self-center my-1"
        >
          <View className="flex-row gap-2">
            <View className="w-16 h-16 rounded-full overflow-hidden">
              <Image
                source={rider?.profile_image_url}
                placeholder={{ blurhash }}
                style={{ flex: 1, width: "100%" }}
                contentFit="cover"
                transition={1000}
              />
            </View>
            <View className="mt-2">
              <Text className="text-secondary font-poppins-bold text-sm">
                {rider.full_name}
              </Text>
              <Text className="text-muted font-poppins text-sm text-wrap">
                {rider.business_name}
              </Text>
            </View>
          </View>

          <View className="mt-2">
            <View className=" justify-between">
              <HDivider />

              <View className="flex-row items-center self-center gap-8 mt-2">
                <View>
                  <Text className="text-center font-poppins text-xs text-muted">
                    {rider.total_deliveries}
                  </Text>
                  <Text className="text-center font-poppins text-xs text-muted">
                    Trips
                  </Text>
                </View>
                <View>
                  <Text className="text-center font-poppins text-xs text-muted">
                    {rider.review_count}
                  </Text>
                  <Text className="text-center font-poppins text-xs text-muted">
                    Reviews
                  </Text>
                </View>
                <View>
                  <Text className="text-center font-poppins text-xs text-muted">
                    {rider.distance_km || 0} km
                  </Text>
                  <Text className="text-center font-poppins text-xs text-muted">
                    Away from you
                  </Text>
                </View>
                <View>
                  <Text className="text-center font-poppins text-xs text-muted">
                    {rider.total_distance_travelled} km
                  </Text>
                  <Text className="text-center font-poppins text-xs text-muted">
                    Total Distance
                  </Text>
                </View>
              </View>
            </View>
          </View>
          {rider.average_rating > 1 && (
            <View className="absolute w-16 h-10 bg-background justify-center right-0 top-0 rounded-2xl items-center ">
              <View className="flex-row gap-1 items-center">
                <Feather name="star" size={12} color="orange" />
                <Text className="text-center font-poppins-bold text-sm text-muted">
                  {rider.average_rating}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </>
    );
  },
);

export default Rider;

const styles = StyleSheet.create({});
