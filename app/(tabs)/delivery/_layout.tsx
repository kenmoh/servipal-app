import { getUserDisputeUnreadCount } from "@/api/dispute";
import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useUserStore } from "@/store/userStore";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import Fontisto from "@expo/vector-icons/Fontisto";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, Stack } from "expo-router";

import { Text, TouchableOpacity, View } from "react-native";

const DeliveryLayout = () => {
  const { user } = useUserStore();
  const theme = useColorScheme();
  const { data } = useQuery({
    queryKey: ["dispute-unread-count", user?.id],
    queryFn: getUserDisputeUnreadCount,
  });
  return (
    <Stack
      screenOptions={{
        headerRight: () => (
          <View className="flex-row gap-6">
            <TouchableOpacity onPress={() => router.push("/riders")}>
              <Fontisto
                name="motorcycle"
                size={24}
                color={theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/restaurant-reservation")}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/messages")}>
              <EvilIcons
                name="bell"
                size={28}
                color={theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK}
              />

              {data?.unread_count! > 0 && (
                <View className="absolute top-0 right-0 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {data?.unread_count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ),
        headerTintColor: theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK,
        headerStyle: {
          backgroundColor: theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT,
        },
      }}
    >
      <Stack.Screen
        name="(top-tabs)"
        options={{
          title: "ServiPal",
          headerShadowVisible: false,
          headerLeft: () => (
            <TouchableOpacity className="w-12 h-12 flex items-center justify-center">
              <Image
                source={require("@/assets/images/android-icon.png")}
                style={{ width: "100%", height: "100%" }}
              />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
};

export default DeliveryLayout;
