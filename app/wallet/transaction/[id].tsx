import React from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "@/components/ui/app-button";
import { router } from "expo-router";

const TransactionDetailScreen = () => {
  const params = useLocalSearchParams<{ id: string; tx?: string }>();
  const tx = params.tx ? JSON.parse(params.tx) : null;

  return (
    <View className="flex-1 bg-background px-5 py-6">
      <Text className="text-primary text-xl font-poppins-semibold">
        Transaction Details
      </Text>
      <View className="mt-4 rounded-2xl bg-surface-elevated p-4 gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-secondary">Reference</Text>
          <Text className="text-foreground">{params.id}</Text>
        </View>
        {tx && (
          <>
            <View className="flex-row items-center justify-between">
              <Text className="text-secondary">Title</Text>
              <Text className="text-foreground">{tx.title}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-secondary">Type</Text>
              <Text className="text-foreground">{tx.type}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-secondary">Amount</Text>
              <Text className="text-foreground">{tx.amount}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-secondary">Date</Text>
              <Text className="text-foreground">{tx.date}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-secondary">Status</Text>
              <Text className="text-foreground">{tx.status}</Text>
            </View>
          </>
        )}
      </View>
      <View className="mt-6">
        <AppButton
          text="Back to Wallet"
          backgroundColor="bg-button-primary-transparent"
          textColor="text-brand-primary"
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
};

export default TransactionDetailScreen;

const styles = StyleSheet.create({});
