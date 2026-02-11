import { AppButton } from "@/components/ui/app-button";
import { AppTextInput } from "@/components/ui/app-text-input";
import { AntDesign } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import React from "react";
import { StyleSheet, useColorScheme, View } from "react-native";

const FundWalletScreen = () => {
  const theme = useColorScheme();
  return (
    <View className="flex-1 bg-background px-5 pt-11">
      <Stack.Screen
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTintColor: theme === "dark" ? "#fff" : "#aaa",
          title: "Fund Wallet",
        }}
      />

      <AppTextInput />
      <AppButton
        text="Subit"
        variant="fill"
        borderRadius={50}
        icon={<AntDesign name="credit-card" color={"#ccc"} />}
        onPress={() => router.back()}
      />
    </View>
  );
};

export default FundWalletScreen;

const styles = StyleSheet.create({});
