import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

interface ViewCartBtnProps {
  orderType: "FOOD" | "LAUNDRY";
  totalItem: number;
  onPress: () => void;
}

const CartInfoBtn = ({ orderType, totalItem, onPress }: ViewCartBtnProps) => {
  const theme = useColorScheme();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(100);

  useEffect(() => {
    if (totalItem > 0) {
      opacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.exp),
      });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 90,
      });
    } else {
      opacity.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(100, { duration: 300 });
    }
  }, [totalItem]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (totalItem === 0) return null;

  return (
    <AnimatedTouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.container,
        { top: orderType === "FOOD" ? "20%" : "20%" },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={["#FF8C00", "#FF4500"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalItem}</Text>
          </View>
        </View>
      </LinearGradient>
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 10,
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9991,
    alignSelf: "flex-end",
    borderRadius: 50,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContainer: {
    flexDirection: "column",
  },
  label: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cost: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
    color: "#FFFFFF",
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  badgeText: {
    fontFamily: "Poppins-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});

export default CartInfoBtn;
