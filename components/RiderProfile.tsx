import { fetchRider } from "@/api/user";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { RiderResponse } from "@/types/user-types";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Ref } from "react";
import {
  ActivityIndicator,
  Linking,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { Easing } from "react-native-reanimated";

import HDivider from "./HDivider";
import { AppButton } from "./ui/app-button";

interface ProfileData {
  ref: Ref<BottomSheet>;
  riderData?: RiderResponse;
  riderId?: string;
  showButton: boolean;
  onPress?: () => void;
}

const RiderProfile = ({ ref, riderId, showButton = true }: ProfileData) => {
  const theme = useColorScheme();

  const HANDLE_INDICATOR_STYLE =
    theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK;
  const HANDLE_STYLE = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;
  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  const handleCallPress = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["rider-profile", riderId],
    queryFn: () => fetchRider(riderId as string),
    staleTime: 10 * 60 * 1000,
    enabled: !!riderId,
  });

  const stats = [
    {
      label: "Trips",
      value: data?.reviews?.stats?.total_reviews || 0,
      icon: "truck-delivery-outline" as const,
    },
    {
      label: "Rating",
      value: data?.reviews?.stats?.average_rating?.toFixed(1) || "0.0",
      icon: "star-outline" as const,
    },
    {
      label: "Bike",
      value: data?.bike_number?.toUpperCase() || "N/A",
      icon: "bike" as const,
    },
  ];

  return (
    <BottomSheet
      ref={ref}
      snapPoints={["60%", "100%"]}
      index={-1}
      animateOnMount={true}
      animationConfigs={{
        duration: 500,
        easing: Easing.exp,
      }}
      backgroundStyle={{
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        backgroundColor: BG_COLOR,
        shadowColor: "orange",
        shadowOffset: {
          width: 0,
          height: -4,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
      }}
      enablePanDownToClose={true}
      handleIndicatorStyle={{ backgroundColor: HANDLE_INDICATOR_STYLE }}
      style={{ flex: 1 }}
      handleStyle={{ backgroundColor: HANDLE_STYLE }}
    >
      {isLoading ? (
        <BottomSheetView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: BG_COLOR,
            }}
          >
            <ActivityIndicator size={"large"} color="orange" />
          </View>
        </BottomSheetView>
      ) : (
        <BottomSheetView style={{ flex: 1 }} className={"bg-background"}>
          {/* Profile Content */}
          <View className="px-6 pt-4 flex-1">
            <View className="flex-row items-end gap-4 mb-4">
              <View className="p-1 bg-background rounded-full">
                <Image
                  source={data?.profile_image_url}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    borderWidth: 2,
                    borderColor: "#f97316",
                  }}
                  contentFit="cover"
                />
              </View>
              <View className="pb-1 flex-1">
                <Text
                  className="text-primary font-poppins-bold text-xl"
                  numberOfLines={1}
                >
                  {data?.full_name}
                </Text>
                <View className="flex-row items-center gap-1">
                  <MaterialCommunityIcons
                    name="certificate"
                    color="#f97316"
                    size={16}
                  />
                  <Text className="text-orange-500 font-poppins-semibold text-xs">
                    Verified Rider
                  </Text>
                </View>
              </View>
            </View>

            <View className="space-y-4 gap-4">
              {/* Business Info Section */}
              <View className="bg-slate-500/10 p-4 rounded-3xl gap-2">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-orange-500/20 items-center justify-center">
                    <MaterialCommunityIcons
                      name="office-building"
                      color="#f97316"
                      size={18}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-muted font-poppins-light text-[10px] uppercase tracking-wider">
                      Business
                    </Text>
                    <Text className="text-primary font-poppins-semibold text-sm">
                      {data?.business_name}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full bg-blue-500/20 items-center justify-center">
                    <Feather name="map-pin" color="#3b82f6" size={16} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-muted font-poppins-light text-[10px] uppercase tracking-wider">
                      Address
                    </Text>
                    <Text
                      className="text-primary font-poppins text-xs"
                      numberOfLines={1}
                    >
                      {data?.business_address}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats Section */}
              <View className="flex-row justify-between bg-white/5 p-4 rounded-3xl border border-slate-500/10">
                {stats.map((stat, i) => (
                  <View key={i} className="items-center flex-1">
                    <MaterialCommunityIcons
                      name={stat.icon}
                      size={20}
                      color="#94a3b8"
                    />
                    <Text className="text-primary font-poppins-bold text-base mt-1">
                      {stat.value}
                    </Text>
                    <Text className="text-muted font-poppins-light text-[10px] uppercase">
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Action Section */}
              {!showButton && (
                <View className="mt-2">
                  <AppButton
                    text={`Call ${data?.full_name?.split(" ")[0] || "Rider"}`}
                    onPress={() => handleCallPress(data?.phone_number!)}
                    icon={<Feather name="phone-call" size={18} color="white" />}
                    borderRadius={20}
                    height={50}
                    variant="fill"
                    color="#f97316"
                  />
                </View>
              )}
            </View>
          </View>
        </BottomSheetView>
      )}
    </BottomSheet>
  );
};

export default RiderProfile;
