import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";

import { onboardingSlides } from "@/constants/onboarding";

import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useUserStore } from "@/store/userStore";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";

import { useColorScheme } from "@/hooks/use-color-scheme";
import type { ColorValue } from "react-native";

const gradients: ReadonlyArray<
  readonly [ColorValue, ColorValue, ColorValue, ColorValue, ColorValue]
> = [
  ["#18191c", "#232526", "#434343", "#5a5a5a", "#7b7b7b"],
  ["#2c3e50", "#2c3e50", "#6a89cc", "#b8c6db", "#f5f7fa"],
  ["#6a89cc", "#8B5CF6", "#a18cd1", "#fbc2eb", "#f5f7fa"],

  ["#fbc2eb", "#f7cac9", "#f5e6e8", "#e3e3e3", "#f5f7fa"],
  ["#a18cd1", "#b8c6db", "#dbe6e4", "#f5f7fa", "#e3e3e3"],
];

const Onboarding = () => {
  const theme = useColorScheme();
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { setFirstLaunchComplete } = useUserStore();

  const BG_COLOR = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  const handleIndexChanged = (index: number) => {
    setActiveIndex(index);
  };

  const handleFirstLaunch = async () => {
    await setFirstLaunchComplete();
    router.replace("/sign-up");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG_COLOR }}>
      <LinearGradient
        colors={gradients[activeIndex] || gradients[0]}
        style={{ ...StyleSheet.absoluteFillObject, zIndex: 0 }}
        start={{ x: 0.2, y: 0.8 }}
        end={{ x: 0.8, y: 0.2 }}
      />

      <TouchableOpacity
        className="bg-button-primary-transparent"
        activeOpacity={0.6}
        onPress={handleFirstLaunch}
        style={{
          width: 75,
          alignItems: "center",
          position: "absolute",
          top: 50,
          right: 25,
          zIndex: 2,
          paddingVertical: 5,
          paddingHorizontal: 15,
          borderRadius: 20,
        }}
      >
        <Text
          className="text-primary font-poppins-medium"
          style={{ fontSize: 14 }}
        >
          Skip
        </Text>
      </TouchableOpacity>

      <Swiper
        showsButtons={false}
        ref={swiperRef}
        loop={false}
        dot={<View className="w-2 h-2 rounded-full bg-gray-400 mx-1" />}
        activeDot={<View className="w-4 h-2 rounded-full bg-orange-500 mx-1" />}
        onIndexChanged={handleIndexChanged}
      >
        {onboardingSlides.map((slide, index) => (
          <View
            key={slide.title}
            className="flex-1 justify-center items-center px-4"
          >
            <View className="w-full h-72 justify-center items-center overflow-hidden rounded-2xl">
              <Image
                source={slide.image}
                className="w-full h-full"
                resizeMode="cover"
                style={{ borderRadius: 24 }}
              />
            </View>
            <Animated.View
              entering={FadeInUp.duration(600).delay(100)}
              className="w-full mt-12 px-2"
              style={{ alignItems: "center" }}
            >
              <Text className="text-primary font-poppins-semibold text-2xl text-center mb-2">
                {slide.title}
              </Text>
              <Text className="text-primary font-poppins-medium text-base text-center opacity-80">
                {slide.description}
              </Text>
            </Animated.View>
          </View>
        ))}
      </Swiper>

      {activeIndex === onboardingSlides.length - 1 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleFirstLaunch}
          style={{
            position: "absolute",
            bottom: 60,
            right: 15,
            zIndex: 2,
            backgroundColor: "orange",
            paddingVertical: 8,
            paddingHorizontal: 24,
            borderRadius: 24,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <AntDesign name="check" size={20} color="#fff" />
          {/* <Text className="text-white font-poppins-medium ml-2">Get Started</Text> */}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default Onboarding;
