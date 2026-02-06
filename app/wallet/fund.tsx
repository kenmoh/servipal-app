import { AppButton } from "@/components/ui/app-button";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const FundWalletScreen = () => {
  return (
    <View className="flex-1 bg-background px-5 py-6">
      <Text className="text-primary text-xl font-poppins-semibold">
        Fund Wallet
      </Text>
      <Text className="text-secondary mt-2">
        Add funds to your ServiPal wallet.
      </Text>
      <View className="mt-6 rounded-2xl bg-profile-card p-4 gap-3">
        <Text className="text-foreground">Funding options coming soon.</Text>
        <AppButton
          text="Back to Wallet"
          variant="outline"
          color="#FF8C00"
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
};

export default FundWalletScreen;

const styles = StyleSheet.create({});
