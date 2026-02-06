import { HEADER_BG_DARK, HEADER_BG_LIGHT } from "@/constants/theme";
import { useSwiperCleanup } from "@/hooks/useSwiperCleanup";
import Feather from "@expo/vector-icons/Feather";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import React from "react";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Swiper from "react-native-swiper";

interface ProductDetailWrapperProp {
  children: React.ReactNode;
  images: string[];
}

const ProductDetailWrapper = ({
  children,
  images,
}: ProductDetailWrapperProp) => {
  const router = useRouter();
  const swiperRef = useSwiperCleanup();
  const bottomSheetRef = React.useRef(null);
  const theme = useColorScheme();
  const HANDLE_INDICATOR_STYLE =
    theme === "dark" ? HEADER_BG_LIGHT : HEADER_BG_DARK;
  const HANDLE_STYLE = theme === "dark" ? HEADER_BG_DARK : HEADER_BG_LIGHT;

  // Safety check for images
  const imageArray = Array.isArray(images) && images.length > 0 ? images : [];

  return (
    <View className="flex-1 bg-background">
      {imageArray.length > 0 ? (
        <Swiper
          ref={swiperRef}
          autoplay
          autoplayTimeout={3}
          showsPagination={false}
          loop
          showsButtons={false}
          bounces={false}
          removeClippedSubviews={false}
        >
          {imageArray.map((image) => (
            <View key={image} className="h-[45%] w-full overflow-hidden">
              <Image
                source={{ uri: image }}
                style={{ height: "100%", width: "100%" }}
                contentFit="cover"
              />
            </View>
          ))}
        </Swiper>
      ) : (
        <View className="h-[45%] w-full bg-gray-200 dark:bg-gray-800 justify-center items-center">
          {/* Placeholder when no images available */}
        </View>
      )}

      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute top-10 left-6 rounded-full p-3 bg-white/20 dark:bg-black/20"
      >
        {Platform.OS === "ios" ? (
          <Feather
            name="chevron-left"
            size={24}
            color={theme === "dark" ? "white" : "black"}
          />
        ) : (
          <Feather
            name="arrow-left"
            size={24}
            color={theme === "dark" ? "white" : "black"}
          />
        )}
      </TouchableOpacity>

      <BottomSheet
        handleIndicatorStyle={{ backgroundColor: HANDLE_INDICATOR_STYLE }}
        style={{ flex: 1 }}
        handleStyle={{ backgroundColor: HANDLE_STYLE }}
        snapPoints={["55%", "70%"]}
        index={0}
        ref={bottomSheetRef}
      >
        <BottomSheetScrollView className={"bg-background flex-1"}>
          {children}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
};

export default ProductDetailWrapper;

const styles = StyleSheet.create({});
