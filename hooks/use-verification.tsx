import { useUserStore } from "@/store/userStore";
import { Href, router } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

export const useVerifiedNavigation = () => {
  const { profile } = useUserStore(); // or however you access profile

  const navigateTo = useCallback(
    (route: Href) => {
      if (profile?.account_status !== "ACTIVE") {
        Alert.alert(
          "Phone Number Not Verified",
          "Your phone number is not verified. Please verify your phone number.",
          [{ text: "OK", onPress: () => router.push("/profile") }],
        );
        return;
      }
      router.push(route);
    },
    [profile?.account_status, router],
  );

  return { navigateTo };
};
