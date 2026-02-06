import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import Fontisto from "@expo/vector-icons/Fontisto";
import { router, Stack } from "expo-router";
import { TouchableOpacity, useColorScheme, View } from "react-native";

const DeliveryLayout = () => {
  const theme = useColorScheme();
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
            <TouchableOpacity onPress={() => router.push("/messages")}>
              <EvilIcons
                name="bell"
                size={28}
                color={theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK}
              />
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
        }}
      />
    </Stack>
  );
};

export default DeliveryLayout;
