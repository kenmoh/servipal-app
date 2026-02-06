import { getRiderProfile } from "@/api/user";
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

const RiderProfile = ({
  ref,
  riderData,
  riderId,
  onPress,
  showButton = true,
}: ProfileData) => {
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
    queryFn: () => getRiderProfile(riderId as string),
    staleTime: 10 * 60 * 1000,
    enabled: !!riderId,
  });

  const rider = riderData || data;

  return (
    <BottomSheet
      ref={ref}
      snapPoints={["50%"]}
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
          <View className="p-4 items-center flex-1 bg-background">
            <View className="w-28 h-28 rounded-full overflow-hidden">
              <Image
                source={riderData?.profile_image_url}
                className="w-28 h-28 rounded-full"
              />
            </View>
            <Text className="text-primary font-poppins-semibold text-lg mt-1">
              {riderData?.full_name}
            </Text>
            {!showButton && (
              <View className="flex-row gap-1 items-center mt-1">
                <Feather name="phone" color="gray" size={15} />
                <Text
                  onPress={() => handleCallPress(riderData?.phone_number!)}
                  className="text-primary font-poppins text-sm"
                >
                  {riderData?.phone_number}
                </Text>
              </View>
            )}

            <View className="flex-row gap-1 items-center mt-1">
              <MaterialCommunityIcons
                name="office-building"
                color={"gray"}
                size={14}
              />
              <Text className="text-muted font-poppins text-sm text-center">
                {riderData?.business_name}
              </Text>
            </View>
            <View className="flex-row gap-1">
              <Feather name="map-pin" color={"gray"} size={14} />
              <Text className="text-muted font-poppins text-sm text-center">
                {riderData?.business_address}
              </Text>
            </View>
          </View>

          <HDivider />

          <View className="flex-row my-4 justify-between w-[80%] self-center">
            <View className="items-center">
              <Text className="text-xl font-poppins-bold text-primary">
                {riderData?.total_deliveries}
              </Text>
              <Text className="font-poppins-light text-muted text-sm">
                Trips
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-poppins-bold text-primary">
                {riderData?.average_rating}
              </Text>
              <Text className="font-poppins-light text-muted text-sm">
                Rating
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-xl font-poppins-bold text-primary">
                {riderData?.bike_number.toUpperCase()}
              </Text>
              <Text className="font-poppins-light text-muted text-sm">
                Bike Number
              </Text>
            </View>
          </View>

          {showButton && (
            <View className="bg-background mb-3">
              <AppButton
                width={"70%"}
                borderRadius={50}
                text="Book Rider"
                onPress={onPress}
              />
            </View>
          )}
        </BottomSheetView>
      )}
    </BottomSheet>
  );
};

export default RiderProfile;
