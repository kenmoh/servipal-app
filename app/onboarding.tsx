import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";

import { onboardingSlides } from "@/constants/onboarding";
import { useUserStore } from "@/store/userStore";

const Onboarding = () => {
  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { setFirstLaunchComplete } = useUserStore();

  const handleIndexChanged = (index: number) => {
    setActiveIndex(index);
  };

  const handleFirstLaunch = async () => {
    await setFirstLaunchComplete();
    router.replace("/sign-up");
  };

  return (
    <View style={{ flex: 1 }}>
      <Swiper
        showsButtons={false}
        ref={swiperRef}
        loop={false}
        dot={<View className="w-2 h-2 rounded-full bg-white/40 mx-1" />}
        activeDot={<View className="w-6 h-2 rounded-full bg-orange-500 mx-1" />}
        onIndexChanged={handleIndexChanged}
        paginationStyle={{ bottom: 100 }}
      >
        {onboardingSlides.map((slide, index) => (
          <ImageBackground
            key={slide.title}
            source={slide.image}
            style={{ flex: 1 }}
            resizeMode="cover"
          >
            <LinearGradient
              colors={[
                "rgba(0,0,0,0.5)",
                "rgba(0,0,0,0.88)",
                "rgba(0,0,0,0.95)",
              ]}
              style={StyleSheet.absoluteFillObject}
            />
            <SafeAreaView
              style={{ flex: 1 }}
              className="px-6 justify-end pb-48"
            >
              <View className="w-full">
                {activeIndex === index && (
                  <>
                    <Animated.Text
                      entering={FadeInRight.duration(600).delay(100)}
                      className="text-white font-poppins-bold text-4xl mb-4 leading-tight"
                    >
                      {slide.title}
                    </Animated.Text>
                    <Animated.Text
                      entering={FadeInRight.duration(600).delay(300)}
                      className="text-white/90 font-poppins-medium text-lg leading-6"
                    >
                      {slide.description}
                    </Animated.Text>
                  </>
                )}
              </View>
            </SafeAreaView>
          </ImageBackground>
        ))}
      </Swiper>

      {/* Skip Button */}
      <TouchableOpacity
        className="bg-black/20"
        activeOpacity={0.6}
        onPress={handleFirstLaunch}
        style={{
          width: 75,
          alignItems: "center",
          position: "absolute",
          top: 60,
          right: 25,
          zIndex: 10,
          paddingVertical: 8,
          paddingHorizontal: 15,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.2)",
        }}
      >
        <Text
          className="text-white font-poppins-medium"
          style={{ fontSize: 14 }}
        >
          Skip
        </Text>
      </TouchableOpacity>

      {activeIndex === onboardingSlides.length - 1 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleFirstLaunch}
          style={{
            position: "absolute",
            bottom: 40,
            right: 25,
            zIndex: 10,
            backgroundColor: "orange",
            paddingVertical: 12,
            paddingHorizontal: 30,
            borderRadius: 30,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 8,
          }}
        >
          <Text className="text-white font-poppins-semibold text-lg mr-2">
            Get Started
          </Text>
          <AntDesign name="arrow-right" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default Onboarding;
