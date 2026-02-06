import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import React from "react";
import { Platform, TouchableOpacity, useColorScheme } from "react-native";

const BackButton = () => {
  const theme = useColorScheme();
  const COLOR = theme === "dark" ? "white" : "black";
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      className="absolute top-10 left-4 rounded-full w-12 h-12 items-center justify-center bg-input"
    >
      {Platform.OS === "ios" ? (
        <Feather name="chevron-left" color={COLOR} />
      ) : (
        <Feather name="arrow-left" color={COLOR} />
      )}
    </TouchableOpacity>
  );
};

export default BackButton;
